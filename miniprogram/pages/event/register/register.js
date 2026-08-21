const cloud = require('../../../services/cloud');
const { statusName } = require('../../../utils/format');

Page({
  data: {
    eventId: '',
    event: null,
    teams: [],
    form: { name: '', unit: '', contact: '', captain: '', players: '' },
    submitting: false,
  },

  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },

  async load() {
    try {
      const [ev, teams] = await Promise.all([
        cloud.call('event', 'detail', { id: this.data.eventId }),
        cloud.call('register', 'listTeams', { eventId: this.data.eventId }),
      ]);
      this.setData({
        event: { ...ev, statusText: statusName(ev.status) },
        teams: teams.list || [],
      });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async addTeam() {
    const f = this.data.form;
    if (!f.name.trim()) {
      wx.showToast({ title: '请填写队伍名称', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await cloud.call('register', 'addTeam', { eventId: this.data.eventId, ...f });
      this.setData({ form: { name: '', unit: '', contact: '', captain: '', players: '' } });
      wx.showToast({ title: '已添加', icon: 'success' });
      this.load();
    } catch (e) {
      wx.showToast({ title: e.message || '添加失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  removeTeam(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除队伍',
      content: '确定删除该队伍？',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await cloud.call('register', 'removeTeam', { eventId: this.data.eventId, teamId: id });
          this.load();
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  async finishRegistration() {
    if (this.data.teams.length < 2) {
      wx.showToast({ title: '至少需要 2 支队伍', icon: 'none' });
      return;
    }
    try {
      await cloud.call('event', 'advance', { id: this.data.eventId, status: 'draw' });
      wx.showToast({ title: '报名完成，进入抽签', icon: 'success' });
      this.load();
    } catch (e) {
      wx.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  },

  goDraw() {
    wx.navigateTo({ url: `/pages/workbench/draw-tool/draw-tool?eventId=${this.data.eventId}` });
  },
});
