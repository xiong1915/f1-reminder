# 🏎️ F1 比赛开赛前 30 分钟云端自动化提醒 (GitHub Actions)

**电脑彻底关机、断电、手机也能在开赛前 30 分钟准时收到飞书/微信/钉钉提醒！**  
基于 GitHub Actions 7×24 小时全天候免费云端运行，无需购买任何云服务器。

---

## 📁 项目文件一览

- [reminder.js](reminder.js) - 核心赛程检测与多渠道推送脚本（Node.js 原生零依赖，秒级启动）
- [.github/workflows/f1-reminder.yml](.github/workflows/f1-reminder.yml) - GitHub Actions 云端定时任务定义（每 10 分钟自动巡检，支持并发防重与故障落盘）
- [history.json](history.json) - 已推送比赛历史（云端自动提交维护，发送成功立即写盘，严格防止重复推送）
- [cache_2026.json](cache_2026.json) - 赛程本地/云端灾备缓存（拉取成功后持久化，应对远端 API 临时不可用）

---

## ⚙️ 核心架构与健壮性设计

1. **双层提醒窗口（标准 30 分钟 + 紧迫补发）**：
   - **标准窗口（20 ~ 35 分钟）**：常规开赛前约 30 分钟提醒；
   - **紧急补发窗口（0 < 剩余时间 < 20 分钟）**：针对 GitHub Actions 云端定时偶发的队列延迟，若偶发延迟进入该窗口，系统自动以“【即将开赛紧急提醒】”补发通知，卡片展示实时重算后的剩余分钟；
   - **严格防后发（剩余时间 <= 0）**：在发送前结合即时系统时间毫秒级重新校准，一旦已开赛坚决不再发送提醒。
2. **并发控制与串行排队**：
   - 配置了 `concurrency: f1-reminder-execution`，手动点击运行与定时触发自动串行排队执行，杜绝并发竞争导致同一场比赛发送两次。
3. **即时写盘与故障保护**：
   - 每场比赛推送成功后立即写盘；
   - 历史文件格式严格校验（防空文件、防异常结构），损坏时拒绝静默忽略并自动备份，防止全量误发；
   - GitHub Actions 无论检测脚本成功或部分报错，均通过 `if: always()` 尽力将已成功的历史记录与赛程缓存 commit 并通过 rebase 重试 push 到仓库。
4. **日志安全与异常重试**：
   - 请求超时与网络错误对 URL 深度脱敏，隐藏 Token / Webhook Key；
   - 赛程拉取配备 3 次退避重试与本地降级备份缓存，接口抖动时绝不轻易报错。
5. **全平台通道支持**：
   - 飞书机器人（专属富文本交互式卡片）
   - 企业微信（Markdown）
   - 钉钉（Markdown）
   - Server酱（Turbo 版）
   - Pushplus（普通微信及微信ClawBot，强制 HTTPS）
6. **独立测试入口**：
   - 支持在 GitHub Actions 页面点击“Run workflow”时勾选 `test_mode`，直接向配置的 Webhook 发送一条模拟卡片以验证通道畅通。

---

## 🚀 极简配置说明

### 配置密钥（Secret）

在 GitHub 仓库的 **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions** 中添加：

- **`PUSH_KEY`**：您的推送地址或 Token（例如飞书机器人 Webhook 地址、企业微信 Webhook、Pushplus Token 或 Server酱 Key）。
- *(可选)* **`PUSHPLUS_CHANNEL`**：如使用 Pushplus 的微信 ClawBot，可填 `clawbot`；默认推送至服务号 `wechat`。
