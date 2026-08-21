/**
 * document：秩序册数据聚合 + 生成队列（P0：页面内秩序册实时渲染；PDF 待接入）。
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
    if (action === 'orderbookData') {
      const { eventId } = payload;
      const evRes = await db.collection('events').doc(eventId).get();
      const teamsRes = await db.collection('teams').where({ eventId, status: 'approved' }).orderBy('createdAt', 'asc').limit(200).get();
      const drawRes = await db.collection('groups').where({ eventId }).orderBy('createdAt', 'desc').limit(1).get();
      const mRes = await db.collection('matches').where({ eventId }).orderBy('seq', 'asc').limit(300).get();
      const nRes = await db.collection('notices').where({ eventId }).orderBy('createdAt', 'desc').limit(20).get();
      return {
        code: 0,
        data: {
          event: evRes.data,
          teams: teamsRes.data,
          groups: (drawRes.data[0] && drawRes.data[0].groups) || [],
          matches: mRes.data,
          notices: nRes.data,
        },
      };
    }

    if (action === 'generate') {
      const doc = {
        eventId: payload.eventId,
        kind: payload.kind || 'orderbook',
        status: 'pending',
        operator: OPENID,
        createdAt: Date.now(),
      };
      const res = await db.collection('orders').add({ data: doc });
      return { code: 0, data: { id: res._id, status: 'pending', note: '页面内魔板渲染已可用；PDF 导出待接入' } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'document 调用失败' };
  }
};
