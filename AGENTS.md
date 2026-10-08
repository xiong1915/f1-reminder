# APEX V3 — Global System Invariants

## 1. 核心架构与边界原则
- **架构不变**：严格保持现有 Next.js (App Router) + React 19 + TypeScript + Vercel + Jolpica + OpenF1 + DeepSeek + Upstash Redis + Feishu 架构。
- **禁止 APEX V4**：严禁重构新版本或引入其他前端/全栈框架。
- **环境隔离与凭据安全**：所有密钥、Token 仅服务端运行，禁止客户端暴露。严格遵守 ¥0/月 零新增基础设施费用原则。

## 2. F1 竞赛事实分层与状态管理
- **动态竞赛事实只来自 Canonical Data Layer**：赛历、分站、Session、积分、排名、比赛结果、最快圈、新闻等，严禁在 UI 中硬编码。
- **事实数据降级链路**：
  $$\text{Live Provider} \longrightarrow \text{Cache} \longrightarrow \text{Last Known Good (LKG)} \longrightarrow \text{Unavailable}$$
- **静态设计资产允许版本化内建**：赛道拓扑几何、SVG 轮廓、中英文名称映射、设计 token、静态赛车规则结构，必须附带来源、版本、许可协议及赛季适用性。
- **时间系统**：所有赛事内部时间绝对统一使用 UTC ISO-8601。展示层默认统一通过 Asia/Shanghai 规整为北京时间，使用统一 Formatter，禁止组件自行格式化产生重复单位或 Invalid Date。
- **统一赛事状态**：全站所有页面（首页、赛历、详情、倒计时、AI）共用统一的 `RaceStateService`，禁止局部自行推断状态。

## 3. 赛道视觉与资源系统
- **主键解析**：所有赛道资产与元数据仅通过 `season + circuitId + layoutId` 检索。严禁使用 `Round -> SVG` 的脆弱映射。
- **真实资产**：所有赛道 SVG 必须具备合规许可且本地化（`public/circuits/`），严格清洗去除危险标签（script/foreignObject/事件监听），通过自动化哈希防碰撞测试。

## 4. AI Provider 与交互规范
- **默认模型**：DeepSeek (`deepseek-chat`) 为主推理引擎。
- **费用防护**：`AI_FALLBACK_PROVIDER=none`，严禁主模型失败时私自调用未经确认的收费模型。
- **事实快通道**：F1 确定性事实由 Canonical Core 优先响应，严禁模型幻觉覆盖事实。通用领域问题严格保持领域隔离，不主动注入 F1 话题。
- **全链路中断**：前端 Abort 必须真实贯通至 Node/Edge AbortSignal 及后端流式请求。

## 5. 设计系统与视口适配
- **克制材质**：Liquid Glass 是功能材质（导航、输入框、控制浮层、弹出层），不是内容容器的默认底色。数据内容本体保持 solid/editorial 杂志排版。
- **物理降级**：移动端 (viewport <= 768px)、开启 Reduced Transparency 或低性能环境时，强制降级为低/无 blur、静态边框与低阴影，Usability > Glass Fidelity。
- **多端平权**：Desktop / Tablet / Mobile 同等重要，杜绝横向溢出与软键盘遮挡。

## 6. 自动化质量门禁
- **客观验证**：确定性规则必须落入测试、lint 与静态扫描脚本。
- **诚实度**：验证失败必须修复，不得伪报 PASS；未实际验证的项目必须标明 NOT VERIFIED。
