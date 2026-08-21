/**
 * 订阅消息封装（PRD §4.9 / §6 一次性订阅）。
 * 关键节点：报名成功、审核结果、抽签结果、赛程变更、比赛提醒、成绩发布。
 */
'use strict';

const TEMPLATES = {
  reviewResult: 'TEMPLATE_ID_REVIEW_RESULT',   // TODO: 替换为真实模板 ID
  drawResult: 'TEMPLATE_ID_DRAW_RESULT',
  scheduleChange: 'TEMPLATE_ID_SCHEDULE_CHANGE',
  matchReminder: 'TEMPLATE_ID_MATCH_REMINDER',
  result: 'TEMPLATE_ID_RESULT',
};

/**
 * 请求一次性订阅（在关键动作时调用）。
 * @param {string|string[]} keys TEMPLATES 中的 key
 */
function requestSubscribe(keys) {
  const tmplIds = (Array.isArray(keys) ? keys : [keys])
    .map((k) => TEMPLATES[k])
    .filter(Boolean);
  if (!tmplIds.length) return Promise.resolve();
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success: resolve,
      fail: resolve,
    });
  });
}

module.exports = { TEMPLATES, requestSubscribe };