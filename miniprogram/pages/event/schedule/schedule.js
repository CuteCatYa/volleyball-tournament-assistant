const cloud = require('../../../services/cloud');

Page({
  data: { eventId: '', grouped: [], loading: false },
  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const res = await cloud.call('schedule', 'list', { eventId: this.data.eventId });
      const list = res.list || [];
      const byGroup = {};
      list.forEach((m) => {
        const g = m.group || 'A';
        if (!byGroup[g]) byGroup[g] = {};
        if (!byGroup[g][m.round]) byGroup[g][m.round] = [];
        byGroup[g][m.round].push({ ...m, scoreText: m.status === 'done' ? (m.sets || []).map((s) => `${s[0]}:${s[1]}`).join(' ') : '' });
      });
      const grouped = Object.keys(byGroup).map((g) => ({
        group: g,
        rounds: Object.keys(byGroup[g]).map((r) => ({ round: r, matches: byGroup[g][r] })),
      }));
      this.setData({ grouped, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },
});
