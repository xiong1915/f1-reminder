# Rule: Circuit System & Vector Assets

## 1. 赛道定位键
- 赛道为准静态元数据，主键必须为 `season + circuitId + layoutId`。
- 严禁使用 `Round -> SVG` 的硬编码对应关系。同一分站换赛道或赛道改布局时，必须由 circuitId / layoutId 决定。

## 2. 真实 SVG 与合规归档
- 赛道资产本地化存储于 `public/circuits/`。
- 严禁运行时向 GitHub 或不可控第三方图床发起请求。
- 编写 `docs/CIRCUIT_ASSETS.md` 记录：数据来源 (Source)、作者 (Author)、许可 (License)、版本 (Version)、获取时间 (Access Date)。
- 必须包含安全清洗：过滤 `script`, `foreignObject`, `onload`, `onclick`, `javascript:`, 外部引用等危险标签。

## 3. 几何结构与渲染组件
- 统一使用 `<CircuitVisual />` 组件渲染。
- 具备多层结构：
  1. Shadow layer (柔和环境投影)
  2. Track bed (赛道路基/外发光底衬)
  3. Main line (赛道主线条，矢量路径清晰)
  4. Accent / DRS zones (特色发车位与主要弯道标线)
  5. Start / Finish marker (起终点标记)
- 严禁使用通用的抽象圈作为占位图 (No generic placeholder fallback)。

## 4. 自动化完整性校验 (Circuit Integrity Gate)
- 执行 `tests/circuit-integrity.test.*`：
  - 自动遍历 2026 赛季所有赛历中的 `circuitId`。
  - 验证 SVG 文件真实存在，尺寸合理，具有合法 `viewBox`。
  - 计算各赛道 SVG 路径几何哈希，验证 24 站赛道几何图形互不相同（防同一图重复套用）。
