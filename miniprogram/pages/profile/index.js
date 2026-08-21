const store = require('../../store/index');
const cloud = require('../../services/cloud');

Page({
  data: {
    openid: '',
    phone: '',
    eventCount: 0,
  },

  onShow() {
    this.setData({ openid: store.get('openid') });
    this.loadEventCount();
  },

  async loadEventCount() {
    try {
      const res = await cloud.call('event', 'list', {});
      this.setData({ eventCount: (res.list || []).length });
    } catch (e) {
      /* 静默 */
    }
  },

  async getPhone(e) {
    const { code } = e.detail;
    if (!code) return;
    try {
      const data = await cloud.bindPhone(code);
      this.setData({ phone: data.phone });
      wx.showToast({ title: '手机号已绑定', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
    }
  },

  goMyEvents() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  toggleFont() {
    wx.showToast({ title: '大字号模式（P1 完善）', icon: 'none' });
  },
});