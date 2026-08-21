const cloud = require('../../../services/cloud');

Page({
  data: {
    eventId: '',
    matches: [],
    grouped: [], // [{group, rounds: [{round, matches: []}] }]
    summary: '',
    loading: false,
  },

  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },

  async load() {
    try {
      const res = await cloud.call('schedule', 'list', { eventId: this.data.eventId });
      this.setData({ matches: res.list || [] });
      this.group();
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  group() {
    const list = this.data.matches;
    const byGroup = {};
    list.forEach((m) => {
      const g = m.group || 'A';
      if (!byGroup[g]) byGroup[g] = {};
      if (!byGroup[g][m.round]) byGroup[g][m.round] = [];
      byGroup[g][m.round].push({
        ...m,
        scoreText: m.status === 'done'
          ? (m.sets || []).map((s) => `${s[0]}:${s[1]}`).join(' ')
          : '',
      });
    });
    const grouped = Object.keys(byGroup).map((g) => ({
      group: g,
      rounds: Object.keys(byGroup[g]).map((r) => ({ round: r, matches: byGroup[g][r] })),
    }));
    this.setData({ grouped });
  },

  async generate() {
    // 已有已录比分时确认后再重排（会清空旧赛程）
    const done = this.data.matches.filter((m) => m.status === 'done').length;
    const run = async () => {
      this.setData({ loading: true });
      try {
        const res = await cloud.call('schedule', 'generate', { eventId: this.data.eventId });
        const conflictNote = res.conflictCount ? `，冲突 ${res.conflictCount} 处` : '，无冲突';
        this.setData({
          summary: `已生成 ${res.matchCount} 场（${res.courtCount} 场地）${conflictNote}`,
          loading: false,
        });
        await this.load();
      } catch (e) {
        this.setData({ loading: false });
        wx.showToast({ title: e.message || '生成失败', icon: 'none' });
      }
    };
    if (done > 0) {
      wx.showModal({
        title: '重新编排',
        content: `已有 ${done} 场已录入比分，重新生成会清空。确定继续？`,
        success: (r) => { if (r.confirm) run(); },
      });
    } else {
      run();
    }
  },

  goScore() {
    wx.navigateTo({ url: `/pages/workbench/dashboard/dashboard?eventId=${this.data.eventId}` });
  },
});
