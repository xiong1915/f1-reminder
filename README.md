# F1 每周赛程规划与开赛提醒 (F1 Reminder Bot)

基于 GitHub Actions 的免服务器（Serverless）F1 自动化赛程规划与开赛前提醒系统。通过 OpenF1 官方公开接口获取赛程，零外部运行时依赖（纯 Node.js 原生标准库实现），支持开赛前 30 分钟（主触发）及开赛前 15 分钟（备用触发）双重定时调度与多平台机器人推送。

---

## ✨ 核心特性

- **动静态分离架构**：
  - **每周规划阶段**（Weekly Planner）：每周日自动读取未来 8 天赛程，生成静态计划 `weekly-plan.json` 并动态更新提醒工作流；
  - **赛前提醒阶段**（Race Reminder）：直接读取本地已固化的计划精准触发，不频繁轮询赛程接口，杜绝 API 限流与平台资源浪费。
- **8 天赛程规划窗口**：窗口自周日中午延伸至下周日晚间，完整覆盖周日夜间跨边界赛事，消除周日正赛漏规划隐患。
- **主备双 Cron 冗余调度**：为每场赛事自动生成开赛前 30 分钟（主触发）与开赛前 15 分钟（备用触发）的双重定时任务，有效防范 GitHub Actions 偶尔发生的 schedule 调度丢失。
- **严谨的网络投递状态机（At-most-once 优先）**：
  - `status: sent`（确认送达）：接口成功返回，记录 `sent_at`；持久化防重，`history.json` 成功提交到远端后，后续运行会跳过重复发送；
  - `status: uncertain`（送达不确定）：遇到请求已发出但超时、断流或响应体损坏时，不盲目重试，持久化 `uncertain` 状态并让当前 Actions 报红；后续备用 cron 检测到该状态后主动抑制自动发包并输出告警，杜绝群内消息轰炸；
  - `not_delivered`（确认未送达）：可确认请求未送达的网络故障（如 DNS 解析失败、TCP 连接拒绝等），允许安全重试（最多 3 次），不写入历史，由备用 cron 接管容灾补发；
  - **赛程改期感知**：主键精确绑定场次与开赛毫秒时间戳；若赛程调整，在 F1 Weekly Planner 重新规划后，`date_start` 变化会生成新 key，并允许重新提醒。
- **全局单例并发互斥**：统一通过 `concurrency: f1-reminder-execution` 串行排队执行，杜绝规划即时补发与定时提醒并发读取旧历史引发的重复推送与 Git 冲突。
- **全环节赛事覆盖**：完整支持自由练习赛（FP1/FP2/FP3）、排位赛（Qualifying）、冲刺排位赛（Sprint Quali）、冲刺赛（Sprint Race）及大奖赛正赛（Main Race）。
- **多平台 Webhook 原生适配**：开箱即用支持飞书、企业微信、钉钉、Server酱、Pushplus。

---

## 📱 支持的推送渠道

脚本通过环境变量 `PUSH_KEY` 自动识别目标推送平台：

| 平台 | 配置方式 (`PUSH_KEY`) | 消息样式 |
| :--- | :--- | :--- |
| **飞书** | 填入飞书自定义机器人 Webhook 完整 URL（如 `https://open.feishu.cn/open-apis/bot/v2/hook/...`） | 交互式富文本彩色卡片（含大奖赛、环节、赛道、倒计时与状态标签） |
| **企业微信** | 填入企微机器人 Webhook 完整 URL（如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...`） | Markdown 格式卡片消息 |
| **钉钉** | 填入钉钉机器人 Webhook 完整 URL（如 `https://oapi.dingtalk.com/robot/send?access_token=...`） | Markdown 格式消息 |
| **Server酱** | 填入 SendKey 或完整推送 URL（如 `https://sctapi.ftqq.com/SCT....send`） | 标题与详情 Markdown 消息 |
| **Pushplus** | 填入 Pushplus Token（如需指定通道，可额外配置 Secret `PUSHPLUS_CHANNEL`，默认 `wechat`） | 微信模板消息 |

---

## 🚀 快速开始与配置

### 1. Fork 或克隆本仓库

将本仓库 Fork 到你个人的 GitHub 账号下。

### 2. 配置 GitHub Secrets

进入你的 GitHub 仓库：**Settings → Secrets and variables → Actions**，在 **Repository secrets** 中添加以下密钥：

1. **`PUSH_KEY`**（必须）：
   - 填入你接收消息的机器人 Webhook 地址或 Token。
