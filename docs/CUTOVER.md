# TIKE V3 生产切换与平滑回滚手册 (Production Cutover & Rollback Runbook)

> **版本**：TIKE V3.0.0 (Phase 2 Production Hardened)  
> **当前状态**：生产就绪 (Production Ready) · 待授权切换  
> **生产域名**：`https://f1.tike69.cc.cd/`  
> **核心原则**：严格零付费基础设施 (¥0/月) · 零停机平滑切换 · 秒级可恢复回滚  

---

## 一、架构升级概述

本项目已完成从单文件 Cloudflare Worker 到企业级现代化全栈架构的完整演进：

```text
[旧版 Legacy Worker]                      [TIKE V3 现代化生产架构]
单文件 cf_worker.js (2500+行)      →     Next.js 16 (Turbopack) + React 19 + TypeScript
原生 HTML 字符串拼接                →     杂志级 Editorial 语义化响应式组件 (Dark/Light 双主色)
硬编码车手积分与赛程事实            →     Jolpica/OpenF1 实时链路 + Last Known Good (LKG) 权威快照
易漂移的前端倒计时                  →     毫秒级 UTC 对齐时间引擎 (Intl Asia/Shanghai 规整)
单体内存/KV 弱一致性                →     统一抽象存储层 (Upstash Redis Free REST + 内存降级)
模型断流继续跑 Token                →     全链路 AbortController 信号取消与白名单 Tools 保护
```

---

## 二、生产环境变量清单 (Environment Variables Checklist)

在部署平台（如 Vercel）的环境变量设置中注入以下键值：

| 变量名 | 必填 | 默认推荐值 | 说明 |
| :--- | :---: | :--- | :--- |
| `AI_PROVIDER` | 是 | `deepseek` | 保持 DeepSeek 为唯一默认提供者 |
| `DEEPSEEK_API_KEY` | 是 | 用户自有 `sk-...` | 您的 DeepSeek 官方 API 密钥 (零新增费用) |
| `DEEPSEEK_BASE_URL` | 否 | `https://api.deepseek.com` | DeepSeek 官方 API 地址 |
| `DEEPSEEK_MODEL` | 否 | `deepseek-chat` | 生产推理模型 |
| `STORAGE_PROVIDER` | 否 | `redis` 或留空 | 留空时若配置了 Upstash 变量则自动启用 Redis，否则自动回退为 In-Memory |
| `UPSTASH_REDIS_REST_URL` | 否 | `https://...upstash.io` | Upstash Redis Free 实例 REST URL (每日 10,000 次请求免费额度) |
| `UPSTASH_REDIS_REST_TOKEN` | 否 | `...` | Upstash Redis Free REST Token |
| `FEISHU_APP_ID` | 否 | `cli_...` | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 否 | `...` | 飞书应用 App Secret |
| `AI_RATE_LIMIT` | 否 | `30` | 客户端防刷限流阈值 (每分钟最多 30 次请求) |

> **安全红线**：所有 API Key、Secret 与 Token 仅在服务端 API Route 和 Server Component 中运行，杜绝以 `NEXT_PUBLIC_` 前缀暴露至浏览器端。

---

## 三、部署目标平台操作指南

### 方案 A：Vercel 免费版 (Hobby Plan · ¥0/月 · 当前已就绪)

1. **项目关联**：已关联至 Vercel 项目 `tike1/f1-race-reminder-cloud` (Project ID: `prj_fDmAKqBAtN8V6GclA27HOW2eKbga`)。
2. **Preview 部署信息**：
   - **Deployment ID**: `dpl_BmgM63uYBAt99yCFvFwHMCKRJacc`
   - **Live Preview URL**: `https://f1-race-reminder-cloud-50yw74na2-tike1.vercel.app`
3. **真实运行时状态**：
   - **Storage**: Upstash Redis Free (`apex-f1-redis`, Region: `sin1`, `autoUpgrade=false`, 状态: `Persistent: true`, SET NX 原子防重)
   - **AI Provider**: DeepSeek AI (`deepseek-chat`, 全双工流式输出, 引用来源溯源)
   - **F1 数据层**: Jolpica Live 2026 赛季 (23 站全动态赛历, 实时分差计算, Round 17 Marina Bay 倒计时)
   - **前端质量**: Chrome 浏览器截图验收完毕, Desktop & Mobile 视觉无横向溢出, Console 0 报错, Network 0 异常。
