# Rule: Responsive Design & Performance Specifications

## 1. 视口规格全覆盖
必须保证以下分辨率完整适配，无任何破损与横向滚动条溢出：
- **Desktop**：1280px, 1440px, 1728px, 1920px
- **Tablet**：600px, 768px, 820px, 1024px
- **Mobile**：375px, 390px, 430px

## 2. 移动端核心约束
- **移动端全高**：使用 `100dvh` 避免地址栏伸缩抖动。
- **安全区适配**：配置 `env(safe-area-inset-top)` 和 `env(safe-area-inset-bottom)`。
- **软键盘交互**：在 390x844 / 430x932 下弹起软键盘时，输入框和操作区常驻可见。
- **横向防溢出**：表格、长文字、长 AI 代码块在小屏自动内嵌横向滚动或换行，不得撑开全局 `window`。

## 3. 动效与无障碍
- 动效 Token：`instant` (0ms), `fast` (150ms), `normal` (300ms), `slow` (500ms)。
- 属性限制：优先且主要仅对 `transform` 和 `opacity` 进行 transition / animation，禁止高频重绘 `width`/`height`/`top`/`left`/`blur`。
- `@media (prefers-reduced-motion: reduce)`：禁用所有大型动效和赛道描边动画，直接展示最终状态。
- Core F1 核心数据在无脚本 (No-script / SSR) 状态下可读。
