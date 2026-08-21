/**
 * draw：抽签（服务端安全随机 + 全量留痕，PRD §4.4 公正性保障）。
 * 随机数在云函数内用 crypto 生成，杜绝前端可预测。
 */
'use strict';

const crypto = require('crypto');
const cloud = require('wx-server-sdk');
const { randomDraw, seededSnakeDraw, checkSameUnit } = require('./core/draw');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/** [0,1) 加密安全随机（云函数服务端随机数的关键） */
function secureRng() {
  return crypto.randomInt(0, 0x100000000) / 0x100000000;
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'run') {
      const { eventId, teams = [], groupCount = 2, mode = 'random', unitCheck = false } = payload;
      const ids = teams.map((t) => t.id);
      let groups;
      if (mode === 'seeded') {
        groups = seededSnakeDraw(teams, groupCount);
      } else {
        groups = randomDraw(ids, groupCount, secureRng);
      }
      const conflicts = unitCheck ? checkSameUnit(teams, groups) : [];

      const doc = {
        eventId,
        mode,
        groups,
        seed: crypto.randomBytes(8).toString('hex'), // 随机种子可审计
        operator: OPENID,
        createdAt: Date.now(),
        locked: true,
      };
      const res = await db.collection('groups').add({ data: doc });

      // 全量留痕
      await db.collection('audit_logs').add({
        data: { operator: OPENID, object: `event:${eventId}`, action: 'draw', at: Date.now(), after: doc.groups },
      });

      return { code: 0, data: { id: res._id, groups, conflicts } };
    }

    if (action === 'result') {
      const res = await db.collection('groups').where({ eventId: payload.eventId }).orderBy('createdAt', 'desc').limit(1).get();
      return { code: 0, data: { draw: res.data[0] || null } };
    }

    if (action === 'seedSuggest') {
      // AI 种子建议为「建议」，此处返回输入供 ai-gateway 生成解释（P0 骨架）
      return { code: 0, data: { hint: '种子分档由组织者标注或 AI 依据历史战绩建议（A5）' } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'draw 调用失败' };
  }
};