const cloud = require('../../../services/cloud');
const { formatDateTime } = require('../../../utils/format');
Page({
  data: { eventId: '', list: [] },
  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },
  async load() {
    try {
      const res = await cloud.call('notify', 'myNotices', { eventId: this.data.eventId });
      this.setData({ list: (res.list || []).map((n) => ({ ...n, timeText: formatDateTime(n.createdAt) })) });
    } catch (e) { /* 静默 */ }
  },
});
