# TIKE F1 · 赛事数据与云端提醒

TIKE F1 是一个面向 F1 观众的中文赛事平台，提供赛程、倒计时、车手与车队积分、赛事问答，以及飞书云端提醒

[访问网站](https://f1.tike69.cc.cd) · [架构说明](docs/ARCHITECTURE.md) · [AI 配置](docs/AI_PROVIDERS.md)

## 主要功能

- **赛程与赛事数据**：查看分站、练习赛、冲刺排位赛、冲刺赛、排位赛和正赛，时间统一显示为北京时间
- **官方时间校准**：提醒运行时读取 F1 官网的结构化赛程，校准比赛周末的开赛时间，识别次级数据源未及时更新的时间变更
- **两次飞书提醒**：赛前约 35 分钟开始提醒，预留重试缓冲；到达官方开赛时间后再提醒一次，两种提醒分别去重
- **云端运行**：Cloudflare 定时触发、Vercel 执行提醒、Upstash Redis 保存发送状态，GitHub Actions 提供备用检查，不依赖个人电脑开机
- **积分与赛事问答**：展示车手、车队积分和争冠推演，结合赛事数据提供 DeepSeek AI 问答
- **网页与飞书机器人**：提供多端网页界面与飞书机器人集成，服务端保存凭据，并对请求进行限流

## 提醒如何工作

1. Jolpica 提供赛季与分站信息，近期缓存可在次级接口临时故障时用于定位赛事
2. 比赛周末的每次提醒检查重新读取 F1 官方赛程，以官方开赛时间决定是否发送；官方核验失败时，不按未经确认的旧时间发送
3. 赛前提醒和开赛提醒使用独立发送记录，确认飞书接受后去重，失败或结果不明时允许重试
4. 开赛提醒在官方时间之后的首次检查发送，允许在开赛后 10 分钟内补发，避免长时间后发送过期提醒

提醒属于尽力送达：每分钟检查和云端服务可能产生延迟，飞书接受消息不等于手机已显示通知；“开赛提醒”依据官方赛程，不代表已确认现场实际发车

## 技术组成

| 用途 | 技术 |
| --- | --- |
| 网页与服务端 | Next.js、React、TypeScript |
| 赛事数据 | Jolpica、OpenF1、F1 官方赛程 |
| 云端调度与部署 | Cloudflare Workers、Vercel、GitHub Actions |
| 发送状态与去重 | Upstash Redis |
| 消息提醒与机器人 | 飞书 |
| 赛事问答 | DeepSeek |

基础设施优先使用免费额度，AI 调用费用按供应商计费规则计算

## 本地开发

项目已在 Node.js 24 环境验证，使用 npm 安装依赖

```bash
npm install
```

复制 `.env.example` 为 `.env.local`，按需填写配置，再启动开发服务器

```bash
npm run dev
```

打开 [localhost:3000](http://localhost:3000)

### 关键服务端配置

- AI：`DEEPSEEK_API_KEY`
- 飞书机器人应用：`FEISHU_APP_ID`、`FEISHU_APP_SECRET`
- 云端提醒：`FEISHU_WEBHOOK_URL`、`CRON_SECRET`
- 持久化状态：`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`，或对应的 `KV_REST_API_URL`、`KV_REST_API_TOKEN`

Cloudflare、GitHub 与 Vercel 的提醒调用需配置一致的 `CRON_SECRET`，所有真实凭据只放在服务端环境变量或平台 Secrets 中，不提交到仓库

本地开发与云端调度分别配置，启动开发服务器不会自动安装 Windows 计划任务

## 验证

```bash
npm run typecheck
npm test
npm run build
```

提醒专项测试覆盖官方时间变更、赛前与开赛边界、独立去重、失败重试，以及数据源故障
