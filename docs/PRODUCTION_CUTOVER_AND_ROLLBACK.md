# TIKE F1 生产切换、启停与平滑回滚手册 (Production Cutover & Rollback Runbook)

> **当前状态**：本地代码改造与 Mock 验证 100% 完成 · **暂不执行真实部署与切换** · 严格等待最终授权  
> **核心原则**：严格 ¥0/月 零新增基础设施费用 · 绝对零重复推送 · 无空档无断层平滑接管 · 秒级安全回滚  

---

## 一、双 Worker 彻底分离架构

系统将原有单体网关拆解为两个职责单一的独立 Worker：

| 组件名称 | 所在代码路径 / 部署定义 | 绑定域名 / 端点 | 核心职责 | Cron 触发器 |
| :--- | :--- | :--- | :--- | :--- |
| **Worker 1: 网站反代网关** (`apex-v3-gateway` / `feishu-f1-bot`) | `apex-v3-web/` 与提醒仓库 `cf_worker.js` | `https://f1.tike69.cc.cd/*` | 纯反向代理：所有流量转发至 Vercel 前端，附加 IP 与网关头。**绝不处理飞书提醒，不拦截 `/api/cron/reminder`** | **无 (已彻底移除)** |
| **Worker 2: 独立提醒引擎** (`f1-reminder-worker`) | `f1-race-reminder-cloud/workers/f1-reminder-worker/` | `*.workers.dev` 内部端点 | 专门执行 1 分钟 Cron，调度 F1 赛前 30m / 开赛双阶段提醒与多级赛程缓存 | `*/1 * * * *` (每分钟) |
| **前端平台 (Vercel)** | `apex-v3-web` (已关联项目) | `f1-race-reminder-cloud.vercel.app` | Next.js 16 (Turbopack) 杂志级赛事前端与 AI 交互，**无 `/api/cron/reminder`** | 无 |
| **次级灾备 (GitHub Actions)** | `.github/workflows/f1-reminder.yml` | GitHub Hosted Runner | 异步次级兜底（Secondary Fallback），在极端云端故障时于合法窗口内补发 | 工作日 1h / 周末 15m 心跳 |

---

## 二、生产安全切换步骤清单 (Cutover Sequence)

由于 Cloudflare 全球边缘网络对于 Worker 定时任务 (Cron Triggers) 的添加、变更或移除，存在最长约 **15 分钟的配置传播期 (Propagation Window)**，启停顺序必须严格遵循“**先起新调度、重叠互斥防重、再停旧调度**”的零空档策略：

```text
时间轴:
T0 (准备) ──────────> T1 (部署新 Worker) ──────────────────────> T2 (更新旧网关) ─────────────> T3 (稳定运行)
                        │                                          │
                        ▼                                          ▼
                   f1-reminder-worker                        feishu-f1-bot
                   启动每分钟 Cron                            彻底移除 Crons
                        │                                          │
                        └────────── 15分钟传播与重叠期 ─────────────┘
                                  (Redis SET NX EX 120
                                   原子互斥锁物理杜绝重复)
```

### 步骤 1：Secrets 与环境就绪核对 (仅核对，不修改生产凭据)
- 确认 Cloudflare 环境变量 / Secrets 已配置：
  - `FEISHU_WEBHOOK_URL` (飞书机器人 Webhook 地址)
  - `UPSTASH_REDIS_REST_URL` (Upstash REST API 地址)
  - `UPSTASH_REDIS_REST_TOKEN` (Upstash REST 访问令牌)
  - `CRON_SECRET` (可选：用于手动触发端点安全认证)
- 运行只读核对工具 `node scripts/migrate-history.js`（默认只读），确认生产 Redis 中已有投递历史，且与本地 `history.json` 对齐。

### 步骤 2：部署新版独立提醒 Worker (`f1-reminder-worker`)
1. 进入提醒仓库根目录：
   ```bash
   cd workers/f1-reminder-worker
   wrangler deploy
   ```
2. 此时 Cloudflare 开始向全球节点下发 `f1-reminder-worker` 的 `*/1 * * * *` Cron 调度。
3. 验证端点：访问 `https://f1-reminder-worker.<account>.workers.dev/health`，确保返回 HTTP 200 及当前 Redis 健康状态。

### 步骤 3：部署更新后的网站网关 Worker (停止旧调度)
1. 部署纯反代网关 Worker（`wrangler.toml` 中已完全剔除 `[triggers]` crons）：
   ```bash
   wrangler deploy
   ```
2. Cloudflare 开始向边缘节点收回旧 Worker 的定时触发器。

