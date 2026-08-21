const cloud = require('../../services/cloud');
const { statusName } = require('../../utils/format');

// 办赛流水线步骤（PRD F1.4 / §3.1 主流程）
const STEPS = [
  { key: 'create', name: '创建赛事', desc: '一句话建赛 / 模板 / 空白', path: '/pages/workbench/create/create' },
  { key: 'regulation', name: '竞赛规程', desc: 'AI 生成 + 规则引擎校准', path: '/pages/workbench/regulation/regulation' },
  { key: 'register', name: '报名', desc: '两段式报名 + 审核', path: '/pages/workbench/review/review' },
  { key: 'draw', name: '抽签', desc: '随机 / 分档 + 仪式页', path: '/pages/workbench/draw-tool/draw-tool' },
  { key: 'schedule', name: '编排', desc: '贝格尔 / 淘汰 + 冲突检测', path: '/pages/workbench/schedule-editor/schedule-editor' },
  { key: 'orderbook', name: '秩序册', desc: '一键 PDF + 翻页', path: '/pages/workbench/orderbook-gen/orderbook-gen' },
  { key: 'score', name: '比分录入', desc: '赛后比分 + 积分榜', path: '/pages/workbench/dashboard/dashboard' },
  { key: 'result', name: '成绩', desc: '排名 + 成绩册', path: '/pages/workbench/dashboard/dashboard' },
];

Page({
  data: {
    steps: STEPS,
    events: [],
    activeEventId: '',
  },

  onShow() {
    this.loadEvents();
  },

  async loadEvents() {
    try {
      const res = await cloud.call('event', 'list', {});
      const list = (res.list || []).map((e) => ({ ...e, statusText: statusName(e.status) }));
      this.setData({ events: list });
    } catch (e) {
      /* 云环境未配置时静默 */
    }
  },

  onStepTap(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.path });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/workbench/create/create' });
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/event/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  goDashboard() {
    wx.navigateTo({ url: '/pages/workbench/dashboard/dashboard' });
  },
});