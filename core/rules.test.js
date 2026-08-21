/**
 * 确定性引擎单元测试（node --test）
 * 运行：node --test core/rules.test.js
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const rules = require('./rules');
const draw = require('./draw');
const schedule = require('./schedule');
const standings = require('./standings');

/* ---------------- 规则引擎 rules ---------------- */

test('硬排 25 分制 3:0 判定与积分', () => {
  const r = rules.analyzeMatch({ ballType: 'indoor', sets: [[25, 10], [25, 12], [25, 8]] });
  assert.equal(r.valid, true);
  assert.equal(r.winner, 'A');
  assert.equal(r.setScore, '3:0');
  assert.deepEqual(r.points, { a: 3, b: 0 });
});

test('硬排 3:2 胜 2 分负 1 分', () => {
  const r = rules.analyzeMatch({
    ballType: 'indoor',
    sets: [[23, 25], [25, 20], [25, 18], [22, 25], [15, 10]],
  });
  assert.equal(r.winner, 'A');
  assert.equal(r.setScore, '3:2');
  assert.deepEqual(r.points, { a: 2, b: 1 });
});

test('气排球 21 分制 2:1 胜 2 分负 1 分', () => {
  const r = rules.analyzeMatch({ ballType: 'air', sets: [[21, 15], [18, 21], [15, 10]] });
  assert.equal(r.winner, 'A');
  assert.equal(r.setScore, '2:1');
  assert.deepEqual(r.points, { a: 2, b: 1 });
});

test('未领先 2 分判负（硬排 25:24 不合法）', () => {
  const r = rules.analyzeMatch({ ballType: 'indoor', sets: [[25, 24], [25, 10], [25, 9]] });
  assert.equal(r.valid, false);
  assert.match(r.reason, /需领先 2 分/);
});

test('决胜局须到 15 分（气排球第 3 局）', () => {
  // 前两局 1:1，进入第 3 决胜局；[[10,5]] 未达 15 分，应判非法
  const r = rules.analyzeMatch({ ballType: 'air', sets: [[21, 10], [18, 21], [10, 5]] });
  assert.equal(r.valid, false);
  assert.match(r.reason, /第 3 局/);
});

/* ---------------- 抽签 draw ---------------- */

test('随机分组：每队只出现一次且分布均匀', () => {
  const g = draw.randomDraw([1, 2, 3, 4, 5, 6, 7, 8], 2, () => 0.5);
  const flat = g.flat();
  assert.equal(flat.length, 8);
  assert.equal(new Set(flat).size, 8);
  assert.equal(g[0].length, 4);
  assert.equal(g[1].length, 4);
});

test('种子蛇形：强弱均衡入组', () => {
  const entries = [
    { id: 'A', seed: 1 }, { id: 'B', seed: 2 }, { id: 'C', seed: 3 }, { id: 'D', seed: 4 },
    { id: 'E', seed: 5 }, { id: 'F', seed: 6 }, { id: 'G', seed: 7 }, { id: 'H', seed: 8 },
  ];
  const g = draw.seededSnakeDraw(entries, 2);
  // 蛇形：组0 = [seed1, seed4, seed5, seed8]；组1 = [seed2, seed3, seed6, seed7]
  assert.deepEqual(g[0], ['A', 'D', 'E', 'H']);
  assert.deepEqual(g[1], ['B', 'C', 'F', 'G']);
});

test('同单位约束检查：发现同组冲突', () => {
  const teams = [
    { id: 't1', unit: '北大' }, { id: 't2', unit: '北大' }, { id: 't3', unit: '清华' }, { id: 't4', unit: '清华' },
  ];
  const conflicts = draw.checkSameUnit(teams, [['t1', 't2'], ['t3', 't4']]);
  assert.equal(conflicts.length, 2);
});

/* ---------------- 编排 schedule ---------------- */

test('单循环：6 队共 15 场，每队出场 5 次，无重复对阵', () => {
  const rounds = schedule.singleRoundRobin(6);
  const flat = rounds.flat();
  assert.equal(flat.length, 15);
  const pairs = new Set();
  const played = new Map();
  flat.forEach(([a, b]) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    assert.equal(pairs.has(k), false, `对阵重复: ${k}`);
    pairs.add(k);
    played.set(a, (played.get(a) || 0) + 1);
    played.set(b, (played.get(b) || 0) + 1);
  });
  assert.deepEqual([...played.values()], [5, 5, 5, 5, 5, 5]);
});

test('单循环奇数队：含轮空，每轮场数最大', () => {
  const rounds = schedule.singleRoundRobin(5);
  assert.equal(rounds.length, 5);
  // 5 队 5 轮，每轮 2 场，共 10 场
  assert.equal(rounds.reduce((s, r) => s + r.length, 0), 10);
});

test('淘汰赛首轮：补齐到 2 的幂并轮空', () => {
  const r = schedule.singleElimination(6);
  assert.equal(r.size, 8);
  assert.equal(r.byes, 2);
});

test('冲突检测：同时段同场地/同队两场', () => {
  const conflicts = schedule.detectConflicts([
    { id: 1, teamA: 'A', teamB: 'B', court: 0, slot: 0 },
    { id: 2, teamA: 'A', teamB: 'C', court: 0, slot: 0 },
    { id: 3, teamA: 'D', teamB: 'E', court: 1, slot: 0 },
  ]);
  assert.equal(conflicts.length, 2);
});

test('贪心排程：无冲突且连场有间隔', () => {
  const matches = [];
  let id = 1;
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) matches.push({ id: id++, teamA: `t${a}`, teamB: `t${b}` });
  }
  const { schedule: sched, unplacedCount } = schedule.assignSchedule(matches, { courtCount: 1, slotCount: 20, minGap: 1 });
  assert.equal(unplacedCount, 0);
  assert.equal(schedule.detectConflicts(sched).length, 0);
});

/* ---------------- 排名 standings ---------------- */

test('积分排名：积分→胜负关系→得失局→得失分', () => {
  const teams = ['A', 'B', 'C', 'D'];
  const matches = [
    { a: 'A', b: 'B', ballType: 'air', bestOf: 3, sets: [[21, 10], [21, 11]] },
    { a: 'C', b: 'D', ballType: 'air', bestOf: 3, sets: [[18, 21], [21, 19], [15, 12]] }, // C 2:1 胜
    { a: 'A', b: 'C', ballType: 'air', bestOf: 3, sets: [[21, 9], [21, 8]] },
    { a: 'B', b: 'D', ballType: 'air', bestOf: 3, sets: [[21, 15], [15, 21], [15, 8]] },
  ];
  const { ranked } = standings.computeStandings(matches, teams, { ballType: 'air', bestOf: 3 });
  // A 两胜：2+2=4 分；B 一胜一负(2:1) 1 分；C 一胜一负(2:0? 不，C 胜 D 2:1) 2 分；D 0 分
  assert.equal(ranked[0].id, 'A');
  assert.equal(ranked[3].id, 'D');
});

test('弃权：弃权方 0 分且负场', () => {
  const teams = ['A', 'B'];
  const matches = [{ a: 'A', b: 'B', walkover: 'a' }]; // A 弃权，B 胜
  const { ranked } = standings.computeStandings(matches, teams, { ballType: 'air', bestOf: 3 });
  const bRow = ranked.find((r) => r.id === 'B');
  const aRow = ranked.find((r) => r.id === 'A');
  assert.equal(bRow.points, 2);
  assert.equal(aRow.points, 0);
  assert.equal(aRow.losses, 1);
});