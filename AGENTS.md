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

## 7. 当前执行入口与提醒边界

- 仓库：`xiong1915/f1-reminder`，main；`app/` / `components/` 是网页，`lib/` / `providers/` 是 Next 服务与数据，`src/` 仍被 Node 提醒与 Edge 引擎使用，不能按“遗留目录”清理。
- 网站网关：根 `cf_worker.js` / `wrangler.toml` 对应 feishu-f1-bot，纯反向代理现有 Vercel 上游；Next 的 app/api/feishu/route.ts 处理飞书机器人请求；根配置无提醒 Cron。独立 `workers/f1-reminder-worker/worker.js` 调用 `src/worker/reminder_edge.js`，其 wrangler.toml 每分钟触发。该嵌套配置已通过 .gitignore 例外纳入本次待提交文件；部署时必须显式选择它，不可误用根网关配置。Vercel `vercel.json` 只含每日 01:00 UTC 数据同步。
- Next `app/api/cron/reminder/`、独立 Worker 和 GitHub `reminder.js` 为不同入口，保持共享 Redis 的跨系统去重及 claim/finish/release 状态协议；赛前与开赛分别去重，超时/未知结果不能标记确定成功；发送时间须经官方赛程核验，失败关闭发送。
- `.github/workflows/weekly-planner.yml` 每周日 04:07 UTC 运行 planner，使用 SCHEDULE_TOKEN 写回计划与工作流，catchup job 可能发真实消息。`f1-reminder.yml` 是心跳/精确时间兜底，会发送并写回 history。保持现有并发组 f1-reminder-execution。
- 禁止把 `node reminder.js`、`node weekly-planner.js`、workflow_dispatch（含 test_mode）、Worker /trigger、提醒 cron API、迁移 history 脚本或根目录 test_*.js 当作安全开发检查。TEST_MODE 会发送真实测试卡片。planner 即使不发送也会改计划文件。
- 安全语法检查：`npm run check`；针对测试：`node ./node_modules/tsx/dist/cli.mjs --test tests/<name>.test.*`（用实际单个扩展名）；门禁：`npm run check` + `npm run quality`。官方时间、cloud-reminder、delivery-state、timing、planner、history、cross-system-dedup、cf_worker 测试按改动范围选择，使用测试桩而非真实 webhook。
- Redis/限流变更按需读取仓库现有 `.agents/skills/upstash-redis-js/SKILL.md` 和 `.agents/skills/upstash-ratelimit-js/SKILL.md`；不重复安装。提醒可靠性审查可复用本机会话提供的 f1-reminder-reliability-audit 技能；其他环境不存在时依照本文件边界执行。

## Codex 开发与交付工作流

