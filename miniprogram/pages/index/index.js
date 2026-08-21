const cloud = require('../../services/cloud');
const store = require('../../store/index');
const { statusName } = require('../../utils/format');
const { nextStep } = require('../../utils/flow');

Page({
  data: {
    myEvents: [],
    loading: false,
  },

  onLoad() {
    this.init();
  },

  onShow() {
    this.loadEvents();
  },

  onPullDownRefresh() {
    this.loadEvents().finally(() => wx.stopPullDownRefresh());
  },

  async init() {
    try {
      const data = await cloud.login();
      store.set({ openid: data.openid });
    } catch (e) {
      /* 云环境异常时静默 */
    }
    await this.loadEvents();
  },

  async loadEvents() {
    this.setData({ loading: true });
    try {
      const res = await cloud.call('event', 'list', {});
      const list = (res.list || []).map((e) => ({
        ...e,
        statusText: statusName(e.status),
        stepName: nextStep(e.status).name,
      }));
      this.setData({ myEvents: list, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/event/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/workbench/create/create' });
  },
});
