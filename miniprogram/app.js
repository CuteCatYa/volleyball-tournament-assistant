const env = require('./config/env');

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库过低，无法使用云能力，请升级微信基础库至 2.2.3 以上');
    } else {
      wx.cloud.init({
        env: env.cloudEnvId,
        traceUser: true,
      });
    }
    this.globalData = {
      openid: '',
      userInfo: null,
      // 全局身份（组织者/队长/队员/观众由「我创建/加入的赛事」动态推导，见 store）
      currentEventId: '',
    };
  },

  globalData: {},
});