4. **自动化验收**：16 项全栈端到端指标 100% 通过 (16/16 PASS)。

---

## 四、零停机 DNS 切换步骤 (Zero-Downtime DNS Cutover)

在确认 Preview 网站各项功能 100% 验收通过后，执行主域名切换：

1. 打开 **Cloudflare 控制台** → 进入 `tike69.cc.cd` 域名的 DNS 解析设置。
2. 找到 `f1` 的主机记录（即 `f1.tike69.cc.cd`）：
   - 将现有 Worker 路由或 A/CNAME 记录修改为：
     - 类型：`CNAME`
     - 名称：`f1`
     - 目标 (Target)：`cname.vercel-dns.com` (若使用 Vercel)
     - 代理状态：开启橙色云朵 (Proxied) 或直通 (DNS only)。
3. 在 Vercel 项目的 **Settings → Domains** 中添加 `f1.tike69.cc.cd`。
4. 证书验证与生效时间通常在 60 秒以内，期间无缝平滑迁移，无任何服务中断。

---

## 五、飞书开放平台 Webhook 端点校准

切换域名后，检查飞书开放平台的配置：

1. 进入 **飞书开放平台** → 对应机器人应用 → **事件与回调**。
2. 配置请求网址 (Request URL)：
   - `https://f1.tike69.cc.cd/api/feishu`
3. 点击“保存”，系统将向 `/api/feishu` 发送 `challenge` 握手请求。
4. TIKE V3 已原生支持 `url_verification`，将毫秒级返回对应 challenge，握手即时成功。
5. 飞书卡片回调（`action: reset_context`, `action: f1_session_times` 等）均与新架构无缝匹配。

---

## 六、秒级回滚方案 (Rollback Runbook)

若上线后遇到不可预期的上游网络阻断或其他严重缺陷，可随时执行**秒级平滑回滚**：

1. **原 Worker 代码保留**：仓库内的 `cf_worker.js` 及历史提醒逻辑完整留存，未被破坏或覆写。
2. **DNS 一键切回**：
   - 登录 Cloudflare DNS 控制台。
   - 将 `f1.tike69.cc.cd` 的 CNAME 记录恢复指向原 Cloudflare Worker（或在 Cloudflare Workers 路由中重新启用 `f1.tike69.cc.cd/*`）。
3. **回滚耗时**：预计生效时间 `< 30 秒`。
4. **数据安全**：旧版 Cloudflare KV 命名空间与历史状态未做任何删除操作，随时可读。

---

## 七、数据一致性与健康度验收矩阵

| 检验项 | 预期现象 | 验证途径 |
| :--- | :--- | :--- |
| **首屏赛事** | 动态显示当前分站（如 Singapore / Marina Bay） | 访问首页 `GET /` |
| **精准倒计时** | 基于 UTC 绝对毫秒戳运算，无抖动、无漂移 | 首页 Hero 右侧卡片 |
| **赛历与场次** | 动态读取 `calendar.length`（如 23 站），不再硬编码 24 | 访问 `/races` 与首页底部 |
| **日期格式** | 标准干净输出（如 `10月09日 周五 20:00`），无重复汉字 | 全局卡片与赛程 |
| **LKG 离线容灾** | 上游不可用时读取真实快照，若无则标注不可用，绝不编造积分 | 离线测试与 `/system` |
| **AI 意图路由** | F1 问题注入真实事实，通用问题完全隔离 F1 | 访问 `/ai` 对话测试 |
| **Token 保护** | 客户端主动中止请求时服务端立即中断模型 stream | 测试 Client Abort |
| **飞书防重** | 相同 `message_id` 重复推送时原子拦截 | 单元测试 & Webhook 回调 |
| **运营费用** | 包含托管、存储、缓存、检索在内整体维持 ¥0/月 | 全站依赖审计 |