2. **`SCHEDULE_TOKEN`**（必须）：
   - 用于在每周规划赛程后，由 Actions 自动提交更新 `.github/workflows/f1-reminder.yml` 与 `weekly-plan.json`。
   - **创建方式**：进入 GitHub 个人设置 → **Developer Settings** → **Personal access tokens** → **Fine-grained tokens**：
     - **Repository access**：Only select repositories → 选择你的 `f1-reminder` 仓库；
     - **Permissions**：
       - `Contents`：**Read and write**
       - `Workflows`：**Read and write**
     - 生成后将 Token 填入 Secret，**不要将 Token 提交至代码库或日志中**。
3. **`PUSHPLUS_CHANNEL`**（可选）：
   - 若使用 Pushplus 推送，可设置此项自定义通道（如 `wechat`、`mail`、`cp` 等），默认为 `wechat`。

### 3. 首次初始化与验证

1. **生成首期计划**：
   - 进入仓库的 **Actions** 标签页；
   - 点击左侧 **F1 Weekly Planner** 工作流，点击 **Run workflow** 手动触发一次；
   - 执行成功后，会自动拉取最新 8 天赛程，生成 `weekly-plan.json` 并注册对应的定时任务。
2. **测试机器人连通性**：
   - 点击左侧 **F1 Race 30-Min Reminder** 工作流，点击 **Run workflow**；
   - 勾选 `test_mode: true` 并运行；
   - 你的机器人群组将收到一条测试卡片，确认通知通路正常。

---

## ⚙️ 运行机制与容灾逻辑

```text
[每周日 12:07 BJT / 04:07 UTC]
            │
            ▼
┌───────────────────────────┐
│     F1 Weekly Planner     │ ──> 请求 OpenF1 API 拉取未来 8 天赛程
└───────────────────────────┘
            │
            ├─ 无比赛周 ──> 生成空计划，不注册提醒 cron，全周零额外运行
            │
            └─ 有比赛周 ──> 生成 weekly-plan.json
                            │
                            ├─ 为每场生成两道 cron（开赛前 30 分钟主触发 + 15 分钟备用触发）
                            ├─ 更新并提交 .github/workflows/f1-reminder.yml
                            └─ 若检测到即将开赛的场次，由 catchup-reminder 互斥队列补发
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │    F1 Race 30-Min Reminder    │（开赛前 30m / 15m）
                            └───────────────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
        [confirmed sent]          [delivery uncertain]         [confirmed not delivered]
       HTTP 200 + 业务成功            请求已发出但超时/断流          可确认未送达 (ECONNREFUSED 等)
               │                            │                            │
      写入 status: 'sent'         写入 status: 'uncertain'                不写入历史
    持久化防重，推送历史到远端        当次 Actions 明确报红             允许安全自动重试 (3次)
                                    备用 cron 检测并抑制重复           备用 cron 接管重新推送
```

### 关键设计准则

- **无比赛周零打扰**：无赛事的周末不会生成比赛触发器，也不会向群内发送任何闲置消息。
- **计划有效期保护**：计划有效期为 8 天，若因 Token 失效导致连续一周未成功刷新，提醒脚本将明确报错并终止，防止依赖过期的历史赛程误报。
- **开赛后不补发**：比赛一旦开始（距开赛时间 $\le 0$ 分钟），程序坚决放弃发送开赛前提醒，避免比赛中途发送无意义的滞后消息。
- **改期需重新规划**：每周检查后发生的临时改期或取消，需等待周日定期规划或在 Actions 手动运行 F1 Weekly Planner 刷新计划；重新规划取得新的开赛时间（`date_start`）后，系统将生成新 key 并执行提醒，周内未重新规划前不会自动感知。
- **At-most-once 优先原则**：在网络偶发断流且无法确认机器人平台是否已投递时，系统优先选择抑制备用重发并抛出告警，杜绝群内重复消息刷屏。

---

## 🛠️ 本地开发与验证

本项目采用 Node.js 原生开发，无须执行 `npm install` 安装第三方运行时依赖。可在本地快速验证核心逻辑：

```bash
# 验证赛程计划生成与工作流模板渲染
node -e "const { buildPlan, renderWorkflow } = require('./weekly-planner'); console.log(buildPlan([], Date.now()));"

# 查看当前已固化的赛程计划场次
node -e "const plan = require('./weekly-plan.json'); console.log('当前计划包含场次:', plan.sessions.length);"
```

---

## 📄 开源许可与声明

- 本项目开源供广大 F1 车迷个人使用；
- 赛事数据源来自 [OpenF1](https://openf1.org/) 公开接口；
- 本项目非 Formula 1 官方应用，与 Formula One Licensing B.V. 无任何附属或商业关联。
