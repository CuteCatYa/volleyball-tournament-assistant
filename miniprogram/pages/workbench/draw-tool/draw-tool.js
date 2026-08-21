const cloud = require('../../../services/cloud');

Page({
  data: {
    eventId: '',
    teams: [],
    groupCount: 2,
    mode: 'random',
    modes: ['random', 'seeded'],
    drawResult: null, // { groups: [{name, teams:[{id,name,unit}]}], conflicts: [] }
    loading: false,
  },

  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },

  async load() {
    try {
      const [teamsRes, evRes, drawRes] = await Promise.all([
        cloud.call('register', 'listTeams', { eventId: this.data.eventId }),
        cloud.call('event', 'detail', { id: this.data.eventId }),
        cloud.call('draw', 'result', { eventId: this.data.eventId }),
      ]);
      const groups = (evRes.config && evRes.config.groups) || 2;
      this.setData({
        teams: teamsRes.list || [],
        groupCount: Number(groups) || 2,
        drawResult: (drawRes.draw && drawRes.draw.groups) ? { groups: drawRes.draw.groups, conflicts: [] } : null,
      });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onGroupCount(e) {
    this.setData({ groupCount: Number(e.detail.value) });
  },

  onMode(e) {
    const modes = this.data.modes;
    this.setData({ mode: modes[e.detail.value] });
  },

  async runDraw() {
    const { eventId, groupCount, mode, teams } = this.data;
    if (teams.length < 2) {
      wx.showToast({ title: '请先添加至少 2 支队伍', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await cloud.call('draw', 'run', { eventId, groupCount, mode });
      this.setData({ drawResult: { groups: res.groups, conflicts: res.conflicts }, loading: false });
      wx.showToast({
        title: res.conflicts.length ? '完成（有同单位冲突）' : '抽签完成',
        icon: res.conflicts.length ? 'none' : 'success',
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '抽签失败', icon: 'none' });
    }
  },

  goSchedule() {
    wx.navigateTo({ url: `/pages/workbench/schedule-editor/schedule-editor?eventId=${this.data.eventId}` });
  },
});
