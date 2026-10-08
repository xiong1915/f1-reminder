# Rule: Design System & Liquid Glass Specifications

## 1. 材质定位与语义
- **Liquid Glass 是功能材质**：仅用于浮层、导航条 (`GlassNav`)、AI 输入框 (`GlassComposer`)、浮动操作按钮 (`GlassButton`)、弹出卡片 (`GlassPopover`/`GlassSheet`)、Tab 切换栏。
- **内容本体保持 Solid Editorial**：积分榜单、分站成绩详情、车手与车队名录、赛道详细参数等数据载体，保持 solid 高对比度深色/浅色杂志化排版，严禁整页全覆盖毛玻璃导致可读性崩塌。

## 2. 组件库规范
- 统一收敛为标准组件：
  - `<GlassSurface variant="subtle|elevated" />`
  - `<GlassButton variant="primary|ghost" />`
  - `<GlassNav />`
  - `<GlassComposer />`
  - `<GlassPopover />`
  - `<GlassSheet />`
- 严禁业务页面零散编写私有 `backdrop-filter: blur(...)` 类名。

## 3. 物理降级 (Physical Degradation)
- 当视口 <= 768px，或检测到 `@media (prefers-reduced-transparency: reduce)`，或设备为低性能状态时：
  - 自动禁用或大幅减小 backdrop-filter 模糊半径（<= 4px 或透明纯色）。
  - 移除 pointer specular 随动高光与动态重绘。
  - 使用静态高对比度边框与低功耗阴影。
  - 确保 Usability > Glass Fidelity。
