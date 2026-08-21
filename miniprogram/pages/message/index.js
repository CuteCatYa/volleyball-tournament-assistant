const cloud = require('../../services/cloud');
const { formatDateTime } = require('../../utils/format');

Page({
  data: {
    notices: [],
    loading: false,
  },

  onShow() {
    this.loadNotices();
  },

  async loadNotices() {
    this.setData({ loading: true });
    try {
      const res = await cloud.call('notify', 'myNotices', {});
      const list = (res.list || []).map((n) => ({ ...n, timeText: formatDateTime(n.createTime) }));
      this.setData({ notices: list, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goChat() {
    wx.navigateTo({ url: '/pages/common/chat/chat' });
  },
});