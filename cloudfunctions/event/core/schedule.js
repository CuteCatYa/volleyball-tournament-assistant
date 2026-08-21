/**
 * 赛程编排（确定性）—— 单循环 / 淘汰赛对阵 / 冲突检测 / 贪心排程
 * 编排本体为确定性算法，硬约束 100% 满足；AI 只做约束语义解析与「编排说明」，不参与排程计算。
 */
'use strict';

/**
 * 单循环编排（圆桌轮转法，贝格尔编排的等价正确实现）。
 * 奇数队自动补一个「轮空」占位，每轮该队轮空。
 * @param {number} n 队伍数
 * @returns {Array<Array<[number, number]>>} rounds[r] = [[teamA, teamB], ...]
 *   teamA 为「主队」（列于左侧），队伍编号 0..n-1。
 */
function singleRoundRobin(n) {
  const total = n % 2 === 0 ? n : n + 1;
  const bye = n; // 奇数时用于占位的轮空编号
  const isBye = (x) => (n % 2 === 1 ? x === bye : false);

  const arr = Array.from({ length: total }, (_, i) => i);
  const fixed = arr[0];
  let rest = arr.slice(1);
  const rounds = [];

  for (let r = 0; r < total - 1; r++) {
    const line = [fixed, ...rest];
    const round = [];
    for (let i = 0; i < total / 2; i++) {
      const a = line[i];
      const b = line[total - 1 - i];
      if (isBye(a) || isBye(b)) continue;
      round.push([a, b]);
    }
    rounds.push(round);
    // 轮转：尾部元素移到 rest 首位（保持 fixed 不动）
    rest = [rest[rest.length - 1], ...rest.slice(0, -1)];
  }
  return rounds;
}

/**
 * 淘汰赛首轮对阵（自动补齐到 2 的幂，缺位轮空）。
 * @param {number} n 队伍数
 * @returns {Object} { size, byes, round1: [[a, b|null], ...] }
 *   a/b 中为 null 表示该队首轮轮空直接晋级。
 */
function singleElimination(n) {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
  const byes = size - n;
  const slots = [];
  for (let i = 0; i < size; i++) slots.push(i < n ? i : null);
  const round1 = [];
  for (let i = 0; i < size / 2; i++) {
    const a = slots[i];
    const b = slots[size - 1 - i];
    if (a === null && b === null) continue;
    round1.push([a, b]);
  }
  return { size, byes, round1 };
}

/**
 * 冲突检测（PRD F5.3）。
 * @param {Array<{id, teamA, teamB, court, slot}>} schedule 已排赛程
 *   court 为场地序号，slot 为时间槽序号（同 court+slot 即同时同场冲突）。
 * @returns {Array} 冲突列表
 */
function detectConflicts(schedule) {
  const conflicts = [];
  const courtSlot = new Map();
  const teamSlot = new Map();

  for (const m of schedule) {
    const key = `${m.court}|${m.slot}`;
    if (courtSlot.has(key)) {
      conflicts.push({ type: 'court', match: m.id, with: courtSlot.get(key), court: m.court, slot: m.slot });
    } else {
      courtSlot.set(key, m.id);
    }

    for (const t of [m.teamA, m.teamB]) {
      if (teamSlot.has(t) && teamSlot.get(t) === m.slot) {
        conflicts.push({ type: 'team_same_slot', match: m.id, team: t, slot: m.slot });
      }
      teamSlot.set(t, m.slot);
    }
  }
  return conflicts;
}

/**
 * 贪心排程：每场分配到最早的（场地, 时段）组合，满足：
 *  - 同一时段同一场地不冲突；
 *  - 同一队伍同一时段不出现两场；
 *  - 每队连场间隔 ≥ minGap（即两次出场之间至少隔 minGap 个空闲时段）。
 * @param {Array<{id, teamA, teamB, priority?}>} matches 待排场次
 * @param {object} opts { courtCount, slotCount, minGap=1 }
 * @returns {Object} { schedule, unplacedCount }
 */
function assignSchedule(matches, { courtCount, slotCount, minGap = 1 } = {}) {
  const occupied = Array.from({ length: slotCount }, () => new Array(courtCount).fill(false));
  const teamLastSlot = new Map();
  const schedule = [];

  for (const m of matches) {
    let placed = false;
    outer: for (let s = 0; s < slotCount; s++) {
      for (const t of [m.teamA, m.teamB]) {
        const last = teamLastSlot.get(t);
        if (last !== undefined && s - last <= minGap) continue outer;
      }
      for (let c = 0; c < courtCount; c++) {
        if (occupied[s][c]) continue;
        occupied[s][c] = true;
        schedule.push({ ...m, court: c, slot: s });
        teamLastSlot.set(m.teamA, s);
        teamLastSlot.set(m.teamB, s);
        placed = true;
        break outer;
      }
    }
    if (!placed) schedule.push({ ...m, court: -1, slot: -1, unplaced: true });
  }

  return {
    schedule,
    unplacedCount: schedule.filter((x) => x.unplaced).length,
  };
}

module.exports = { singleRoundRobin, singleElimination, detectConflicts, assignSchedule };