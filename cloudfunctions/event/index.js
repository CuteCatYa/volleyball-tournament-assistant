/**
 * event：赛事 CRUD + 状态机推进（P0 全流程）。
 * 状态线：draft → cfg → reg → draw → sched → ongoing → ended（只前进）。
 */
'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { getBallType } = require('./core/rules');

const VALID_STATUS = ['draft', 'cfg', 'reg', 'draw', 'sched', 'ongoing', 'ended', 'archived'];
const ORDER = ['draft', 'cfg', 'reg', 'draw', 'sched', 'ongoing', 'ended', 'archived'];

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
        config: cfg,
        regulation: payload.regulation || null,
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
      const allowed = ['name', 'ballType', 'bestOf', 'groups', 'status', 'location', 'dates', 'config', 'regulation'];
      for (const k of allowed) if (payload[k] !== undefined) patch[k] = payload[k];
      if (patch.status && !VALID_STATUS.includes(patch.status)) {
        return { code: 1, msg: `非法状态: ${payload.status}` };
      }
      const cur = await db.collection('events').doc(payload.id).get();
      if (cur.data.creator !== OPENID) return { code: 403, msg: '无权限' };
      // regulation/config/groups 可能为 null 或已存在：整体替换，避免 null 上建字段失败
      const safe = {};
      if (patch.regulation !== undefined) safe.regulation = db.command.set(patch.regulation);
      if (patch.config !== undefined) safe.config = db.command.set(patch.config);
      for (const k of allowed) if (safe[k] === undefined && patch[k] !== undefined) safe[k] = patch[k];
      await db.collection('events').doc(payload.id).update({ data: { ...safe, updatedAt: Date.now() } });
      return { code: 0, data: { updated: true } };
    }

    if (action === 'advance') {
      const target = payload.status;
      if (!VALID_STATUS.includes(target)) return { code: 1, msg: `非法状态: ${target}` };
      const cur = await db.collection('events').doc(payload.id).get();
      if (cur.data.creator !== OPENID) return { code: 403, msg: '无权限' };
      const ci = ORDER.indexOf(cur.data.status);
      const ti = ORDER.indexOf(target);
      if (ti < ci) return { code: 1, msg: '状态不可回退' };
      await db.collection('events').doc(payload.id).update({ data: { status: target, updatedAt: Date.now() } });
      return { code: 0, data: { status: target } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'event 调用失败' };
  }
};
