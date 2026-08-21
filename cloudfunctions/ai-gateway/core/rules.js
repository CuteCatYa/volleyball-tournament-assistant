/**
 * 球种规则库 —— PRD §4.0 规则引擎基础数据（确定性，零 AI）
 * 职责：分制/局制/积分/技术暂停的「唯一事实来源」，AI 生成条款中的数值必须与这里一致。
 */
'use strict';

const BALL_TYPES = {
  indoor: {
    key: 'indoor',
    name: '硬排',
    setPoints: 25,          // 前四局分值
    decidingPoints: 15,     // 决胜局分值
    winBy: 2,               // 领先判定
    defaultBestOf: 5,       // 五局三胜
    technicalTimeouts: [8, 16], // 技术暂停（我方先到 8/16 分）
  },
  air: {
    key: 'air',
    name: '气排球',
    setPoints: 21,
    decidingPoints: 15,
    winBy: 2,
    defaultBestOf: 3,       // 三局两胜
    technicalTimeouts: [],
  },
  beach: {
    key: 'beach',
    name: '沙排',
    setPoints: 21,
    decidingPoints: 15,
    winBy: 2,
    defaultBestOf: 3,
    technicalTimeouts: [],
  },
};

function getBallType(key) {
  return BALL_TYPES[key] || BALL_TYPES.indoor;
}

/** 三局两胜 → 2；五局三胜 → 3 */
function getSetsToWin(bestOf) {
  return Math.floor(bestOf / 2) + 1;
}

/**
 * 校验某一局比分是否合法。
 * @param {object} ball 规则对象
 * @param {number} setsIndex 该局在整场中的 0 基序号（用于判断是否为决胜局）
 * @param {number} bestOf 局制（3 或 5）
 * @param {[number, number]} set [A 方得分, B 方得分]
 */
function validateSet(ball, setsIndex, bestOf, set) {
  const isDeciding = setsIndex === bestOf - 1;
  const target = isDeciding ? ball.decidingPoints : ball.setPoints;
  const a = set[0];
  const b = set[1];
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < target) return { ok: false, reason: `未达 ${target} 分` };
  if (hi - lo < ball.winBy) return { ok: false, reason: `需领先 ${ball.winBy} 分` };
  const winner = a > b ? 'A' : (b > a ? 'B' : null);
  return { ok: true, winner };
}

/**
 * 局分对应的积分（PRD §4.0 可配）。
 * FIVB：3:0 / 3:1 → 胜 3 负 0；3:2 → 胜 2 负 1。
 * 气排球：2:0 → 胜 2 负 0；2:1 → 胜 2 负 1。
 */
function computeSetPoints(ballTypeKey, winnerSets, loserSets) {
  if (ballTypeKey === 'air') {
    return loserSets === 0 ? { winner: 2, loser: 0 } : { winner: 2, loser: 1 };
  }
  if (loserSets === 0) return { winner: 3, loser: 0 };
  return { winner: 2, loser: 1 };
}

/**
 * 分析一场比赛的胜负与积分。
 * @param {object} param
 * @param {'indoor'|'air'|'beach'|object} param.ballType 球种（可传 key 或完整规则对象）
 * @param {number} [param.bestOf] 局制，缺省用球种默认
 * @param {[number,number][]} param.sets 各局比分，如 [[25,10],[25,12],[25,8]]
 * @returns 胜负、局分、积分；invalid 时不提供排名所需数据
 */
function analyzeMatch({ ballType, bestOf, sets }) {
  const ball = typeof ballType === 'string' ? getBallType(ballType) : ballType;
  const key = ball.key || ball.name || 'indoor';
  const bof = bestOf || ball.defaultBestOf;
  const need = getSetsToWin(bof);
  let a = 0;
  let b = 0;
  const perSet = [];

  for (let i = 0; i < sets.length; i++) {
    const v = validateSet(ball, i, bof, sets[i]);
    perSet.push({ index: i + 1, isDeciding: i === bof - 1, score: sets[i], ...v });
    if (!v.ok) {
      return { ok: false, valid: false, reason: `第 ${i + 1} 局：${v.reason}`, perSet };
    }
    if (v.winner === 'A') a += 1;
    else b += 1;
    if (a === need || b === need) break;
  }

  const winner = a === need ? 'A' : b === need ? 'B' : null;
  if (!winner) {
    return { ok: false, valid: false, reason: '比赛未结束：胜局数不足', perSet };
  }

  const winnerSets = winner === 'A' ? a : b;
  const loserSets = winner === 'A' ? b : a;
  const pts = computeSetPoints(key, winnerSets, loserSets);
  return {
    ok: true,
    valid: true,
    bestOf: bof,
    setsToWin: need,
    winner,
    winnerSets,
    loserSets,
    setScore: winner === 'A' ? `${a}:${b}` : `${b}:${a}`,
    points: winner === 'A' ? { a: pts.winner, b: pts.loser } : { a: pts.loser, b: pts.winner },
    perSet,
  };
}

module.exports = {
  BALL_TYPES,
  getBallType,
  getSetsToWin,
  validateSet,
  computeSetPoints,
  analyzeMatch,
};