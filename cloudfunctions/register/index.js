/**
 * register：报名两段式（P0 骨架）。
 * 状态机：draft → pending(待补资料) → submitted(待审核) → approved/rejected/published（PRD §4.3）。
 */
'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const TEAM_STATUS = ['draft', 'pending', 'submitted', 'approved', 'rejected', 'published'];

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};

  try {
    if (action === 'createTeam') {
      const res = await db.collection('teams').add({
        data: {
          eventId: payload.eventId,
          name: payload.name || '未命名队伍',
          unit: payload.unit || '',
          captain: OPENID,
          leader: payload.leader || '',
          coach: payload.coach || '',
          seed: payload.seed || null,
          status: 'draft',
          createdAt: Date.now(),
        },
      });
      return { code: 0, data: { id: res._id } };
    }

    if (action === 'submit') {
      // 提交前校验必填（P0 骨架：占位，完整校验在 register 内追加字段规则）
      await db.collection('teams').doc(payload.teamId).update({
        data: { status: 'submitted', submittedAt: Date.now() },
      });
      return { code: 0, data: { status: 'submitted' } };
    }

    if (action === 'review') {
      const status = payload.status;
      if (!TEAM_STATUS.includes(status)) return { code: 1, msg: `非法状态: ${status}` };
      await db.collection('teams').doc(payload.teamId).update({
        data: { status, reviewComment: payload.comment || '', reviewedAt: Date.now() },
      });
      return { code: 0, data: { status } };
    }

    return { code: 1, msg: `未知 action: ${action}` };
  } catch (e) {
    return { code: 1, msg: e.message || 'register 调用失败' };
  }
};