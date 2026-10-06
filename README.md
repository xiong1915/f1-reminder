# 🏎️ F1 比赛开赛前 30 分钟云端自动化提醒 (GitHub Actions)

**电脑彻底关机、断电、手机也能在开赛前 30 分钟准时收到微信/飞书/钉钉提醒！**  
基于 GitHub Actions 7×24 小时全天候免费云端运行，无需购买任何云服务器。

---

## 📁 项目文件一览

- [reminder.js](reminder.js) - 核心赛程检测与多渠道推送脚本（Node.js 原生零依赖，秒级启动）
- [.github/workflows/f1-reminder.yml](.github/workflows/f1-reminder.yml) - GitHub Actions 云端定时任务定义（每 10 分钟自动巡检）
- [history.json](history.json) - 已推送比赛历史（云端自动提交维护，发送成功才写入，绝不重复打扰或漏发）

---

## ⚙️ 核心特性与机制优化

1. **精准提前 30 分钟**：严格将提醒窗口锁定在开赛前 `20 ~ 35` 分钟区间内，配合每 10 分钟一次的云端巡检，必有且仅有一次命中开赛前 30 分钟黄金提醒期。开赛后（`<= 0` 分钟）绝不误推。
2. **防漏发与异常重试**：
   - 全面校验飞书、企微、钉钉、Pushplus、Server酱的 HTTP 状态码与业务返回值。
   - **只有当接口确认返回成功时，才记录为“已发送”**。如遇偶发网络抖动或接口报错，不写入历史，下次巡检自动重试，杜绝漏发。
3. **真实错误报警**：赛程请求失败或推送异常时可靠抛出非 0 退出码，GitHub Actions 真实报红并通过邮件告警，杜绝“假成功”。
4. **全平台通道支持**：全面支持飞书机器人（交互式卡片）、企业微信（Markdown）、钉钉（Markdown）、Server酱（Turbo版）、Pushplus（普通微信及微信ClawBot）。

---

## 🚀 极简配置说明

### 配置密钥（Secret）

在 GitHub 仓库的 **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions** 中添加：

- **`PUSH_KEY`**：您的推送地址或 Token（例如飞书机器人 Webhook 地址、企业微信 Webhook、Pushplus Token 或 Server酱 Key）。
- *(可选)* **`PUSHPLUS_CHANNEL`**：如使用 Pushplus 的微信 ClawBot，可填 `clawbot`；默认推送至服务号 `wechat`。
