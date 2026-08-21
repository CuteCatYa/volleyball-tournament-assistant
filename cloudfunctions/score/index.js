/**
 * score：赛后比分录入 + 积分排名（PRD F7.6 P0 简版 / F8.1）。
 * 排名由 core/standings 计算（积分→胜负关系→得失局→得失分），非 AI。
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
      const { eventId, groupId, teamA, teamB, sets, walkover, ballType, bestOf } = payload;
      // 校验（确定性引擎把关，杜绝 AI/手工算错分）
      let analysis = null;
      if (!walkover) {
        analysis = analyzeMatch({ ballType, bestOf, sets });
        if (!analysis.valid) return { code: 1, msg: `比分不合法：${analysis.reason}` };
      }
      const res = await db.collection('matches').add({
        data: {
          eventId, groupId, teamA, teamB, sets: sets || [], walkover: walkover || null,
          ballType, bestOf,
          result: analysis ? { winner: analysis.winner, setScore: analysis.setScore, points: analysis.points } : null,
          operator: OPENID,
          at: Date.now(),
        },
      });
      return { code: 0, data: { matchId: res._id, result: analysis } };
    }

    if (action === 'standings') {
      const { teams = [], matches = [], ballType = 'air', bestOf = 3 } = payload;
      const { ranked, rows } = computeStandings(matches, teams, { ballType, bestOf });
      return { code: 0, data: { ranked, rows } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'score 调用失败' };
  }
};