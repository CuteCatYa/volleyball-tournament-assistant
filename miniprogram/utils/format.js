/**
 * 通用格式化工具。
 */
'use strict';

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Date/时间戳 → 'YYYY-MM-DD' */
function formatDate(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date/时间戳 → 'YYYY-MM-DD HH:mm' */
function formatDateTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 秒/时间戳 → 'HH:mm' */
function formatTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BALL_NAMES = { indoor: '硬排', air: '气排球', beach: '沙排' };
function ballName(key) {
  return BALL_NAMES[key] || key;
}

const STATUS_NAMES = {
  draft: '草稿', cfg: '配置中', reg: '报名中', draw: '抽签中',
  sched: '编排中', ongoing: '进行中', ended: '已结束', archived: '已归档',
};
function statusName(key) {
  return STATUS_NAMES[key] || key;
}

module.exports = { formatDate, formatDateTime, formatTime, ballName, statusName };