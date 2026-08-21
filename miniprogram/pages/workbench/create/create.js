/**
 * 建赛向导：AI 一句话建赛闭环（PRD §7.1 A1）。
 * 流程：输入描述 → ai-gateway.parse → 可编辑草稿卡 → 确认创建（event.create）→ 跳转赛事主页。
 * 降级：模型未启用时 ai-gateway 返回本地正则解析（degraded=true），前端同样可编辑确认。
 */
const cloud = require('../../../services/cloud');

const CHIPS = [
  '12 支队伍的气排球比赛，两天，两个场地，取前四名',
  '16 队硬排，男子女子两个组，五局三胜，单循环',
  '8 队沙排，一天，1 个场地，三局两胜',
];

const BALL_TYPES = [
  { value: 'air', label: '气排球' },
  { value: 'indoor', label: '室内六人' },
  { value: 'beach', label: '沙滩排球' },
];
const MODES = ['单循环', '分组循环+交叉淘汰', '淘汰'];
const BESTOFS = [
  { value: 3, label: '三局两胜' },
  { value: 5, label: '五局三胜' },
];

function ballLabel(v) {
  const it = BALL_TYPES.find((b) => b.value === v);
  return it ? it.label : v;
}

function emptyDraft() {
  return {
    name: '',
    teams: '',
    ballType: 'air',
    mode: '',
    days: '',
    courts: '',
    top: '',
    groups: '',
    bestOf: 3,
  };
}

Page({
  data: {
    input: '',
    chips: CHIPS,
    result: null, // AI 解析返回：summary/missing/aiFlag/degraded
    draft: null, // 可编辑草稿卡
    loading: false,
    creating: false,
    ballTypes: BALL_TYPES,
    modes: MODES,
    bestOfs: BESTOFS,
    ballLabel: '',
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  pickChip(e) {
    this.setData({ input: e.currentTarget.dataset.text });
  },

  async onSubmit() {
    const text = this.data.input.trim();
    if (!text) {
      wx.showToast({ title: '请先输入赛事描述', icon: 'none' });
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true, result: null, draft: null });
    try {
      const res = await cloud.call('ai-gateway', 'parse', { scene: 'A1', text });
      const d = emptyDraft();
      d.name = res.name || '';
      d.teams = res.teams == null ? '' : String(res.teams);
      d.ballType = res.ballType || 'air';
      d.mode = res.mode || '';
      d.days = res.days == null ? '' : String(res.days);
      d.courts = res.courts == null ? '' : String(res.courts);
      d.top = res.top == null ? '' : String(res.top);
      d.groups = res.groups == null ? '' : String(res.groups);
      d.bestOf = res.bestOf || (d.ballType === 'air' ? 3 : 5);
      this.setData({
        result: res,
        draft: d,
        ballLabel: ballLabel(d.ballType),
        loading: false,
      });
    } catch (e) {
      this.setData({
        loading: false,
        result: { hint: 'AI 网关调用失败：' + (e.message || '') },
      });
    }
  },

  /* ---- 草稿卡编辑 ---- */

  onDraftInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`draft.${field}`]: e.detail.value });
  },

  onBallType(e) {
    const v = BALL_TYPES[Number(e.detail.value)].value;
    this.setData({
      'draft.ballType': v,
      ballLabel: ballLabel(v),
    });
  },

  onMode(e) {
    this.setData({ 'draft.mode': MODES[Number(e.detail.value)] });
  },

  onBestOf(e) {
    this.setData({ 'draft.bestOf': BESTOFS[Number(e.detail.value)].value });
  },

  /* ---- 创建 ---- */

  async confirmCreate() {
    const d = this.data.draft;
    if (!d || this.data.creating) return;
    const teams = Number(d.teams);
    if (!teams || teams < 2) {
      wx.showToast({ title: '请填写队伍数（≥2）', icon: 'none' });
      return;
    }
    this.setData({ creating: true });
    try {
      const name =
        d.name || `${ballLabel(d.ballType)}赛事（${teams} 队）`;
      const res = await cloud.call('event', 'create', {
        name,
        ballType: d.ballType,
        bestOf: d.bestOf,
        config: {
          teams,
          days: Number(d.days) || null,
          courts: Number(d.courts) || null,
          top: Number(d.top) || null,
          groups: Number(d.groups) || null,
          mode: d.mode || null,
        },
      });
      wx.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/event/detail/detail?id=${res.id}` });
      }, 800);
    } catch (e) {
      wx.showToast({ title: e.message || '创建失败', icon: 'none' });
      this.setData({ creating: false });
    }
  },

  goTemplate() {
    wx.showToast({ title: '模板创建（待实现）', icon: 'none' });
  },

  goBlank() {
    this.setData({ result: null, draft: emptyDraft(), ballLabel: '气排球' });
  },
});
