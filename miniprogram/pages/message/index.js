const cloud = require('../../services/cloud');
const { formatDateTime } = require('../../utils/format');

Page({
  data: { notices: [], loading: false },

  onShow() {
    this.loadNotices();
  },

  async loadNotices() {
    this.setData({ loading: true });
    try {
      const res = await cloud.call('notify', 'allNotices', {});
      // 关联赛事名
      const evRes = await cloud.call('event', 'list', {});
      const evMap = {};
      (evRes.list || []).forEach((e) => { evMap[e._id] = e.name; });
      const list = (res.list || []).map((n) => ({
        ...n,
        eventName: evMap[n.eventId] || '未知赛事',
        timeText: formatDateTime(n.createdAt),
      }));
      this.setData({ notices: list, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goEvent(e) {
    wx.navigateTo({ url: `/pages/event/detail/detail?id=${e.currentTarget.dataset.eventid}` });
  },
});
