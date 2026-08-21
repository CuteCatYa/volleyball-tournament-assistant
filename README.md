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
└── project.config.json   # 项目配置（appid 占位）
```

## 快速开始

1. **改 AppID**：编辑 `project.config.json` 的 `appid`（或用开发者工具导入时填）。
2. **改云环境 ID**：编辑 `miniprogram/config/env.js` 的 `cloudEnvId`。
3. **开通云开发**：开发者工具 → 云开发 → 创建环境 → 按 `docs/数据模型.md` 创建集合。
4. **部署云函数**：对 `cloudfunctions/` 下每个目录「右键 → 上传并部署（云端安装依赖）」。
   - 部署前运行 `node scripts/sync-core.mjs` 同步核心算法到云函数。
5. **运行引擎单测**：`node --test core/rules.test.js`。
6. **编译预览**：开发者工具点「编译」，或通过预览二维码。

## 核心设计（对应 PRD）

- **确定性引擎负责事实**：比分/排名/积分/赛程由 `/core` 计算，零 AI，硬约束 100% 满足。
- **AI 负责表达**：规程润色、秩序册寄语、审核建议话术、客服 RAG 问答，均人工终审 + 显式标注。
- **降级可用**：AI 未配置时，核心流程（模板建赛、编排、成绩）仍可完整办赛。

## 待办（下一步）

- [ ] 接入混元大模型（`cloudfunctions/ai-gateway` 的 `MODEL_ENABLED` / 环境变量）
- [ ] 填写订阅消息模板 ID（`miniprogram/utils/subscribe.js`）
- [ ] 秩序册 PDF 渲染（`cloudfunctions/document`）
- [ ] 补齐各 P0 桩页面业务逻辑（建赛表单、规程编辑器、审核、编排工作台等）