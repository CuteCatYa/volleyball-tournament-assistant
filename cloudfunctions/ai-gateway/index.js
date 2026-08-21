/**
 * ai-gateway：唯一接触大模型的云函数。
 *
 * 原则：AI 表达 / 引擎事实（PRD §5.2）。
 *   - 本函数只生成"表达"（解析草稿 / 答疑文案），一切事实计算交给 core 引擎；
 *   - 模型走云开发官方 AI 能力（@cloudbase/node-sdk），云函数内隐式鉴权、无需密钥；
 *     需先在「云开发控制台 → AI → 生文模型」开启模型开关（当前体验模型 hy3）。
 *   - 模型失败 / 未开启时自动降级本地正则解析，功能不中断（PRD §5.2）。
 */
'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const tcb = require('@cloudbase/node-sdk');

/* ---------------- 模型配置 ---------------- */

let LLM_CONFIG = { enabled: true, provider: 'cloudbase', model: 'hy3' };
try {
  // eslint-disable-next-line global-require
  LLM_CONFIG = Object.assign(LLM_CONFIG, require('./llm-config'));
} catch (e) {
  /* 未提供 llm-config.js 时用默认配置 */
}

const MODEL_ENABLED = !!LLM_CONFIG.enabled;

// 云函数内使用 @cloudbase/node-sdk：只传 env，凭云函数运行态隐式鉴权
const ENV_ID =
  LLM_CONFIG.envId ||
  (process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'cloud1-d2gmj68gz398aa12c');

const tcbApp = tcb.init({ env: ENV_ID, timeout: 60000 });

const SYSTEM_PROMPT = [
  '你是排球赛事办赛助手，基于 FIVB 规则与气排球竞赛规则回答办赛问题。',
  '回答简洁、分点，不确定的内容明确说明；涉及"同单位回避、名次录取、弃权判罚"等规则以 PRD 口径为准。',
].join('\n');

/* ---------------- 模型调用（云开发官方 AI SDK） ---------------- */

async function callModel(userContent) {
  const ai = tcbApp.ai();
  const model = ai.createModel(LLM_CONFIG.provider || 'cloudbase');
  const result = await model.generateText({
    model: LLM_CONFIG.model || 'hy3',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  });
  if (result && result.error) {
    throw new Error(
      typeof result.error === 'string' ? result.error : JSON.stringify(result.error)
    );
  }
  return (result && result.text) || '';
}

/** 从模型输出中稳妥地抽取 JSON 对象 */
function extractJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

/* ---------------- A1 降级：中文数字归一 + 正则解析 ---------------- */

const CN_DIGIT = {
  零: '0', 〇: '0', 一: '1', 二: '2', 两: '2', 三: '3', 四: '4',
  五: '5', 六: '6', 七: '7', 八: '8', 九: '9',
};

/** 支持 一~九十九 的中文数字（含 十/十一/二十/二十三 等写法） */
function cnNumToInt(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0;
  let cur = 0;
  for (const ch of s) {
    if (ch === '十') {
      total += (cur || 1) * 10;
      cur = 0;
    } else if (CN_DIGIT[ch] !== undefined) {
      cur = Number(CN_DIGIT[ch]);
    } else {
      return NaN;
    }
  }
  return total + cur;
}

/** 把文本里的中文数字段归一为阿拉伯数字（如 "两天"→"2天"、"前四名"→"前4名"） */
function normalizeNums(text) {
  return String(text || '').replace(/[零〇一二两三四五六七八九十]{1,4}/g, (m) => {
    const n = cnNumToInt(m);
    return Number.isNaN(n) ? m : String(n);
  });
}

