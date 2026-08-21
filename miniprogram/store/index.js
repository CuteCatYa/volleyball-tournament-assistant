/**
 * 极简集中式状态库：全局身份 / 当前赛事 / 角色（PRD §7.3）。
 * 不做重依赖，用 emitter 通知订阅方刷新。
 */
'use strict';

const state = {
  openid: '',
  userInfo: null,
  currentEventId: '',
  // 我在某赛事内的角色：organizer | admin | referee | captain | player | audience
  eventRoles: {},
};

const listeners = [];

function get(key) {
  return state[key];
}

function set(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => {
    try {
      fn(state, patch);
    } catch (e) {
      /* ignore */
    }
  });
}

function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

module.exports = { state, get, set, subscribe };