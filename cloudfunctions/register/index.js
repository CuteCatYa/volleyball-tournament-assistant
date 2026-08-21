/**
 * register：报名管理（组织者手动登记队伍，P0 真实闭环）。
 * teams：eventId 下的队伍；status=approved 进入抽签池。
 */
'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'addTeam') {
      const name = (payload.name || '').trim();
      if (!name) return { code: 1, msg: '队伍名称不能为空' };
      const doc = {
        eventId: payload.eventId,
        name,
        unit: (payload.unit || '').trim(),
        contact: (payload.contact || '').trim(),
        captain: (payload.captain || '').trim(),
        players: (payload.players || '').trim(),
        seed: payload.seed == null ? null : Number(payload.seed),
        status: 'approved', // 组织者手动添加即生效
        creator: OPENID,
        createdAt: Date.now(),
      };
      const res = await db.collection('teams').add({ data: doc });
      await db.collection('events').doc(payload.eventId).update({ data: { teamCount: db.command.inc(1) } });
      return { code: 0, data: { id: res._id, ...doc } };
    }

    if (action === 'listTeams') {
      const res = await db.collection('teams')
        .where({ eventId: payload.eventId })
        .orderBy('createdAt', 'asc')
        .limit(100)
        .get();
      return { code: 0, data: { list: res.data } };
    }

    if (action === 'updateTeam') {
      const patch = {};
      for (const k of ['name', 'unit', 'contact', 'captain', 'players', 'seed']) {
        if (payload[k] !== undefined) patch[k] = k === 'seed' ? Number(payload[k]) : payload[k];
      }
      await db.collection('teams').doc(payload.teamId).update({ data: { ...patch, updatedAt: Date.now() } });
      return { code: 0, data: { updated: true } };
    }

    if (action === 'removeTeam') {
      await db.collection('teams').doc(payload.teamId).remove();
      await db.collection('events').doc(payload.eventId).update({ data: { teamCount: db.command.inc(-1) } });
      return { code: 0, data: { removed: true } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'register 调用失败' };
  }
};
