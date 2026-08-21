const cloud = require('../../../services/cloud');
const { formatDateTime } = require('../../../utils/format');

Page({
  data: {
    eventId: '',
    title: '',
    content: '',
    list: [],
    submitting: false,
  },
  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },
  async load() {
    try {
      const res = await cloud.call('notify', 'myNotices', { eventId: this.data.eventId });
      const list = (res.list || []).map((n) => ({ ...n, timeText: formatDateTime(n.createdAt) }));
      this.setData({ list });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },
  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },
  async publish() {
    const content = this.data.content.trim();
    if (!content) { wx.showToast({ title: '请输入公告内容', icon: 'none' }); return; }
    this.setData({ submitting: true });
    try {
      await cloud.call('notify', 'announce', {
        eventId: this.data.eventId,
        title: this.data.title.trim() || '公告',
        content,
      });
      wx.showToast({ title: '已发布', icon: 'success' });
      this.setData({ title: '', content: '', submitting: false });
      this.load();
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: e.message || '发布失败', icon: 'none' });
    }
  },
});
