/**
 * schedule：赛程编排（确定性算法核心，写 matches 集合）。
 * 小组循环：各组内单循环；单组：全队单循环。生成后 events.status → sched。
 */
'use strict';

const cloud = require('wx-server-sdk');
const { singleRoundRobin, detectConflicts, assignSchedule } = require('./core/schedule');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'generate') {
      const { eventId } = payload;
      const drawRes = await db.collection('groups')
        .where({ eventId })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      const draw = drawRes.data[0];
      if (!draw) return { code: 1, msg: '请先完成分组抽签' };

      const evRes = await db.collection('events').doc(eventId).get();
      const ev = evRes.data || {};
      const cfg = ev.config || {};
      const ballType = ev.ballType || 'air';
      const bestOf = ev.bestOf || 3;
      const courtCount = Math.max(1, Number(cfg.courts) || 1);
      const slotCount = Math.max(4, Number(cfg.slots) || 40);

      const teamRes = await db.collection('teams').where({ eventId, status: 'approved' }).limit(200).get();
      const idName = new Map(teamRes.data.map((t) => [t._id, t.name]));

      const groupList = draw.groups || [];
      const matches = [];
      let id = 1;

      if (groupList.length > 1) {
        // 分组循环：各组内单循环
        for (const g of groupList) {
          const ids = g.teamIds || [];
          if (ids.length < 2) continue;
          const rounds = singleRoundRobin(ids.length);
          rounds.forEach((r, ri) => {
            r.forEach(([a, b]) => {
              const ta = ids[a]; const tb = ids[b];
              matches.push({
                seq: id++, eventId, group: g.name, round: `第${ri + 1}轮`,
                teamA: ta, teamB: tb,
                teamAName: idName.get(ta) || ta, teamBName: idName.get(tb) || tb,
                ballType, bestOf, sets: [], status: 'pending',
              });
            });
          });
        }
      } else {
        // 单组单循环
        const ids = groupList.length ? groupList[0].teamIds || [] : [];
        if (ids.length < 2) return { code: 1, msg: '队伍数不足' };
        const rounds = singleRoundRobin(ids.length);
        rounds.forEach((r, ri) => {
          r.forEach(([a, b]) => {
            const ta = ids[a]; const tb = ids[b];
            matches.push({
              seq: id++, eventId, group: 'A', round: `第${ri + 1}轮`,
              teamA: ta, teamB: tb,
              teamAName: idName.get(ta) || ta, teamBName: idName.get(tb) || tb,
              ballType, bestOf, sets: [], status: 'pending',
            });
          });
        });
      }

      if (!matches.length) return { code: 1, msg: '没有可编排的场次' };

      const { schedule: sched, unplacedCount } = assignSchedule(matches, { courtCount, slotCount, minGap: 1 });
      const conflicts = detectConflicts(sched);

      await db.collection('matches').where({ eventId }).remove();
      await Promise.all(sched.map((m) => db.collection('matches').add({ data: m })));
      await db.collection('events').doc(eventId).update({ data: { status: 'sched', schedAt: Date.now() } });

      return { code: 0, data: { matchCount: sched.length, courtCount, unplacedCount, conflictCount: conflicts.length, conflicts } };
    }

    if (action === 'list') {
      const res = await db.collection('matches')
        .where({ eventId: payload.eventId })
        .orderBy('seq', 'asc')
        .limit(300)
        .get();
      return { code: 0, data: { list: res.data } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'schedule 调用失败' };
  }
};
