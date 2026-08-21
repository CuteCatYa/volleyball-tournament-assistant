/**
 * 积分排名（确定性）—— 排名顺序：积分 → 胜负关系(两两平局) → 得失局比值 → 得失分比值
 * 弃权按「弃权方负、积 0 分、得 0 局」处理（PRD §4.0 / §4.8 F8.1）。
 */
'use strict';

const { analyzeMatch, getBallType, getSetsToWin, computeSetPoints } = require('./rules');

function ratio(won, lost) {
  if (lost === 0) return won === 0 ? 1 : 999;
  return won / lost;
}

/**
 * @param {Array} matches 场次：[ { a, b, ballType?, bestOf?, sets?, walkover? } ]
 *   sets: [[a,b],...]；不传则视为不计入（跳过）。
 *   walkover: 'a' 表示 A 弃权（B 胜），'b' 表示 B 弃权（A 胜）。
 * @param {Array} teamIds 参赛队伍 id 列表
 * @param {object} opts { ballType='indoor', bestOf }
 * @returns {{ rows: Array, ranked: Array }}
 */
function computeStandings(matches, teamIds, { ballType = 'indoor', bestOf } = {}) {
  const ball = getBallType(ballType);
  const bof = bestOf || ball.defaultBestOf;
  const setsToWin = getSetsToWin(bof);

  const rows = new Map();
  for (const id of teamIds) {
    rows.set(id, {
      id, played: 0, wins: 0, losses: 0, points: 0,
      setsWon: 0, setsLost: 0, ptsWon: 0, ptsLost: 0,
    });
  }

  const headToHead = new Map(); // 'a|b'（a<b） -> 胜方 id
  const pairKey = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);

  for (const m of matches) {
    const ra = rows.get(m.a);
    const rb = rows.get(m.b);
    if (!ra || !rb) continue;

    if (m.walkover) {
      const winner = m.walkover === 'a' ? rb : ra;
      const loser = m.walkover === 'a' ? ra : rb;
      winner.played += 1; winner.wins += 1;
      loser.played += 1; loser.losses += 1;
      winner.setsWon += setsToWin;
      loser.setsLost += setsToWin;
      const pts = computeSetPoints(ball.key, setsToWin, 0);
      winner.points += pts.winner;
      loser.points += pts.loser;
      headToHead.set(pairKey(m.a, m.b), winner.id);
      continue;
    }

    if (!m.sets || !m.sets.length) continue;
    const res = analyzeMatch({ ballType: m.ballType || ball.key, bestOf: m.bestOf || bof, sets: m.sets });
    if (!res.valid) continue;

    ra.played += 1;
    rb.played += 1;
    if (res.winner === 'A') { ra.wins += 1; rb.losses += 1; }
    else { rb.wins += 1; ra.losses += 1; }
    ra.points += res.points.a;
    rb.points += res.points.b;

    let aSets = 0, bSets = 0, aPts = 0, bPts = 0;
    for (const s of m.sets) {
      aPts += s[0]; bPts += s[1];
      if (s[0] > s[1]) aSets += 1; else bSets += 1;
    }
    ra.setsWon += aSets; ra.setsLost += bSets;
    rb.setsWon += bSets; rb.setsLost += aSets;
    ra.ptsWon += aPts; ra.ptsLost += bPts;
    rb.ptsWon += bPts; rb.ptsLost += aPts;
    headToHead.set(pairKey(m.a, m.b), res.winner === 'A' ? m.a : m.b);
  }

  const arr = Array.from(rows.values());

  // 1) 先按积分降序
  arr.sort((x, y) => y.points - x.points);

  // 2) 按积分并组，处理平局
  const ranked = [];
  let i = 0;
  while (i < arr.length) {
    let j = i;
    while (j < arr.length && arr[j].points === arr[i].points) j += 1;
    const group = arr.slice(i, j);

    if (group.length === 2) {
      // 两两平局：直接比较胜负关系
      const key = pairKey(group[0].id, group[1].id);
      const winnerId = headToHead.get(key);
      if (winnerId && group.some((g) => g.id === winnerId)) {
        group.sort((x) => (x.id === winnerId ? -1 : 1));
      }
    } else if (group.length > 2) {
      // 多队同分：得失局比值 → 得失分比值
      group.sort((x, y) =>
        ratio(y.setsWon, y.setsLost) - ratio(x.setsWon, x.setsLost) ||
        ratio(y.ptsWon, y.ptsLost) - ratio(x.ptsWon, x.ptsLost)
      );
    }

    group.forEach((g) => ranked.push({ ...g, ratio: ratio(g.setsWon, g.setsLost) }));
    i = j;
  }

  ranked.forEach((r, idx) => { r.rank = idx + 1; });

  return { rows: arr, ranked };
}

module.exports = { computeStandings, ratio };