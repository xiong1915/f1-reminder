# APEX V3 — 5-Phase Engineered Autonomous Workflow

本文档定义 APEX V3 走向 Production Ready 的五阶段串行工作流。每个阶段必须通过其对应的 Quality Gate 才能进入下一阶段。

```text
PHASE 1: Production Topology
       │ (Quality Gate 1 PASS)
       ▼
PHASE 2: Race Domain + Circuit
       │ (Quality Gate 2 PASS)
       ▼
PHASE 3: Liquid Glass + Responsive
       │ (Quality Gate 3 PASS)
       ▼
PHASE 4: APEX AI
       │ (Quality Gate 4 PASS)
       ▼
PHASE 5: Robustness + Final QA (Quality Gate 5 PASS)
       │
       ▼
   Production Ready
```

---

## 阶段加载规则矩阵 (Context Isolation)

禁止一次性在上下文加载全部规则，每个阶段只加载最小集合：

| 阶段 | 必须加载的规则与文件 |
| :--- | :--- |
| **PHASE 1** | `AGENTS.md` + `docs/agent/WORKFLOW.md` + `docs/agent/quality-gates.md` |
| **PHASE 2** | `AGENTS.md` + `rules/data-and-race-state.md` + `rules/circuits.md` + `quality-gates.md` + `STATE.md` |
| **PHASE 3** | `AGENTS.md` + `rules/design-and-glass.md` + `rules/responsive-and-performance.md` + `quality-gates.md` + `STATE.md` |
| **PHASE 4** | `AGENTS.md` + `rules/ai.md` + `rules/data-and-race-state.md` + `quality-gates.md` + `STATE.md` |
| **PHASE 5** | `AGENTS.md` + `quality-gates.md` + `STATE.md`（按需仅在失败定位时临时加载领域规则） |

---

## 执行行为守则 (Local Autonomous + Production Gate)

1. **本地与 Preview 阶段完全自主执行**：
   - 读取、搜索、编辑、创建文件、安装必要依赖、构建、单元测试、端到端测试、Playwright、无头浏览器、截图、性能剖析、静态扫描。
   - 不逐步询问用户，持续推进至阶段门禁。

2. **生产栅栏（请求明确授权）**：
   - `git commit` / `git push`
   - 正式 Production Deployment（对影响生产流量的操作）
   - 正式 DNS 记录修改
   - 删除生产数据、修改生产 Secrets
   - 不可逆付费或外部写操作
   - **注意**：遇到生产操作时，将对应条目标记为 `WAITING FOR USER APPROVAL`，但不阻断本地开发与本地验收！

3. **短期记忆管理**：
   - 每完成一个关键任务，立即更新 `docs/agent/STATE.md`。
   - 依赖测试与脚本进行确定性判定，严禁依赖人工或模型肉眼记忆。
