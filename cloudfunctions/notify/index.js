/**
 * notify：公告 + 订阅消息（P0：公告闭环；订阅模板待接入）。
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
      const title = payload.title || '';
      if (!content) return { code: 1, msg: '内容为空' };
      try {
        await cloud.openapi.security.msgSecCheck({ openid: OPENID, scene: 2, version: 2, content });
      } catch (e) {
        // 87014 = 命中敏感内容，必须拦截；其他为平台侧调用失败（未开通/环境限制），放行并记录，避免阻塞正常办赛
        const ec = (e && (e.errCode)) || 0;
        if (ec === 87014) return { code: 1, msg: '内容包含敏感信息，请修改后重试' };
        await db.collection('audit_logs').add({
          data: { operator: OPENID, object: 'msgSecCheck', action: 'fail-skip', at: Date.now(), err: String(e && e.errMsg || e).slice(0, 200) },
        }).catch(() => {});
      }
      const res = await db.collection('notices').add({
        data: {
          eventId: payload.eventId,
          type: payload.type || 'announcement',
          title,
          content,
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

    if (action === 'allNotices') {
      const evs = await db.collection('events').where({ creator: OPENID }).field({ _id: true }).limit(50).get();
      const ids = evs.data.map((e) => e._id);
      if (!ids.length) return { code: 0, data: { list: [] } };
      const res = await db.collection('notices')
        .where({ eventId: db.command.in(ids) })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return { code: 0, data: { list: res.data } };
    }

    if (action === 'push') {
      return { code: 0, data: { note: '订阅消息下发待接入模板 ID（见 utils/subscribe.js）' } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'notify 调用失败' };
  }
};
