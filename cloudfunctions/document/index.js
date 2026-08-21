/**
 * document：秩序册/成绩册生成（PRD §4.6/§4.8）。
 * P0 骨架：异步队列化生成入口 + 状态查询。数据区（名单/赛程/积分）由模板渲染，零错误；
 * 封面/寄语走 ai-gateway（A3，AI 表达）。
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
    if (action === 'generate') {
      const doc = {
        eventId: payload.eventId,
        kind: payload.kind || 'orderbook', // orderbook | result
        status: 'pending',
        operator: OPENID,
        createdAt: Date.now(),
      };
      const res = await db.collection('orders').add({ data: doc });
      // 真实实现：入队 → 云函数渲染模板 → 云存储 PDF → 更新 orders.status=ready + fileID
      return { code: 0, data: { id: res._id, status: 'pending', note: 'P0 骨架：已入队，PDF 渲染待接入' } };
    }

    if (action === 'status') {
      const res = await db.collection('orders').doc(payload.id).get();
      return { code: 0, data: res.data };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'document 调用失败' };
  }
};