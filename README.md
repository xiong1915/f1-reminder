# TIKE V3 · Formula 1 Data + Intelligence Platform

TIKE V3 是一级方程式赛车新一代高精度数据与赛事智能中枢。基于 **Next.js (React 19 + TypeScript App Router)** 现代化架构，集实时分站倒计时、车手与车队积分榜、确定性争冠推演、自适应 AI 核心与飞书机器人集成于一体，并严格遵循 **¥0/月 零付费基础设施原则**。

---

## ✨ 核心亮点

- **Apple 级数字产品设计**：Dark Editorial / Motorsport Precision 赛车杂志视觉语言，段落色彩节奏（深浅交替），Tabular Numbers 高精度排版，拒绝廉价 AI 模板与浮夸霓虹灯效。
- **解耦的 AI Provider 体系**：
  - 统一 `AIProvider` 接口与 `ProviderRegistry`；
  - 默认采用 **DeepSeek AI**（支持 `chat-completions` 与 `responses` 双接口风格）；
  - 通用 OpenAI-Compatible 与 Custom Provider 随时按需无缝接入；
  - 严格服务端凭据保护（Server-Only），内置滑动窗口防刷限流与 Token 成本保护；
  - 显式 Fallback 策略（默认 `none`，杜绝调用未确认的收费模型）。
- **权威 F1 Canonical 数据层**：
  - 统一调用 Jolpica (Ergast-compatible) 与 OpenF1 免费接口；
  - Zod 运行时 Schema 校验与清洗转换，杜绝前端组件硬编码赛事事实；
  - 统一 UTC 时间体系，自动换算为北京时间 (UTC+8)；
  - 基于高精度时间戳的毫秒级无漂移倒计时引擎。
- **全免费实时新闻搜索**：
  - 优先调用 GDELT 全球公开新闻与官方 RSS 流，0 成本实时检索，可选 Tavily 增强。
- **飞书开放平台机器人集成**：
  - 与 Web 端共享相同的 `AIOrchestrator` 与意图路由；
  - 具备 URL 握手校验、私聊/群聊按人隔离、话题帖隔离、交互式卡片与防重幂等机制。
- **多端全响应式设计**：
  - 完美适配 Desktop (1440/1920) 与 Mobile (375/390/430)。

---

## 🛠️ 本地开发与构建

### 1. 环境准备
- Node.js >= 18.0.0
- pnpm 或 npm

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
```bash
cp .env.example .env.local
```
编辑 `.env.local` 填入您的 `DEEPSEEK_API_KEY`（以及可选的 `FEISHU_APP_ID`, `FEISHU_APP_SECRET`）。

### 4. 启动本地开发服务器
```bash
npm run dev
# 或 pnpm dev
```
访问 `http://localhost:3000` 即可在本地浏览器体验 TIKE V3。

### 5. 执行类型检查与生产构建
```bash
npm run typecheck
npm run build
```

### 6. 执行自动化测试套件
```bash
npm test
```

---

## 📁 项目架构

详情请参阅 [ARCHITECTURE.md](docs/ARCHITECTURE.md) 与 [AI_PROVIDERS.md](docs/AI_PROVIDERS.md)。

```text
app/                 Next.js App Router 页面与 API
components/          可复用 UI 组件 (Countdown, CircuitSvg, AISearchBox 等)
lib/
  f1/                F1 Canonical 领域模型、时间系统与积分推演
  ai/                AI 接口、注册表、服务门面与编排器
  cache/             零成本内存 TTL 缓存与 2026 兜底数据
  session/           会话状态与多用户/话题隔离存储
  search/            GDELT / RSS 免费新闻检索
  feishu/            飞书 OpenAPI 客户端、卡片与事件调度
providers/
  f1/                Jolpica / OpenF1 / F1Service
  ai/                DeepSeek / OpenAI-Compatible / Custom Providers
docs/                架构与 AI Provider 配置技术文档
```
