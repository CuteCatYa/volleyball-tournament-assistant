const cloud = require('../../../services/cloud');
const { ballName, statusName } = require('../../../utils/format');

Page({
  data: {
    eventId: '',
    event: null,
    form: {},
    saving: false,
  },

  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },

  async load() {
    try {
      const ev = await cloud.call('event', 'detail', { id: this.data.eventId });
      this.setData({
        event: { ...ev, ballText: ballName(ev.ballType), statusText: statusName(ev.status) },
        form: Object.assign(
          {
            organizer: '', location: '', dates: '', method: '',
            eligibility: '', awards: '', others: '',
          },
          ev.regulation || {}
        ),
      });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async save() {
    this.setData({ saving: true });
    try {
      await cloud.call('event', 'update', { id: this.data.eventId, regulation: this.data.form });
      wx.showToast({ title: '规程已保存', icon: 'success' });
      // 保存规程后状态推进到 cfg（配置中）
      const ev = this.data.event;
      if (ev && ['draft'].includes(ev.status)) {
        await cloud.call('event', 'advance', { id: this.data.eventId, status: 'cfg' });
        this.load();
      }
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  goRegister() {
    wx.navigateTo({ url: `/pages/event/register/register?eventId=${this.data.eventId}` });
  },
});
