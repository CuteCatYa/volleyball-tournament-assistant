/**
 * score：比分录入（校验）+ 积分榜计算（core/standings）。
 * 录入首场后赛事自动进入 ongoing；积分按抽签分组统计（含未赛队伍）。
 */
'use strict';

const cloud = require('wx-server-sdk');
const { analyzeMatch } = require('./core/rules');
const { computeStandings } = require('./core/standings');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'record') {
      const { matchId } = payload;
      const mRes = await db.collection('matches').doc(matchId).get();
      const m = mRes.data;
      if (!m) return { code: 1, msg: '场次不存在' };

      let result = null;
      let sets = [];
      let walkover = null;
      if (payload.walkover === 'a' || payload.walkover === 'b') {
        walkover = payload.walkover;
        result = { winner: walkover === 'a' ? 'B' : 'A', walkover: walkover === 'a' ? 'A 弃权' : 'B 弃权' };
      } else {
        if (!Array.isArray(payload.sets) || !payload.sets.length) return { code: 1, msg: '请录入至少一局比分' };
        sets = payload.sets.map((s) => [Number(s[0]), Number(s[1])]);
        if (sets.some((s) => !Array.isArray(s) || s.length !== 2 || Number.isNaN(s[0]) || Number.isNaN(s[1]))) {
          return { code: 1, msg: '比分格式不正确' };
        }
        const analysis = analyzeMatch({ ballType: m.ballType || 'air', bestOf: m.bestOf || 3, sets });
        if (!analysis.valid) return { code: 1, msg: `比分不合法：${analysis.reason}` };
        result = { winner: analysis.winner, setScore: analysis.setScore, points: analysis.points };
      }

      await db.collection('matches').doc(matchId).update({
        data: { sets, walkover, result, status: 'done', scoredAt: Date.now(), operator: OPENID },
      });

      // 录入首场 → 赛事自动进行中
      const evRes = await db.collection('events').doc(m.eventId).get();
      const cur = evRes.data;
      if (cur && ['sched', 'draw'].includes(cur.status)) {
        await db.collection('events').doc(m.eventId).update({ data: { status: 'ongoing', updatedAt: Date.now() } });
      }
      return { code: 0, data: { ok: true, result } };
    }

    if (action === 'reset') {
      await db.collection('matches').doc(payload.matchId).update({
        data: { sets: [], walkover: null, result: null, status: 'pending' },
      });
      return { code: 0, data: { ok: true } };
    }

    if (action === 'matches') {
      const res = await db.collection('matches')
        .where({ eventId: payload.eventId })
        .orderBy('seq', 'asc')
        .limit(300)
        .get();
      return { code: 0, data: { list: res.data } };
    }

    if (action === 'standings') {
      const { eventId } = payload;
      const idName = new Map();
      const nameTeam = new Map();
      const teamRes = await db.collection('teams').where({ eventId, status: 'approved' }).limit(200).get();
      teamRes.data.forEach((t) => { idName.set(t._id, t.name); nameTeam.set(t._id, t); });

      const mRes = await db.collection('matches').where({ eventId }).limit(400).get();
      const drawRes = await db.collection('groups').where({ eventId }).orderBy('createdAt', 'desc').limit(1).get();
      const draw = drawRes.data[0];
      const evRes = await db.collection('events').doc(eventId).get();
      const ev = evRes.data || {};
      const ballType = ev.ballType || 'air';
      const bestOf = ev.bestOf || 3;

      const groupList = (draw && draw.groups) || null;
      const matchByGroup = {};
      for (const m of mRes.data) {
        const g = m.group || 'A';
        if (!matchByGroup[g]) matchByGroup[g] = [];
        matchByGroup[g].push(m);
      }

      let out = [];
      if (groupList && groupList.length > 1) {
        out = groupList.map((g) => {
          const groupMatches = (matchByGroup[g.name] || []).filter((m) => m.status === 'done')
            .map((m) => ({ a: m.teamA, b: m.teamB, sets: m.sets, walkover: m.walkover, ballType: m.ballType || ballType, bestOf: m.bestOf || bestOf }));
          const { ranked } = computeStandings(groupMatches, g.teamIds || [], { ballType, bestOf });
          return { group: g.name, rows: ranked.map((r) => ({ ...r, name: idName.get(r.id) || r.id })) };
        });
      } else {
        const allIds = (groupList && groupList.length) ? groupList[0].teamIds || [] : teamRes.data.map((t) => t._id);
        const done = mRes.data.filter((m) => m.status === 'done')
          .map((m) => ({ a: m.teamA, b: m.teamB, sets: m.sets, walkover: m.walkover, ballType: m.ballType || ballType, bestOf: m.bestOf || bestOf }));
        const { ranked } = computeStandings(done, allIds, { ballType, bestOf });
        out = [{ group: '总排名', rows: ranked.map((r) => ({ ...r, name: idName.get(r.id) || r.id })) }];
      }

      return { code: 0, data: { groups: out } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'score 调用失败' };
  }
};
