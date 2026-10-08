# TIKE V3 核心系统架构文档 (Architecture)

## 1. 架构总览

TIKE V3 定位为 **Formula 1 Data + Intelligence Platform**，基于现代化 Next.js (React 19 + TypeScript App Router) 构建，保持 ¥0/月 零基础设施费用原则。

```text
                      User / Client
                            │
                            ▼
                     Next.js Gateway
              (App Router / Server Components)
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
      F1 Core            TIKE AI             Feishu
   (Data Layer)      (AI Provider Layer)    (Webhook)
          │                 │                  │
    ┌─────┴─────┐      ┌────┴────┐             │
    ▼           ▼      ▼         ▼             ▼
 Jolpica     OpenF1 DeepSeek   OpenAI     SessionStore
    │           │     API      Compatible (Thread/User)
    └─────┬─────┘      │         │             │
          ▼            └────┬────┘             ▼
      CacheStore            ▼              Cards Builder
      (TTL/Memory)       AI Tools          (Interactive)
                            │
                            ▼
                      Search Engine
                     (GDELT / RSS)
```

---

## 2. 核心模块与职责划分

### 2.1 F1 Canonical Domain (`lib/f1` & `providers/f1`)
- **Canonical 模型**：定义 Season, Meeting, Session, Driver, Team, DriverStanding, ConstructorStanding, RaceResultSummary。
- **Zod 校验**：对所有第三方 API (Jolpica, OpenF1) 返回结构进行严格 Schema 运行时校验。
- **时间系统**：内部统一采用 UTC ISO-8601，展现层统一通过 `Intl.DateTimeFormat` (Asia/Shanghai) 转为北京时间，杜绝夏令时与设备本地偏差。
- **倒计时算法**：基于 `targetTimestamp - Date.now()` 动态计算，秒数通过 `Math.floor((diff % (1000 * 60)) / 1000)` 精确到 0..59，客户端单调递减无漂移。
- **争冠推演**：确定性数学模型 (`simulateTitleScenario`)，用于实时推演各分站得分情景。

### 2.2 AI Provider Layer (`lib/ai` & `providers/ai`)
- **解耦业务与模型**：所有业务仅面向 `AIService.generate` 或 `AIService.stream`，底层模型通过 `ProviderRegistry` 动态解析。
- **默认 DeepSeek**：通过 `DEEPSEEK_API_KEY` 注入，支持 `chat-completions` 与 `responses` 双接口风格。
- **OpenAI 兼容**：支持 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`，随时平滑对接任意外部模型。
- **成本与限流**：内置滑动窗口限流器 (`AI_RATE_LIMIT`)、最大输出 Token (`AI_MAX_OUTPUT_TOKENS`)、最大上下文轮数 (`AI_MAX_HISTORY_MESSAGES`)。
- **意图路由 (`AIOrchestrator`)**：
  - `F1_FACTUAL`：强制以 F1 Canonical 数据为事实源，禁止模型幻觉编造当前分站事实。
  - `F1_ANALYSIS`：结合赛车工程学与战术策略分析。
  - `F1_NEWS`：注入 GDELT / RSS 实时检索要闻并标注数据溯源。
  - `GENERAL`：保持领域隔离，用户不提及赛车时绝不主动引入 F1 话题。

### 2.3 零成本搜索引擎 (`lib/search`)
- **首要免费源**：GDELT DOC API (全球免费、免 API Key)。
- **降级免费源**：官方要闻 RSS 流。
- **可选增强**：Tavily API (仅在环境变量存在时使用)。

### 2.4 飞书集成 (`lib/feishu`)
- 与 Web 端共享相同的 `AIOrchestrator`。
- 保留私聊、群聊按人隔离 (`chat:{id}:user:{id}`)、话题帖隔离 (`thread:{rootId}`)。
- 卡片按钮包含「各节时间」、「2026 赛历」、「清空上下文」。
- 具备完整的 URL 握手校验与 600 秒防重幂等机制。

### 2.5 缓存与状态 (`lib/cache` & `lib/session`)
- 默认采用基于 TTL 的内存缓存 (`MemoryCacheStore`) 与会话存储 (`MemorySessionStore`)，实现零费用、零外部运维负担。

---

## 3. 安全要求

1. 所有的 API Key、Secret、Token 仅在服务端可用（Server-Only），绝对禁止通过 `NEXT_PUBLIC_*` 暴露或返回至客户端。
2. `/system` 遥测页面仅展示状态、延迟与模型名称，绝对不展示任何敏感凭据。
