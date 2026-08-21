/**
 * 模型配置示例模板。
 * 复制为 llm-config.js 后按需调整（llm-config.js 已加入 .gitignore，不会提交）。
 *
 * 走云开发官方 AI 能力（@cloudbase/node-sdk），云函数内隐式鉴权，无需密钥。
 * 前提：云开发控制台 → AI → 生文模型 已开启对应模型开关。
 *   - 体验模型（小程序成长计划）：provider='cloudbase'，model='hy3'
 *   - 资源点套餐 / 自定义模型：按控制台配置调整 provider 与 model
 */
module.exports = {
  enabled: true, // 置 false 则全程本地正则降级，不调用模型
  provider: 'cloudbase', // 模型分组：内置体验模型为 cloudbase
  model: 'hy3', // 模型名；资源点套餐可换 deepseek 等
  // envId: 'your-env-id', // 可选：覆盖默认环境 ID
};
