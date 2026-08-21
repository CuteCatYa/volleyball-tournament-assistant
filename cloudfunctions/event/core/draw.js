/**
 * 抽签算法（确定性）—— 随机 / 种子分档蛇形 / 同单位约束检查
 * 注意：抽签「随机数」须在云函数服务端用 crypto 生成（公正性保障），
 *       本文件的随机函数接受注入的 RNG，便于服务端注入安全随机、单测注入确定性随机。
 */
'use strict';

/**
 * 全随机分组。
 * @param {Array} teamIds 队伍 id 列表
 * @param {number} groupCount 组数
 * @param {() => number} [rng] 随机数发生器 [0,1)，默认 Math.random
 * @returns {Array<Array>} 分组结果，groups[g] = [teamId, ...]
 */
function randomDraw(teamIds, groupCount, rng = Math.random) {
  const pool = teamIds.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const groups = Array.from({ length: groupCount }, () => []);
  pool.forEach((id, idx) => groups[idx % groupCount].push(id));
  return groups;
}

/**
 * 种子分档 + 蛇形排列。
 * @param {Array<{id, seed}>} entries 参赛队伍及种子档位，seed 越小越强（1 为最强）
 * @param {number} groupCount 组数
 * @returns {Array<Array>} groups[g] = [teamId, ...]
 * 蛇形：第一轮按组序正序分配，第二轮倒序，视觉上强弱分布均衡。
 */
function seededSnakeDraw(entries, groupCount) {
  const sorted = entries.slice().sort((x, y) => x.seed - y.seed);
  if (sorted.some((e) => e.seed == null)) {
    throw new Error('seededSnakeDraw: 所有队伍须指定 seed');
  }
  const groups = Array.from({ length: groupCount }, () => []);
  sorted.forEach((e, idx) => {
    const round = Math.floor(idx / groupCount);
    const pos = idx % groupCount;
    const g = round % 2 === 0 ? pos : groupCount - 1 - pos;
    groups[g].push(e.id);
  });
  return groups;
}

/**
 * 同单位多队应分入不同组的约束检查（PRD F4.6 硬约束开关）。
 * @param {Array<{id, unit}>} teams 队伍及所属单位
 * @param {Array<Array>} groups 分组结果
 * @returns {Array} 冲突列表 [{ unit, teamId, groupA, groupB }]
 */
function checkSameUnit(teams, groups) {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const conflicts = [];
  // 约束：同单位多队应分入「不同」小组 → 冲突 = 同单位有 ≥2 队落在同一小组
  groups.forEach((group, gi) => {
    const seen = new Map(); // unit -> 同组内首个队伍 id
    group.forEach((id) => {
      const t = byId.get(id);
      if (!t || !t.unit) return;
      if (seen.has(t.unit)) {
        conflicts.push({ unit: t.unit, teamId: id, with: seen.get(t.unit), group: gi });
      } else {
        seen.set(t.unit, id);
      }
    });
  });
  return conflicts;
}

module.exports = { randomDraw, seededSnakeDraw, checkSameUnit };