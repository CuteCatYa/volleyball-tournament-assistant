/**
 * 弱网/离线兜底：核心写操作本地暂存，恢复网络后重放（最终一致）。
 * PRD §10「弱网/离线」：报名、记分本地暂存，断网可操作、恢复自动同步。
 */
'use strict';

const KEY = 'volley_offline_queue';

function readQueue() {
  try {
    return wx.getStorageSync(KEY) || [];
  } catch (e) {
    return [];
  }
}

function writeQueue(queue) {
  try {
    wx.setStorageSync(KEY, queue);
  } catch (e) {
    /* ignore */
  }
}

/**
 * 提交一个操作：成功直接写；失败则入队，待网络恢复重放。
 * @param {string} name 云函数名
 * @param {string} action 动作
 * @param {object} payload 参数
 */
function submit(name, action, payload) {
  const { call } = require('./cloud');
  return call(name, action, payload).catch((err) => {
    const queue = readQueue();
    queue.push({ name, action, payload, ts: Date.now() });
    writeQueue(queue);
    err.queued = true;
    throw err;
  });
}

/** 网络恢复时重放队列（在 app onShow / wx.onNetworkStatusChange 调用） */
function flushQueue(call) {
  const queue = readQueue();
  if (!queue.length) return Promise.resolve(0);
  const jobs = queue.map((item) =>
    call(item.name, item.action, item.payload).then(() => item).catch(() => null)
  );
  return Promise.all(jobs).then((results) => {
    const remaining = queue.filter((_, i) => !results[i]);
    writeQueue(remaining);
    return queue.length - remaining.length;
  });
}

module.exports = { submit, flushQueue, readQueue };