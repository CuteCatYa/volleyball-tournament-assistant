# 排球办赛助手（微信小程序）

基层排球办赛者的「AI 办赛工作台」—— 从发规程、收报名、抽签编排、生成秩序册，到现场记分、赛后出成绩发战报，全程微信内完成。

> 对应《排球赛事办赛辅助小程序PRD.md》V1.0，落地 P0（赛前全流程闭环 + 赛后成绩榜单）。

## 技术栈

- **前端**：微信小程序原生（WXML/WXSS/JS）
- **后端**：微信云开发（云函数 + 云数据库 + 云存储）
- **确定性引擎**：`/core` 纯函数（规则引擎 / 抽签 / 贝格尔编排 / 积分排名），配 Node 单测
- **AI**：`ai-gateway` 云函数统一网关（混元，可无缝替换），遵循「AI 表达 / 引擎事实」架构

## 目录结构

```
├── docs/                 # 技术方案、数据模型
├── core/                 # 确定性引擎（唯一事实来源）+ 单测
├── scripts/sync-core.mjs # 把 core 同步到各云函数目录
├── miniprogram/          # 小程序前端（app + 22 个页面 + services/store/utils）
├── cloudfunctions/       # 云函数（login/event/register/draw/schedule/score/document/notify/ai-gateway）
└── project.config.json   # 项目配置（appid：wxead08c27f4a88974）
```

## 快速开始

1. **改 AppID**：编辑 `project.config.json` 的 `appid`（当前已绑定 `wxead08c27f4a88974`）。
2. **改云环境 ID**：编辑 `miniprogram/config/env.js` 的 `cloudEnvId`（当前 `cloud1-d2gmj68gz398aa12c`）。
3. **开通云开发**：开发者工具 → 云开发 → 创建环境 → 按 `docs/数据模型.md` 创建 14 个集合。
4. **部署云函数**：对 `cloudfunctions/` 下每个目录「右键 → 上传并部署（云端安装依赖）」。
   - 部署前运行 `node scripts/sync-core.mjs` 同步核心算法到云函数。
   - ⚠️ 多个新函数首次部署请逐个进行（间隔几秒），避免后端「函数处于 Creating 状态」竞态报错。
5. **运行引擎单测**：`node --test core/rules.test.js`。
6. **编译预览**：开发者工具点「编译」，或通过预览二维码。

## 核心设计（对应 PRD）

- **确定性引擎负责事实**：比分/排名/积分/赛程由 `/core` 计算，零 AI，硬约束 100% 满足。
- **AI 负责表达**：规程润色、秩序册寄语、审核建议话术、客服 RAG 问答，均人工终审 + 显式标注。
- **降级可用**：AI 未配置时，核心流程（模板建赛、编排、成绩）仍可完整办赛。

## 已跑通（云端闭环验证）

- ✅ 登录闭环：`login.getOpenId` → 写 `users` → 返回 openid/userId
- ✅ 一句话建赛闭环：输入描述 → `ai-gateway.parse`（中文数字归一 + 正则，含局制/分组/赛制识别）→ 可编辑草稿卡 → `event.create`（携带 config 草稿）→ 赛事主页枢纽
- ✅ 编排/积分引擎云端验证：`schedule.generate`（4 队单循环零冲突排程）、`score.standings`（气排球 2-1-0 积分）
- ✅ 规则问答降级：弃权判罚 / 同单位回避 / 积分口径内置知识回答

## 待办（下一步）

- [ ] 启用混元大模型：复制 `cloudfunctions/ai-gateway/llm-config.example.js` 为 `llm-config.js`，填入腾讯云 SecretId/SecretKey（CAM → API 密钥管理），`enabled: true` 后重新部署（未填密钥时自动降级本地解析，功能不中断）
- [ ] 填写订阅消息模板 ID（`miniprogram/utils/subscribe.js`）
- [ ] 秩序册 PDF 渲染（`cloudfunctions/document`）
- [ ] 补齐各 P0 桩页面业务逻辑（规程编辑器、审核、编排工作台等）