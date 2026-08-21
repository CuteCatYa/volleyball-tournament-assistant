/**
 * 云函数统一调用封装：所有后端访问经此入口，统一错误码与异常处理。
 */
'use strict';

function call(name, action, payload = {}) {
  return wx.cloud
    .callFunction({ name, data: { action, payload } })
    .then((res) => {
      if (!res || res.result == null) {
        // result 缺失 = 平台层失败（函数崩溃/部署异常等），而非业务 code
        const err = new Error((res && res.errMsg) || `云函数 ${name} 返回为空`);
        err.code = -1;
        err.raw = res;
        err.name = name;
        err.action = action;
        throw err;
      }
      const r = res.result;
      if (r.code === 0 || r.code == null) return r.data;
      const err = new Error(r.msg || `云函数 ${name}.${action} 调用失败`);
      err.code = r.code;
      err.name = name;
      err.action = action;
      throw err;
    });
}

/** 登录：换取 openid，并写/读 users */
function login() {
  return call('login', 'getOpenId');
}

/** 绑定手机号（getPhoneNumber 事件返回的 code） */
function bindPhone(code) {
  return call('login', 'bindPhone', { code });
}

module.exports = { call, login, bindPhone };