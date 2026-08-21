/**
 * schedule：赛程编排（确定性算法，PRD §4.5「算法为核心，AI 只解释」）。
 * 编排本体由 core/schedule 完成，硬约束 100% 满足，AI 不参与排程计算。
 */
'use strict';

const cloud = require('wx-server-sdk');
const { singleRoundRobin, singleElimination, detectConflicts, assignSchedule } = require('./core/schedule');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'generate') {
      const { teamIds = [], mode = 'round-robin', courtCount = 1, slotCount = 20, minGap = 1 } = payload;
      const n = teamIds.length;
      if (n < 2) return { code: 1, msg: '至少需要 2 支队伍' };

      let rounds;
      if (mode === 'knockout') {
        const { size, byes, round1 } = singleElimination(n);
        rounds = [round1.map(([a, b]) => [a === null ? null : teamIds[a], b === null ? null : teamIds[b]])];
      } else {
        rounds = singleRoundRobin(n).map((r) => r.map(([a, b]) => [teamIds[a], teamIds[b]]));
      }

      // 平铺成 matches 并贪心排程
      const matches = [];
      let id = 1;
      rounds.forEach((r, roundIdx) => {
        r.forEach(([a, b]) => matches.push({ id: id++, round: roundIdx + 1, teamA: a, teamB: b }));
      });
      const { schedule: sched, unplacedCount } = assignSchedule(matches, { courtCount, slotCount, minGap });
      const conflicts = detectConflicts(sched);

      return {
        code: 0,
        data: { rounds, schedule: sched, unplacedCount, conflictCount: conflicts.length, conflicts },
      };
    }

    if (action === 'check') {
      const conflicts = detectConflicts(payload.schedule || []);
      return { code: 0, data: { conflictCount: conflicts.length, conflicts } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'schedule 调用失败' };
  }
};