function parseBuildEvent(rawText) {
  const raw = String(rawText || '');
  const text = normalizeNums(raw);

  const teamMatch =
    text.match(/(\d+)\s*(?:支|个)?\s*队伍?/) ||
    text.match(/队伍?\s*[:：]?\s*(\d+)/);
  const courtMatch = text.match(/(\d+)\s*(?:个|块|片)?\s*(?:场地|球场|片场)/);
  const dayMatch = text.match(/(\d+)\s*天/);
  const topMatch = text.match(/前\s*(\d+)\s*(?:名|强|八)/);
  const groupMatch =
    text.match(/分\s*(\d+)\s*(?:个)?\s*组/) ||
    text.match(/(\d+)\s*(?:个)?\s*小组/);
  const nameMatch = text.match(/[《"“]([^》"”]+)[》"”]/);

  let ballType = 'air';
  if (/室内|六人/.test(text)) ballType = 'indoor';
  else if (/沙滩/.test(text)) ballType = 'beach';
  else if (/气排球/.test(text)) ballType = 'air';

  let bestOf = null;
  // 局制关键词含中文数字（五局三胜），须在归一化前的原文上匹配
  if (/五局三胜|五局/.test(raw)) bestOf = 5;
  else if (/三局两胜|三局/.test(raw)) bestOf = 3;

  let mode = null;
  if (/淘汰|交叉/.test(text)) mode = '分组循环+交叉淘汰';
  else if (/单循环|循环/.test(text)) mode = '单循环';
  if (!mode && /小组/.test(text)) mode = '分组循环+交叉淘汰';

  const parsed = {
    name: (nameMatch && nameMatch[1]) || '',
    teams: teamMatch ? Number(teamMatch[1]) : null,
    courts: courtMatch ? Number(courtMatch[1]) : null,
    days: dayMatch ? Number(dayMatch[1]) : null,
    top: topMatch ? Number(topMatch[1]) : null,
    groups: groupMatch ? Number(groupMatch[1]) : null,
    ballType,
    bestOf,
    mode,
  };
  return finalizeParse(parsed, false, true);
}

function computeMissing(p) {
  const missing = [];
  if (!p.teams) missing.push('队伍数');
  if (!p.mode) missing.push('赛制（单循环/分组循环+交叉淘汰/淘汰）');
  if (!p.days) missing.push('比赛天数');
  if (!p.courts) missing.push('场地数');
  return missing;
}

function buildSummary(p) {
  const has = [
    p.teams ? `${p.teams} 队（${p.ballType}）` : '',
    p.mode ? `赛制 ${p.mode}` : '',
    p.days ? `${p.days} 天` : '',
    p.courts ? `${p.courts} 块场地` : '',
    p.top ? `取前 ${p.top} 名` : '',
    p.groups ? `分 ${p.groups} 组` : '',
  ].filter(Boolean);
  const miss = computeMissing(p);
  let s = has.length ? `已识别：${has.join('，')}。` : '暂未识别到明确信息。';
  if (miss.length) s += ` 还需补充：${miss.join('、')}。`;
  return s;
}

function finalizeParse(parsed, aiFlag, degraded) {
  parsed.missing = computeMissing(parsed);
  parsed.summary = buildSummary(parsed);
  parsed.aiFlag = aiFlag;
  parsed.degraded = degraded;
  return parsed;
}

/* ---------------- A9 降级：内置答疑 ---------------- */

function cannedAnswer(text) {
  const t = String(text || '');
  if (/弃权/.test(t)) {
    return {
      answer:
        '弃权处理（本助手口径）：弃权场次判对方 2:0 胜、各局 21:0（气排球）或 25:0（室内），弃权队该场积分 0 分；积分表照常参与排名计算，可在积分表内对弃权场次做标注。若整队中途退赛，已赛场次成绩是否保留由赛事规程事先约定。',
      refs: ['PRD §5.1 竞赛规则口径', 'PRD 未决事项 12'],
    };
  }
  if (/同单位|回避/.test(t)) {
    return {
      answer:
        '同单位回避规则：同一单位派出多支队伍时，蛇形分组后会自动检测"同组同单位"冲突；抽签/蛇形顺序支持把同单位队伍拆开，操作留痕可追溯。',
      refs: ['PRD §5.1', 'docs/技术方案.md §6.2 分组抽签'],
    };
  }
  if (/积分|排名|名次/.test(t)) {
    return {
      answer:
        '积分与排名口径：气排球胜场 2:0 得 2 分、2:1 得 2 分负方 1 分、0:2 得 0 分；排名依次比较积分 → 相互间胜负 → 局分比（Z 值）→ 小分比（C 值）；弃权场次计 0 分。室内六人按 FIVB 3-2-1 积分。',
      refs: ['PRD §5.1', 'core/rules.js computeSetPoints'],
    };
  }
  return {
    answer:
      '我可以帮你：解析一句话办赛需求（建赛向导）、解答积分排名/弃权判罚/同单位回避等竞赛规则问题。当前模型服务未启用，以上为内置知识回答；接入混元后将支持更完整的答疑。',
    refs: ['PRD §7.1 A9'],
  };
}

/* ---------------- 提示词 ---------------- */

function buildParsePrompt(text) {
  return [
    '你是排球赛事办赛助手。请把用户的一句话办赛需求解析为 JSON，只输出 JSON，不要任何解释文字。',
    '字段定义：name(赛事名称,可空字符串)、teams(队伍数)、ballType(indoor=室内六人/air=气排球/beach=沙滩,默认 air)、mode(单循环|分组循环+交叉淘汰|淘汰)、groups(分组数)、days(比赛天数)、courts(场地数)、top(录取名次)、bestOf(局数 3 或 5)。',
    '无法确定的字段一律置 null。',
    `用户输入：${text}`,
  ].join('\n');
}

/* ---------------- 入口 ---------------- */

exports.main = async (event = {}) => {
  const action = event.action;
  const payload = event.payload || {};

  try {
    /* A1：一句话建赛解析 */
    if (action === 'parse') {
      const text = payload.text || '';
      if (!text.trim()) {
        return { code: 1, msg: '请描述你的办赛需求' };
      }

      if (MODEL_ENABLED) {
        try {
          const out = await callModel(buildParsePrompt(text));
          const obj = extractJson(out);
          if (obj) {
            const parsed = {
              name: obj.name || '',
              teams: Number(obj.teams) || null,
              courts: Number(obj.courts) || null,
              days: Number(obj.days) || null,
              top: Number(obj.top) || null,
              groups: Number(obj.groups) || null,
              ballType: ['indoor', 'air', 'beach'].includes(obj.ballType)
                ? obj.ballType
                : 'air',
              bestOf: Number(obj.bestOf) || null,
              mode: obj.mode || null,
            };
            return { code: 0, data: finalizeParse(parsed, true, false) };
          }
          throw new Error('模型输出无法解析为 JSON');
        } catch (e) {
          // 模型失败 → 降级本地正则（PRD §5.2）
          const parsed = parseBuildEvent(text);
          parsed.modelError = e.message;
          return { code: 0, data: parsed };
        }
      }

      return { code: 0, data: parseBuildEvent(text) };
    }

    /* A9：规则问答 */
    if (action === 'answer') {
      const text = payload.text || '';
      if (MODEL_ENABLED) {
        try {
          const out = await callModel(text);
          return {
            code: 0,
            data: { answer: out, refs: [], aiFlag: true, degraded: false },
          };
        } catch (e) {
          const r = cannedAnswer(text);
          r.aiFlag = false;
          r.degraded = true;
          r.modelError = e.message;
          return { code: 0, data: r };
        }
      }
      const r = cannedAnswer(text);
      r.aiFlag = false;
      r.degraded = true;
      return { code: 0, data: r };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'ai-gateway 调用失败' };
  }
};
