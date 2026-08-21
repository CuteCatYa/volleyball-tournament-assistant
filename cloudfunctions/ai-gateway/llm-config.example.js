/**
 * 混元模型配置（示例模板）。
 * 复制为 llm-config.js 并填入密钥后即可启用（llm-config.js 已加入 .gitignore，不会提交）。
 * 密钥获取：腾讯云控制台 → 访问管理 CAM → API 密钥管理（SecretId/SecretKey）。
 */
module.exports = {
  enabled: false, // 填好密钥后置 true
  provider: 'hunyuan',
  secretId: '', // 腾讯云 SecretId
  secretKey: '', // 腾讯云 SecretKey
  // 可选模型：hunyuan-lite（免费）/ hunyuan-standard / hunyuan-large
  model: 'hunyuan-large',
};
