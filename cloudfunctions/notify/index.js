/**
 * notify：公告 + 订阅消息（PRD §4.9 一次性订阅）。
 * 公告写入前过内容安全（msgSecCheck）。
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
    if (action === 'announce') {
      const content = payload.content || '';
      if (!content) return { code: 1, msg: '内容为空' };
      // 内容安全（输入）
      try {
        await cloud.openapi.security.msgSecCheck({
          openid: OPENID, scene: 2, version: 2, content,
        });
      } catch (e) {
        return { code: 1, msg: '内容未通过安全检测' };
      }
      const res = await db.collection('notices').add({
        data: {
          eventId: payload.eventId,
          type: payload.type || 'announcement',
          title: payload.title || '公告',
          content,
          target: payload.target || 'all',
          publisher: OPENID,
          createdAt: Date.now(),
        },
      });
      return { code: 0, data: { id: res._id } };
    }

    if (action === 'myNotices') {
      const res = await db.collection('notices')
        .where({ eventId: payload.eventId })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return { code: 0, data: { list: res.data } };
    }

    if (action === 'push') {
      // 一次性订阅：需用户在客户端 requestSubscribeMessage 后，由本函数凭 openid+tplId 下发
      return { code: 0, data: { note: 'P0 骨架：订阅消息下发待接入模板 ID（见 utils/subscribe.js）' } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'notify 调用失败' };
  }
};