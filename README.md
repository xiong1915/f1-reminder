# 🏎️ F1 比赛开赛前 30 分钟云端自动化提醒 (GitHub Actions)

**电脑彻底关机、断电、手机也能在开赛前 30 分钟准时收到飞书/微信/钉钉提醒！**  
基于 GitHub Actions 7×24 小时全天候免费云端运行，无需购买任何云服务器。

---

## 📁 项目文件一览

- [reminder.js](reminder.js) - 核心赛程检测与多渠道推送脚本（Node.js 原生零依赖，秒级启动）
- [.github/workflows/f1-reminder.yml](.github/workflows/f1-reminder.yml) - GitHub Actions 云端定时任务定义（每 10 分钟自动巡检，支持并发防重与故障落盘）
- [history.json](history.json) - 已推送比赛历史（云端自动提交维护，发送成功立即写盘，绝不重复打扰或漏发）

---

## ⚙️ 核心架构与健壮性设计

1. **双层提醒窗口（标准 30 分钟 + 紧迫补发）**：
   - **标准窗口（20 ~ 35 分钟）**：标称提前 30 分钟提醒；
   - **紧急补发窗口（0 < diff < 20 分钟）**：针对 GitHub Actions 偶尔可能出现的排队调度延迟，若错过了 20~35 分钟窗口，系统会自动以“【即将开赛紧急提醒】”触发补发，卡片如实展示当前剩余分钟，确保用户绝不完全错过比赛；
   - **严格防后发（diff <= 0）**：比赛开赛后绝不再推送即将开赛。
2. **并发控制与串行排队**：
   - 配置了 `concurrency: f1-reminder-execution`，手动点击运行与定时触发自动串行排队执行，彻底杜绝并发竞争导致同一场比赛发送两次。
3. **即时写盘与故障保护**：
   - 每场比赛推送成功后立即写盘；
   - GitHub Actions 无论检测脚本成功或部分报错，均通过 `if: always()` 必定将已成功的 `history.json` 提交到仓库分支，防止重试时对已成功的场次重复轰炸。
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
