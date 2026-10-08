// src/render/styles.js
// 统一样式库：Apple 叙事质感 + Motorsport 精密排版 + 纯净黑白章节交替节奏

export const BASE_STYLES = `
:root {
  --black: #000000;
  --graphite: #121214;
  --elevated-dark: #1c1c1f;
  --canvas: #f5f5f7;
  --card-light: #ffffff;
  --white: #ffffff;
  --ink: #1d1d1f;
  --secondary: #6e6e73;
  --race-red: #ff2d20;
  --race-red-subtle: rgba(255, 45, 32, 0.12);
  --line-dark: rgba(255, 255, 255, 0.08);
  --line-light: rgba(0, 0, 0, 0.08);
  --font-sans: -apple-system, BlinkMacSystemFont, "Inter Variable", "Inter", "PingFang SC", "Segoe UI", sans-serif;
  --font-mono: "SF Mono", "Roboto Mono", "Menlo", monospace;
  --gutter: clamp(20px, 4vw, 72px);
  --max-w: 1440px;
  --radius-card: 24px;
  --radius-pill: 999px;
  --ease-apple: cubic-bezier(0.22, 1, 0.36, 1);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background-color: var(--black);
  color: var(--white);
  font-family: var(--font-sans);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
  font-variant-numeric: tabular-nums;
}

a { color: inherit; text-decoration: none; }
button, input, select { font-family: inherit; }

.container {
  width: 100%;
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

/* 导航 */
nav.apex-nav, nav.tike-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 60px;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--line-dark);
  transition: all 0.3s ease;
}
.nav-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.brand-dot {
  width: 6px;
  height: 6px;
  background: var(--race-red);
  border-radius: 50%;
}
.nav-menu {
  display: flex;
  align-items: center;
  gap: 32px;
  list-style: none;
}
.nav-link {
  font-size: 13px;
  font-weight: 500;
  color: #a1a1a6;
  letter-spacing: 0.02em;
  transition: color 0.15s ease;
}
.nav-link:hover { color: var(--white); }
.nav-ai-btn {
  background: var(--white);
  color: var(--black);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.2s ease;
}
.nav-ai-btn:hover { opacity: 0.9; }

/* 章节过渡：深色与浅色节奏 */
.section-dark {
  background-color: var(--black);
  color: var(--white);
  padding: clamp(72px, 8vw, 120px) 0;
  position: relative;
}
.section-light {
  background-color: var(--canvas);
  color: var(--ink);
  padding: clamp(72px, 8vw, 120px) 0;
  position: relative;
}

/* 模块标题规范 */
.eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.eyebrow-dark { color: #86868b; }
.eyebrow-light { color: var(--secondary); }
.eyebrow-red { color: var(--race-red); }

.headline-large {
  font-size: clamp(38px, 5.5vw, 76px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 24px;
}
.subheadline {
  font-size: clamp(16px, 2vw, 20px);
  color: var(--secondary);
  max-width: 680px;
  line-height: 1.5;
  margin-bottom: 40px;
}

/* Hero 第一屏 */
.hero-full {
  min-height: calc(100svh - 60px);
  display: flex;
  align-items: center;
  padding: clamp(48px, 6vw, 96px) 0;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--line-dark);
}
.hero-track-bg {
  position: absolute;
  right: -5%;
  top: 50%;
  transform: translateY(-50%);
  width: clamp(380px, 55vw, 840px);
  height: clamp(380px, 55vw, 840px);
  opacity: 0.35;
  pointer-events: none;
  z-index: 1;
}
.hero-grid {
  display: grid;
  grid-template-columns: 7fr 5fr;
  gap: 48px;
  align-items: center;
  position: relative;
  z-index: 2;
  width: 100%;
}
.hero-title {
  font-size: clamp(56px, 9vw, 136px);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  margin: 12px 0 20px;
}
.hero-countdown-box {
  background: var(--graphite);
  border: 1px solid var(--line-dark);
  border-radius: var(--radius-card);
  padding: clamp(24px, 3.5vw, 40px);
}
.countdown-digits {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 20px 0;
}
.cd-num {
  font-family: var(--font-mono);
  font-size: clamp(32px, 4vw, 54px);
  font-weight: 700;
  line-height: 1;
}
.cd-lbl {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #86868b;
  margin-top: 6px;
}

/* TIKE AI 独立 Section */
.ai-section-box {
  background: var(--white);
  border-radius: 32px;
  padding: clamp(32px, 5vw, 64px);
  box-shadow: 0 12px 36px rgba(0,0,0,0.04);
}
.ai-input-wrap {
  position: relative;
  margin: 28px 0;
}
.ai-input-field {
  width: 100%;
  background: #f5f5f7;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: var(--radius-pill);
  padding: 18px 64px 18px 24px;
  font-size: 16px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ai-input-field:focus {
  border-color: #000;
  box-shadow: 0 0 0 4px rgba(0,0,0,0.06);
}
.ai-submit-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--black);
  color: var(--white);
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 700;
}
.ai-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.ai-chip {
  background: #f0f0f2;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  font-size: 13px;
  color: #424245;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ai-chip:hover {
  background: #e5e5ea;
  color: var(--ink);
}

/* 锦标赛 Section: 大数字排版与 Leader 突出 */
.champ-hero-card {
  background: var(--graphite);
  border: 1px solid var(--line-dark);
  border-radius: var(--radius-card);
  padding: clamp(32px, 4vw, 56px);
  margin-bottom: 40px;
}
.champ-top3-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 36px;
}
.champ-top3-item {
  border-left: 1px solid var(--line-dark);
  padding-left: 20px;
}
.champ-rank-big {
  font-family: var(--font-mono);
  font-size: clamp(32px, 4vw, 52px);
  font-weight: 800;
  line-height: 1;
  color: #86868b;
  margin-bottom: 8px;
}
.champ-top3-item:first-child .champ-rank-big { color: var(--race-red); }
.champ-driver-code {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 800;
}

/* 比赛周末 Session Cards */
.weekend-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 32px;
}
.session-card {
  background: var(--card-light);
  border: 1px solid var(--line-light);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.session-card.next {
  border-color: var(--race-red);
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(255, 45, 32, 0.1);
}

/* 赛历横向 Story 列表 */
.season-timeline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 32px;
}
.season-row {
  background: var(--card-light);
  border: 1px solid var(--line-light);
  border-radius: 16px;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}
.season-row.finished { opacity: 0.55; }
.season-row.next {
  border-color: var(--race-red);
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(255, 45, 32, 0.08);
}

/* 移动端响应式 */
@media (max-width: 900px) {
  .hero-grid { grid-template-columns: 1fr; gap: 32px; }
  .hero-track-bg { position: relative; right: auto; top: auto; transform: none; margin: 24px auto; width: 280px; height: 280px; }
  .champ-top3-grid { grid-template-columns: 1fr; }
  .nav-menu { display: none; }
}
`;
