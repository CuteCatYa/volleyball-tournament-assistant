const cloud = require('../../../services/cloud');
const { ballName, statusName, formatDateTime } = require('../../../utils/format');

Page({
  data: { eventId: '', data: null, loading: false },
  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const res = await cloud.call('document', 'orderbookData', { eventId: this.data.eventId });
      const d = res;
      const groups = (d.groups || []).map((g) => ({
        ...g,
        teamsText: (g.teams || []).map((t) => t.name).join('、'),
      }));
      const matches = (d.matches || []).map((m) => ({
        ...m,
        scoreText: m.status === 'done' && m.sets && m.sets.length ? m.sets.map((s) => `${s[0]}:${s[1]}`).join(' ') : '',
      }));
      this.setData({
        loading: false,
        data: {
          ...d,
          event: d.event ? { ...d.event, ballText: ballName(d.event.ballType), statusText: statusName(d.event.status), createdAtText: formatDateTime(d.event.createdAt) } : null,
          groups,
          matches,
        },
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },
});
