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
   - ⚠️ 每次重新部署 `ai-gateway` 后，需在云开发控制台把该函数超时调到 ≥60 秒（部署会重置为 3 秒）。
5. **运行引擎单测**：`node --test core/rules.test.js`。
6. **编译预览**：开发者工具点「编译」，或通过预览二维码。

## 办一场真实比赛（P0 全流程，已端到端验证）

> 2026-08 实测闭环：建赛 → 规程 → 报名 → 抽签 → 赛程 → 记分 → 积分 → 公告 → 秩序册 → 结束，全部页面可操作、数据入库。

| 步骤 | 入口 | 做了什么 |
|------|------|----------|
| 1 建赛 | 首页「新建赛事」 | 一句话描述 → AI 解析（中文数字/球种/赛制/名次）→ 可编辑草稿卡 → 确认创建 |
| 2 规程 | 工作台 → 竞赛规程 | 主办/地点/时间/参加办法/竞赛办法/录取名次表单 → 保存后状态 draft→cfg |
| 3 报名 | 工作台 → 报名登记 | 组织者添加队伍（队名/单位/联系/队员）→ 完成报名（≥2 队）→ cfg→draw |
| 4 抽签 | 工作台 → 分组抽签 | 服务端安全随机（crypto）+ 同单位冲突检测 + 审计留痕；可种子分档蛇形 |
| 5 赛程 | 工作台 → 赛程编排 | 贝格尔循环 + 自动排场（场地/时段），同队不连场；生成 6 场 → 状态 sched |
| 6 记分 | 工作台 → 比分录入 | 每场录入各局比分（自动校验完赛局数/25·21 分制），支持弃权；首场录入后自动 ongoing |
| 7 积分 | 首页/赛事 → 成绩榜 | 分组成绩实时计算（积分→胜负局比）；结束赛事锁定成绩 → ended |
| 8 公告 | 赛事主页 → 公告 | 发布公告（内容安全校验，87014 才拦截）→ 消息 Tab 汇总展示 |
| 9 秩序册 | 工作台 → 秩序册 | 赛事信息 + 队伍名单 + 分组 + 全部赛程 + 公告实时聚合 |

页面一览：首页（我的赛事 + 下一步引导）、工作台（赛事选择 + 六步流程）、消息（跨赛事公告）、我的（openid/手机号/赛事数）、赛事枢纽（9 宫格入口）、AI 问答（混元实时问答）。

## 核心设计（对应 PRD）

- **确定性引擎负责事实**：比分/排名/积分/赛程由 `/core` 计算，零 AI，硬约束 100% 满足。
- **AI 负责表达**：规程润色、秩序册寄语、审核建议话术、客服 RAG 问答，均人工终审 + 显式标注（`aiFlag`）。
- **降级可用**：AI 未配置时，核心流程（正则建赛、编排、成绩、规则问答降级）仍可完整办赛。

## 云函数接口（action 契约）

| 函数 | action | 说明 |
|------|--------|------|
| login | getOpenId / bindPhone | 登录写 users / 绑定手机号 |
| event | create / list / detail / update / advance | 建赛（config+regulation）；状态机 draft→cfg→reg→draw→sched→ongoing→ended 只前进 |
| register | addTeam / listTeams / updateTeam / removeTeam | 队伍增删改查（approved 入池） |
| draw | run / result | 服务端安全随机/种子蛇形；同单位检测；写 groups + 回写 event.groups + 审计 |
| schedule | generate / list | 贝格尔循环生成全部场次 + 自动排场；写 matches；状态→sched |
| score | record / reset / matches / standings | 比分校验录入（规则引擎）、更正、场次查询、分组成绩实时计算 |
| document | orderbookData / generate | 秩序册数据聚合；PDF 生成队列（待接入） |
| notify | announce / myNotices / allNotices | 发布公告（内容安全 87014 才拦截）+ 单赛事/全部公告查询 |
| ai-gateway | parse / answer / chat | AI 解析建赛参数（中文数字归一）、规则问答；混元 hy3 真实调用 |

## 已跑通（云端闭环验证）

- ✅ 登录闭环：`login.getOpenId` → 写 `users` → 返回 openid/userId
- ✅ 一句话建赛闭环：输入描述 → `ai-gateway.parse`（中文数字归一 + 正则，含局制/分组/赛制识别）→ 可编辑草稿卡 → `event.create`（携带 config 草稿）→ 赛事主页枢纽
- ✅ **混元真实调用**：`ai-gateway` 走云开发官方 AI 能力（`@cloudbase/node-sdk` → `createModel('cloudbase').generateText({model:'hy3'})`），云函数内隐式鉴权、无需密钥；实测 `aiFlag:true / degraded:false`
- ✅ **真实办赛端到端**：6 队沙排赛事全流程（规程→报名→2 组抽签→6 场赛程→6 场比分→双小组积分榜→公告→秩序册→结束），全部页面 UI 操作验证
- ✅ 编排/积分引擎云端验证：`schedule.generate`（分组单循环 + 自动排场）、`score.standings`（分组成绩，积分→胜局比排序）
- ✅ 规则问答：`ai-gateway.answer`（hy3 实时回答 + 降级内置知识）

## 待办（下一步）

- [x] 接入混元大模型：已改用云开发官方 AI 能力（体验模型 `hy3`，控制台 → AI → 生文模型 开开关即可）。`ai-gateway` 云函数超时需在控制台调到 ≥60 秒
- [x] 补齐 P0 全流程业务逻辑（规程、报名、抽签、编排、记分、积分、公告、秩序册全部可操作）
- [ ] 填写订阅消息模板 ID（`miniprogram/utils/subscribe.js`）
- [ ] 秩序册 PDF 渲染（`cloudfunctions/document`，当前页面内实时聚合渲染可用）
- [ ] P1：审核留痕、种子分档 UI 编辑、交叉淘汰赛制、适老大字模式