/**
 * draw：分组抽签（服务端安全随机 + 同单位冲突检测 + 全量留痕）。
 * 队伍从库内读取（approved），杜绝前端伪造；随机数服务端 crypto 生成。
 */
'use strict';

const crypto = require('crypto');
const cloud = require('wx-server-sdk');
const { randomDraw, seededSnakeDraw, checkSameUnit } = require('./core/draw');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function secureRng() {
  return crypto.randomInt(0, 0x100000000) / 0x100000000;
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'run') {
      const { eventId } = payload;
      const mode = payload.mode === 'seeded' ? 'seeded' : 'random';

      const teamsRes = await db.collection('teams')
        .where({ eventId, status: 'approved' })
        .orderBy('createdAt', 'asc')
        .limit(100)
        .get();
      const teams = teamsRes.data.map((t) => ({
        id: t._id, name: t.name || '', unit: t.unit || '', seed: t.seed,
      }));
      if (teams.length < 2) return { code: 1, msg: '至少需要 2 支报名队伍' };

      const evRes = await db.collection('events').doc(eventId).get();
      const cfg = (evRes.data && evRes.data.config) || {};
      let groupCount = Number(payload.groupCount) || Number(cfg.groups) || (teams.length >= 8 ? 4 : 2);
      if (groupCount < 1) groupCount = 1;
      if (groupCount > teams.length) groupCount = teams.length;

      let groups;
      if (mode === 'seeded') {
        const entries = teams.map((t, i) => ({ ...t, seed: t.seed == null ? i + 1 : t.seed }));
        groups = seededSnakeDraw(entries, groupCount);
      } else {
        groups = randomDraw(teams.map((t) => t.id), groupCount, secureRng);
      }

      const conflicts = checkSameUnit(teams, groups);
      const groupObjs = groups.map((ids, gi) => {
        const name = String.fromCharCode(65 + gi);
        return {
          name,
          teamIds: ids,
          teams: ids.map((id) => {
            const t = teams.find((x) => x.id === id);
            return { id, name: t && t.name, unit: t && t.unit };
          }),
        };
      });

      const doc = {
        eventId, mode, groups: groupObjs,
        seed: crypto.randomBytes(8).toString('hex'),
        operator: OPENID, createdAt: Date.now(), locked: true,
      };
      const res = await db.collection('groups').add({ data: doc });
      await db.collection('events').doc(eventId).update({ data: { groups: groupObjs, drawAt: Date.now() } });
      await db.collection('audit_logs').add({
        data: { operator: OPENID, object: `event:${eventId}`, action: 'draw', at: Date.now(), after: groupObjs },
      });
      return { code: 0, data: { id: res._id, groups: groupObjs, conflicts } };
    }

    if (action === 'result') {
      const res = await db.collection('groups')
        .where({ eventId: payload.eventId })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      return { code: 0, data: { draw: res.data[0] || null } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'draw 调用失败' };
  }
};
