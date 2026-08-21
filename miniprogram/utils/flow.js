/**
 * 全流程状态机辅助：当前状态 → 下一步动作（办赛引导）。
 */
'use strict';

const NEXT_STEP = {
  draft: { name: '填写竞赛规程', path: '/pages/workbench/regulation/regulation' },
  cfg: { name: '添加报名队伍', path: '/pages/event/register/register' },
  reg: { name: '分组抽签', path: '/pages/workbench/draw-tool/draw-tool' },
  draw: { name: '生成赛程', path: '/pages/workbench/schedule-editor/schedule-editor' },
  sched: { name: '录入比分', path: '/pages/workbench/dashboard/dashboard' },
  ongoing: { name: '录入比分/查看积分', path: '/pages/workbench/dashboard/dashboard' },
  ended: { name: '查看成绩与秩序册', path: '/pages/event/standings/standings' },
};

function nextStep(status) {
  return NEXT_STEP[status] || NEXT_STEP.draft;
}

module.exports = { nextStep, NEXT_STEP };
