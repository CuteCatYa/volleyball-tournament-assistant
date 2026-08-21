const cloud = require('../../services/cloud');
const store = require('../../store/index');
const { statusName } = require('../../utils/format');

Page({
  data: {
    myEvents: [],
    loading: false,
    loginResult: '',
    loginError: '',
  },

  onLoad() {
    this.init();
  },

  onPullDownRefresh() {
    this.loadEvents().finally(() => wx.stopPullDownRefresh());
  },

  async init() {
    try {
      const data = await cloud.login();
      store.set({ openid: data.openid });
      this.setData({ loginResult: 'ok', loginOpenid: data.openid, userId: data.userId });
      await this.loadEvents();
    } catch (e) {
      const msg = e && (e.message || JSON.stringify(e));
      this.setData({ loginResult: 'fail', loginError: msg, loading: false });
    }
  },

  async loadEvents() {
    this.setData({ loading: true });
    try {
      const res = await cloud.call('event', 'list', {});
      const list = (res.list || []).map((e) => ({ ...e, statusText: statusName(e.status) }));
      this.setData({ myEvents: list, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/event/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  goCreate() {
    wx.switchTab({ url: '/pages/workbench/index' });
  },

  goChat() {
    wx.navigateTo({ url: '/pages/common/chat/chat' });
  },
});