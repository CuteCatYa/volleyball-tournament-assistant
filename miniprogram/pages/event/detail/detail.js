/**
 * 赛事主页（枢纽页）：赛事信息 + 全流程模块入口（PRD F12.1）。
 */
const cloud = require('../../../services/cloud');
const { ballName, statusName, formatDateTime } = require('../../../utils/format');

const MODULES = [
  { key: 'regulation', name: '竞赛规程', icon: '📋', url: '/pages/workbench/regulation/regulation' },
  { key: 'register', name: '报名管理', icon: '📝', url: '/pages/event/register/register' },
  { key: 'draw', name: '分组抽签', icon: '🎲', url: '/pages/workbench/draw-tool/draw-tool' },
  { key: 'schedule', name: '赛程编排', icon: '📅', url: '/pages/workbench/schedule-editor/schedule-editor' },
  { key: 'orderbook', name: '秩序册', icon: '📖', url: '/pages/workbench/orderbook-gen/orderbook-gen' },
  { key: 'standings', name: '成绩积分', icon: '🏆', url: '/pages/event/standings/standings' },
  { key: 'announcement', name: '公告通知', icon: '📢', url: '/pages/event/announcement/announcement' },
  { key: 'dashboard', name: '办赛看板', icon: '📊', url: '/pages/workbench/dashboard/dashboard' },
];

Page({
  data: {
    eventId: '',
    event: null,
    loading: true,
    loadError: '',
    modules: MODULES,
    configText: '',
    createdText: '',
  },

  onLoad(options) {
    const eventId = options.id || '';
    this.setData({ eventId });
    if (eventId) this.loadEvent();
    else {
      this.setData({ loading: false, loadError: '缺少赛事 id' });
    }
  },

  async loadEvent() {
    this.setData({ loading: true });
    try {
      const ev = await cloud.call('event', 'detail', { id: this.data.eventId });
      const cfg = ev.config || {};
      const configText = [
        cfg.teams ? `${cfg.teams} 支队伍` : '',
        cfg.mode ? cfg.mode : '',
        cfg.days ? `${cfg.days} 天` : '',
        cfg.courts ? `${cfg.courts} 块场地` : '',
        cfg.top ? `取前 ${cfg.top} 名` : '',
        ev.bestOf === 5 ? '五局三胜' : '三局两胜',
      ]
        .filter(Boolean)
        .join(' · ');
      this.setData({
        event: { ...ev, ballText: ballName(ev.ballType), statusText: statusName(ev.status) },
        configText,
        createdText: `创建于 ${formatDateTime(ev.createdAt)}`,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false, loadError: e.message || '加载失败' });
    }
  },

  goModule(e) {
    const { url } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `${url}?eventId=${this.data.eventId}`,
      fail: () => wx.showToast({ title: '该模块页面未就绪', icon: 'none' }),
    });
  },

  goChat() {
    wx.navigateTo({ url: `/pages/common/chat/chat?eventId=${this.data.eventId}` });
  },

  onShareAppMessage() {
    const ev = this.data.event;
    return {
      title: ev ? `${ev.name} · 排球办赛助手` : '排球办赛助手',
      path: `/pages/event/detail/detail?id=${this.data.eventId}`,
    };
  },
});
