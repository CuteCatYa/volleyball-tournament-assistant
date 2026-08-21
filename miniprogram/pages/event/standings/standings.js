const cloud = require('../../../services/cloud');

Page({
  data: {
    eventId: '',
    groups: [], // [{group, rows:[{rank,name,played,wins,losses,points,setsWon,setsLost,ratio}] }]
    activeIdx: 0,
    loading: false,
    isEnded: false,
  },

  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const [stRes, evRes] = await Promise.all([
        cloud.call('score', 'standings', { eventId: this.data.eventId }),
        cloud.call('event', 'detail', { id: this.data.eventId }),
      ]);
      const groups = (stRes.groups || []).map((g) => ({
        ...g,
        rows: (g.rows || []).map((r, i) => ({
          ...r,
          medal: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '',
          ratioText: r.ratio == null || r.ratio === 1 ? '-' : (typeof r.ratio === 'number' ? r.ratio.toFixed(2) : r.ratio),
        })),
      }));
      this.setData({ groups, isEnded: evRes.status === 'ended', loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onTab(e) {
    this.setData({ activeIdx: Number(e.currentTarget.dataset.idx) });
  },

  async endEvent() {
    const ev = this.data;
    wx.showModal({
      title: '结束赛事',
      content: '结束后将锁定成绩，可生成秩序册/成绩册。确定结束？',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await cloud.call('event', 'advance', { id: this.data.eventId, status: 'ended' });
          wx.showToast({ title: '赛事已结束', icon: 'success' });
          this.load();
        } catch (e) {
          wx.showToast({ title: e.message || '操作失败', icon: 'none' });
        }
      },
    });
  },
});
