/**
 * event：赛事 CRUD（P0 骨架）。
 * 权限：仅创建者可写；状态机见 PRD §8 events 集合。
 */
'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { getBallType } = require('./core/rules');

const VALID_STATUS = ['draft', 'cfg', 'reg', 'draw', 'sched', 'ongoing', 'ended', 'archived'];

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'create') {
      const ball = getBallType(payload.ballType || 'air');
      const cfg = payload.config || {};
      const doc = {
        name: payload.name || '未命名赛事',
        ballType: payload.ballType || 'air',
        bestOf: payload.bestOf || ball.defaultBestOf,
        groups: payload.groups || [],
        // AI 一句话建赛的草稿卡：teams/days/courts/top/mode 等
        config: cfg,
        status: 'draft',
        creator: OPENID,
        createdAt: Date.now(),
        teamCount: cfg.teams || 0,
      };
      const res = await db.collection('events').add({ data: doc });
      return { code: 0, data: { id: res._id, ...doc } };
    }

    if (action === 'list') {
      const res = await db.collection('events')
        .where({ creator: OPENID, status: db.command.neq('archived') })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return { code: 0, data: { list: res.data } };
    }

    if (action === 'detail') {
      const res = await db.collection('events').doc(payload.id).get();
      return { code: 0, data: res.data };
    }

    if (action === 'update') {
      const patch = {};
      const allowed = ['name', 'ballType', 'bestOf', 'groups', 'status', 'location', 'dates', 'config'];
      for (const k of allowed) if (payload[k] !== undefined) patch[k] = payload[k];
      if (patch.status && !VALID_STATUS.includes(patch.status)) {
        return { code: 1, msg: `非法状态: ${payload.status}` };
      }
      // 权限校验：仅创建者
      const cur = await db.collection('events').doc(payload.id).get();
      if (cur.data.creator !== OPENID) return { code: 403, msg: '无权限' };
      await db.collection('events').doc(payload.id).update({ data: { ...patch, updatedAt: Date.now() } });
      return { code: 0, data: { updated: true } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'event 调用失败' };
  }
};