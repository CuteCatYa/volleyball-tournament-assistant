const cloud = require('../../services/cloud');
const { statusName } = require('../../utils/format');

const STEPS = [
  { key: 'regulation', name: '竞赛规程', desc: '时间地点、参加办法、录取名次', path: '/pages/workbench/regulation/regulation' },
  { key: 'register', name: '报名登记', desc: '添加队伍、完成报名', path: '/pages/event/register/register' },
  { key: 'draw', name: '分组抽签', desc: '随机/分档 + 同单位检测', path: '/pages/workbench/draw-tool/draw-tool' },
  { key: 'schedule', name: '赛程编排', desc: '贝格尔循环 + 自动排程', path: '/pages/workbench/schedule-editor/schedule-editor' },
  { key: 'score', name: '比分录入', desc: '现场记分 + 积分榜', path: '/pages/workbench/dashboard/dashboard' },
  { key: 'orderbook', name: '秩序册/成绩', desc: '名单、赛程、排名一览', path: '/pages/workbench/orderbook-gen/orderbook-gen' },
];

Page({
  data: {
    steps: STEPS,
    events: [],
    activeEventId: '',
    activeEvent: null,
  },

  onShow() {
    this.loadEvents();
  },

  async loadEvents() {
    try {
      const res = await cloud.call('event', 'list', {});
      const list = (res.list || []).map((e) => ({ ...e, statusText: statusName(e.status) }));
      const activeEventId = this.data.activeEventId && list.find((e) => e._id === this.data.activeEventId)
        ? this.data.activeEventId
        : (list[0] && list[0]._id) || '';
      this.setData({ events: list, activeEventId });
      await this.loadActiveEvent();
    } catch (e) {
      /* 静默 */
    }
  },

  async loadActiveEvent() {
    const id = this.data.activeEventId;
    if (!id) {
      this.setData({ activeEvent: null });
      return;
    }
    try {
      const ev = await cloud.call('event', 'detail', { id });
      this.setData({ activeEvent: { ...ev, statusText: statusName(ev.status) } });
    } catch (e) {
      /* 静默 */
    }
  },

  onEventSelect(e) {
    this.setData({ activeEventId: e.currentTarget.dataset.id }, () => this.loadActiveEvent());
  },

  onStepTap(e) {
    const id = this.data.activeEventId;
    if (!id) {
      wx.showToast({ title: '请先选择赛事', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `${e.currentTarget.dataset.path}?eventId=${id}` });
  },

  goDetail() {
    if (!this.data.activeEventId) return;
    wx.navigateTo({ url: `/pages/event/detail/detail?id=${this.data.activeEventId}` });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/workbench/create/create' });
  },
});
