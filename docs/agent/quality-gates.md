# APEX V3 — Quality Gates Specification

本文档定义各阶段门禁检查标准及统一门禁执行命令。

---

## 统一门禁命令

在 `package.json` 中定义并保证单命令串联执行：
```bash
npm run quality
```
包含顺序：
1. `npm run check:copy` (消费者文案与禁止词扫描)
2. `npm run check:dates` (日期时间格式与异常值扫描)
3. `npm run typecheck` (`tsc --noEmit`)
4. `npm run test` (单元与集成测试，涵盖 RaceState、Circuit Integrity、LKG、AI Tools、Feishu)
5. `npm run build` (Next.js Turbopack 编译)
6. E2E / 自动化路由指纹扫描 (`node scripts/check-production-routing.mjs`)

**任何一项失败，必须立即退出 (`exit 1`)，不得跳过或伪报 PASS。**

---

## 阶段门禁细则 (Phase Gates)

### Phase 1 Gate (Production Topology)
- [ ] Next.js 统一响应头包含 `X-APEX-Build`
- [ ] `/system` 页面展示当前 Build Fingerprint，消费者页面不直接暴露内部构建细节
- [ ] `scripts/check-production-routing.mjs` 对 `/`, `/ai`, `/races`, `/standings`, `/drivers`, `/teams`, `/system` 循环请求验证完成
- [ ] 判定是否存在多个 Build 混流或 Legacy HTML 串流
- [ ] `typecheck PASS`, `build PASS`

### Phase 2 Gate (Race Domain + Circuits)
- [ ] 全站统一切入 `RaceStateService` (覆盖 `UPCOMING_WEEKEND`, `SESSION_UPCOMING`, `SESSION_IN_PROGRESS`, `SESSION_FINISHED`, `RACE_FINISHED`, `WEEKEND_FINISHED`)
- [ ] 倒计时算法严格为 `Math.max(0, targetTimestamp - Date.now())`，边界测试覆盖 T-1d, T-1h, T-1s, T=0, T+1s
- [ ] 赛历动态计算 `calendar.length`，严禁硬编码总场数；Round 不是唯一键，采用 `season + meetingId + circuitId`
- [ ] 赛道注册表 `lib/circuits/registry.ts` 通过 `season + circuitId + layoutId` 索引
- [ ] 24 站赛道真实 SVG 本地化至 `public/circuits/`，清洗危险标签，无外部网络请求
- [ ] `tests/circuit-integrity.test.*` 自动化校验覆盖率 100%、viewBox 合法性、SHA-256 防碰撞
- [ ] 统一 `<CircuitVisual />` 组件，无 generic placeholder 降级

### Phase 3 Gate (Liquid Glass + Responsive)
- [ ] 组件库收敛为 `GlassSurface`, `GlassButton`, `GlassNav`, `GlassComposer`, `GlassPopover`, `GlassSheet`
- [ ] 数据本体 (Standings/Results/Driver/Race) 保持 solid/editorial 纯粹质感，非默认全毛玻璃
- [ ] 移动端 (viewport <= 768px)、Reduced Transparency、低性能环境下自动物理降级 (低/无 blur、静态边框、轻阴影)
- [ ] 视口真机/无头检查：Desktop (1280, 1440, 1728, 1920), Tablet (600, 768, 820, 1024), Mobile (375, 390, 430)
- [ ] 0 横向溢出，支持 100dvh 与安全区
- [ ] `scripts/check-copy.mjs` 扫描消费者界面，0 禁用营销词，0 `Invalid Date`, 0 `NaN`, 0 `undefined`

### Phase 4 Gate (APEX AI)
- [ ] 前端统一 AI 状态机 (idle, composing, submitting, streaming, completed, error, aborted, rate_limited, offline)
- [ ] Desktop `Enter` 发送 / `Shift+Enter` 换行，支持 `compositionstart`/`compositionend` 避免中文 IME 误发送
- [ ] 流式 SSE 解析兼容分片、多帧、UTF-8 边界
- [ ] Send 动态切换为 Stop，AbortController 信号贯通浏览器到后端 DeepSeek 请求
- [ ] 错误保留已生成上下文，提供手动 Retry / Regenerate
- [ ] F1 事实快通道 (Fast Path)：下一站、积分、成绩等由 Canonical F1 Core 直出结构化卡片，模型不可幻觉覆盖
- [ ] 领域隔离：通用问题绝不主动强行关联 F1
- [ ] 移动端 390x844 软键盘弹起时输入框常驻可见

### Phase 5 Gate (Robustness & Final QA)
- [ ] 故障注入测试：Jolpica 超时、OpenF1 超时、Redis 故障、DeepSeek 故障、Search 故障全部可平滑降级
- [ ] Chrome / Edge 真实渲染审计
- [ ] Console 检查：0 Hydration mismatch, 0 React key warning, 0 Uncaught error
- [ ] Network 检查：0 非预期 404/500/502/CORS
- [ ] `npm run quality` 单命令全量绿灯
