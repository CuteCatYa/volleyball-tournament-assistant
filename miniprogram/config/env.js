/**
 * 全局环境配置（提交前需替换为真实值）
 */
module.exports = {
  // 云开发环境 ID（AppID wxead08c27f4a88974 已开通云开发）
  cloudEnvId: 'cloud1-d2gmj68gz398aa12c',

  // AI 能力开关（由 ai-gateway 云函数统一控制，此处仅做前端降级提示）
  aiEnabled: true,

  // 默认规则（与 core/rules.js 保持一致）
  defaultBallType: 'air',
  defaultBestOf: 3,
};