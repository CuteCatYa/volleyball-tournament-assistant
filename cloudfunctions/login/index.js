/**
 * login：登录态 (openid) + 手机号授权（getPhoneNumber → 解密）。
 */
'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;

  try {
    if (action === 'getOpenId') {
      const users = db.collection('users');
      const res = await users.where({ _openid: OPENID }).get();
      let user = res.data[0];
      if (!user) {
        const add = await users.add({ data: { _openid: OPENID, createdAt: Date.now() } });
        user = { _id: add._id, _openid: OPENID };
      }
      return { code: 0, data: { openid: OPENID, userId: user._id } };
    }

    if (action === 'bindPhone') {
      const result = await cloud.openapi.phonenumber.getPhoneNumber({ code: event.payload.code });
      const phone = result.phoneInfo && result.phoneInfo.purePhoneNumber;
      await db.collection('users').where({ _openid: OPENID }).update({
        data: { phone },
      });
      return { code: 0, data: { phone } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'login 调用失败' };
  }
};