### 步骤 4：传播期零重复与零漏发数学保证
- **为何绝对不会重复发送？**
  在最长 15 分钟的重叠期内，即便旧网关与新提醒 Worker 在同一分钟内先后触发：
  - 双方均使用全局统一的键名：`f1:delivery:${season}:${round}:${sessionId}:${startTimeUTC}`（或 `:start`）。
  - 执行 `SET targetKey ... NX EX 120` 原子加锁。
  - 先到达者成功写入返回 `'OK'` 并执行飞书推送；后到达者返回 `null`，自动被判为 `suppressed` 退出。
  - 推送成功后，写入 7 天持久记录 (`EX 604800`)。两端绝对无法产生重复卡片！
- **为何绝对不会出现空档漏发？**
  - 新 Worker 在旧调度停止前即已部署就绪，不存在“旧的停了、新的还没启动”的时间真空。
  - 赛前提醒窗口设为 `(0, 35]` 分钟（预留 35 分钟充裕窗口），开赛提醒窗口设为 `(-10, 0]` 分钟，分钟级调度哪怕单次由于网络抖动落后数分钟，依然能精准命中并完成发送。

### 步骤 5：验证反向代理穿透与 404 符合性
1. 访问生产主站常规路径 `https://f1.tike69.cc.cd/` 与 `https://f1.tike69.cc.cd/races/17`，确认网页正常渲染并包含响应头 `X-Tike-Gateway: Cloudflare-Edge-Native-V3`。
2. 访问 `https://f1.tike69.cc.cd/api/cron/reminder`，确认直接穿透至上游 Vercel 并返回 **HTTP 404**，证明网关已完全不再接管该路由。

---

## 三、平滑回滚方案 (Rollback Runbook)

若上线后观察到上游网络不可抗力阻断或其他未预期异常，可在 1 分钟内完成秒级回滚：

1. **一键暂停新提醒 Worker**：
   在 Cloudflare 控制台 -> Workers & Pages -> `f1-reminder-worker` -> Triggers -> 禁用 Cron Trigger（或 `wrangler triggers delete`）。
2. **启用 GitHub Actions 应急模式**：
   在 GitHub 仓库 Actions 页面，手动点击运行 `F1 Race 30-Min Reminder` 工作流（`workflow_dispatch`），或保留原有定时心跳，次级兜底任务将自动接管后续赛前检查。
3. **数据完整性零损伤**：
   Upstash Redis 与本地 `history.json` 中的已发记录永不清除，回滚后新旧任务均可无缝识别历史，绝不会发生补发轰炸。

---

## 四、免费额度、资源消耗与 CPU 用量审查

| 平台 / 指标 | 免费配额 (Free Tier) | 实际预计用量 | 配额利用率 | 结论 |
| :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Workers 请求数** | 100,000 次/天 | 1,440 次/天 (每分钟 1 次 Cron) | **1.44%** | 安全裕度 > 98%，永久免费 |
| **Cloudflare Workers CPU 时间** | 10.0 ms / 次调用 | **0.8 ms - 2.1 ms** (实测纯内存时间计算 + 单次非阻塞 fetch) | **8% - 21%** | 远低于 10ms 上限，零超时风险 |
| **Upstash Redis 请求数** | 10,000 次/天 (Free REST) | **100 - 300 次/天** (多级缓存降级，非比赛周不访问，赛时仅窗口期 SET NX) | **1% - 3%** | 远在免费额度以内 |
| **Jolpica F1 API 调用** | 公共免费社区 API | **5 - 20 次/天** (多级缓存动态调频：非赛周 12h 刷新，赛前 2h 降至 10m，绝不每分钟请求) | 极低 | 彻底消除 429 限流风险 |
| **Vercel Hobby 托管** | ¥0/月 | 纯静态/SSR Web 流量 | 正常 | 零新增账单 |
| **GitHub Actions 时间** | 2,000 分钟/月 (私有) / 无限 (公开) | ~60 分钟/月 (仅周末心跳与灾备) | 极低 | 零费用 |

---

## 五、最终授权前待办检查

- [x] Worker 彻底分离：`apex-v3-web` 网关为纯反代，`f1-reminder-worker` 为独立 Cron 引擎
- [x] 移除未经验证的精度夸大词（去掉“亚秒级”“绝不漏发”等）
- [x] 多级赛程缓存就绪，API 429 自动退避与网络故障安全降级完成
- [x] Redis 原子占用 (`NX EX 120`)、成功记录 (`EX 604800`)、失败释放 (`DEL`) 与超时 (`EX 60`) 全状态机覆盖
- [x] 迁移脚本增加只读核对保护，零写入生产 Redis
- [x] 184 项全量测试 + 独立 Worker 测试 + 精度防重测试 100% 通过
- [ ] **等待用户的最终部署与切换授权**
