const cloud = require('../../../services/cloud');

Page({
  data: {
    eventId: '',
    tab: 'score', // score | standings
    matches: [],
    grouped: [],
    selMatch: null, // 当前录入的场次
    sets: [], // [{a, b}]
    bestOf: 3,
    saving: false,
    stadGroups: [],
  },

  onLoad(options) {
    this.setData({ eventId: options.eventId || '' });
    if (options.eventId) this.load();
  },

  async load() {
    try {
      const [ev, mRes] = await Promise.all([
        cloud.call('event', 'detail', { id: this.data.eventId }),
        cloud.call('score', 'matches', { eventId: this.data.eventId }),
      ]);
      this.setData({ bestOf: ev.bestOf || 3, matches: mRes.list || [] });
      this.groupMatches();
      await this.loadStandings();
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  groupMatches() {
    const list = this.data.matches;
    const byGroup = {};
    list.forEach((m) => {
      const g = m.group || 'A';
      if (!byGroup[g]) byGroup[g] = { group: g, pending: [], done: [] };
      const item = {
        ...m,
        scoreText: m.status === 'done' && m.sets && m.sets.length
          ? m.sets.map((s) => `${s[0]}:${s[1]}`).join(' ')
          : m.walkover ? (m.walkover === 'a' ? 'A 弃权' : 'B 弃权') : '',
      };
      if (m.status === 'done') byGroup[g].done.push(item);
      else byGroup[g].pending.push(item);
    });
    const grouped = Object.keys(byGroup).map((k) => byGroup[k]);
    this.setData({ grouped });
  },

  async loadStandings() {
    try {
      const st = await cloud.call('score', 'standings', { eventId: this.data.eventId });
      const stadGroups = (st.groups || []).map((g) => ({
        ...g,
        top: (g.rows || []).slice(0, 3).map((r) => `${r.name} ${r.points}分`).join(' / '),
      }));
      this.setData({ stadGroups });
    } catch (e) {
      /* 静默 */
    }
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab, selMatch: null });
  },

  openScore(e) {
    const id = e.currentTarget.dataset.id;
    const m = this.data.matches.find((x) => x._id === id);
    if (!m) return;
    const sets = Array.from({ length: m.bestOf || this.data.bestOf }, () => ({ a: '', b: '' }));
    this.setData({ selMatch: m, sets });
  },

  onSetInput(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const side = e.currentTarget.dataset.side;
    this.setData({ [`sets[${idx}].${side}`]: e.detail.value });
  },

  closeScore() {
    this.setData({ selMatch: null });
  },

  async saveScore() {
    const m = this.data.selMatch;
    const sets = this.data.sets
      .filter((s) => s.a !== '' || s.b !== '')
      .map((s) => [Number(s.a), Number(s.b)]);
    this.setData({ saving: true });
    try {
      await cloud.call('score', 'record', { matchId: m._id, sets });
      wx.showToast({ title: '比分已保存', icon: 'success' });
      this.setData({ selMatch: null, saving: false });
      this.load();
    } catch (e) {
      this.setData({ saving: false });
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    }
  },

  async walkover(e) {
    const m = this.data.selMatch;
    const w = e.currentTarget.dataset.w; // 'a' = A 弃权
    this.setData({ saving: true });
    try {
      await cloud.call('score', 'record', { matchId: m._id, walkover: w });
      wx.showToast({ title: '已按弃权记录', icon: 'success' });
      this.setData({ selMatch: null, saving: false });
      this.load();
    } catch (e) {
      this.setData({ saving: false });
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    }
  },

  async resetScore(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '更正比分',
      content: '清除该场已录比分，重新录入？',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await cloud.call('score', 'reset', { matchId: id });
          this.load();
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      },
    });
  },

  goStandingsPage() {
    wx.navigateTo({ url: `/pages/event/standings/standings?eventId=${this.data.eventId}` });
  },
});