- 普通本地修改、依赖按锁文件安装、针对性测试和审查自主完成；先读 `git status --short`、当前分支和远程地址，保护已有修改。按任务最小改动，不顺手重构。
- Windows 使用 PowerShell 7。Node.js 24、npm 11.17.0；有 package-lock.json 时用 `npm ci --ignore-scripts`，不混用 pnpm 锁文件。无 lint 脚本，不臆造 `npm run lint`。
- 开发前核对 package.json、相关源码及适用的嵌套 AGENTS.md。行为修改先补能复现的测试，完成后运行相关测试与类型检查；跨模块或交付前运行 `npm run quality`，失败必须分类和如实报告，不删除断言或放宽门禁以求通过。
- 安全验证必须在不含 .env*、.vercel、.wrangler、生产缓存或生产凭据的临时检出中执行。只保留 PATH 等运行必需变量，清除继承的 Redis、飞书、AI、Supabase、CRON、Vercel、Cloudflare 等凭据；使用内存存储和测试桩。Next build 会自动读取 .env.local，禁止直接在含生产 .env.local 的目录构建或启动服务验证。不得把生产环境变量拉入 CI 或开发环境。
- `npm run dev` 只在隔离环境使用；按界面修改范围核验桌面/移动端、键盘及错误状态。静态源码断言或构建通过不能代替真实交互验收。
- 实质修改后按 `requesting-code-review` 做代码审查，检查 diff、调用方、回归风险与凭据边界；工具不可用时自行审查并明确未做独立审查。收到意见按 `receiving-code-review` 评估；完成前按 `verification-before-completion` 提供本次证据。仅在用户或适用规则明确授权时委派子代理。
- 复用会话已安装 Skills：React/Next.js 用 `vercel-react-best-practices`；界面设计用 `ui-ux-pro-max`，可访问性审查用 `web-design-guidelines`；行为修改用 `test-driven-development`；根因不明用 `systematic-debugging`；复杂跨模块任务才用 `using-superpowers` / `writing-plans`，需要隔离才用 `using-git-worktrees`。仅加载相关 SKILL.md，不新增依赖或复制全部技能。技能不可用应说明并采用等价检查。
- 提交前检查 `git diff --check` 和完整 diff，给出测试结果、变更范围、建议 commit 信息。git add 只暂存当前任务文件，无需重复确认；git commit 必须有用户明确授权，不能把“建立工作流”视为提交许可。
- 推送、创建远程 PR/评论、合并、触发/重跑远程 Actions、部署、真实提醒、修改 secrets/域名/定时器/线上数据都必须先确认。确认应说明准确仓库、分支、目标、影响和主要风险；一次明确授权覆盖同一范围，不反复确认。
- 经授权后采用功能分支 → 推送 → PR → Quality CI → 审查 → 经授权合并到 main → 现有部署链路。推送或 PR 本身可能触发 Vercel Preview；确认推送时必须说明。预览也不得接入生产写服务或发送真实提醒。
- `.github/workflows/quality.yml` 只运行无密钥检查和构建，不部署、不发消息、不写回 Git。不把质量 CI 通过宣称为 branch protection 已生效；远程必须另行核对 required checks 与部署集成。现有自动部署是否等待 CI 必须核实，不能假定先后顺序。
- 发布前重新核对 git SHA、Vercel 项目/团队、Git 集成仓库/生产分支、Cloudflare worker 与 routes。两个本地仓库的 .vercel/project.json 曾指向同一个 f1-race-reminder-cloud 项目；不能按目录名猜部署目标，不运行 vercel link、不重建/迁移服务。Vercel 关联文件只是本地证据，不能证明线上当前关联。
- 保留现有生产环境、域名、所有环境变量、飞书机制与免费基础设施边界。不得输出密钥或从历史会话/日志提取 token；禁止执行 `scripts/deploy_cf_worker.ps1`（旧脚本从历史日志提取凭据）。经明确部署授权后也只能使用正式登录/安全凭据通道与已核对的目标。
- 最终简洁说明改动、实际执行的检查、明确失败/未验证项。区分本地通过、远程 CI、部署成功、调度执行、供应商接受与用户收到。

## Review guidelines

- 提醒变更审查：官方时间失效时是否停止、赛前/开赛边界及补发期限、跨系统共享去重键、发送不确定态、Redis 故障是否会绕过去重、手动与定时并发、计划写回是否覆盖远程修改。
- 网站/机器人变更审查：服务端凭据、SSRF、飞书鉴权、限流、上下文隔离、取消信号与移动端交互。不要将模拟测试通过或飞书接受误报为定时提醒已到达用户。

## 当前发布前待核实事项

- 当前网关使用 new URL(pathname + search, upstream)，双斜杠路径可能被解释为外部 origin，并转发 Cookie/Authorization。现有安全问题尚未修复；涉及网关发布前必须修复并添加本地回归测试，不能仅凭构建通过发布。
- CI 中赛历、事实卡、赛果字段及引用编排测试使用 tests/fixtures/offline-service.mjs 与固定搜索输入；这是合成数据契约测试，不证明现实赛事数据。保留真实上游/线上交互的独立验收边界。其他回退测试仍可能进行无密钥公共网络读取；完整 quality 未通过时停止交付，不跳过测试或降低断言。
- 远程 required checks、Vercel Git 集成、Codex 自动审查是否启用需另行核实；AGENTS.md 与新增 CI 不会自动启用这些平台设置。
- 2026-10-16 只读检查：GitHub main 经典分支保护开启且 enforce_admins=true，但 required_status_checks=null，rulesets 列表为空；后续绑定 Quality checks 需明确授权。
