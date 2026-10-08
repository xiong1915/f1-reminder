// src/render/ai_page.js
// 独立 APEX AI 智能分析专页 (/ai)

import { BASE_STYLES } from './styles.js';
import { CLIENT_SCRIPTS } from './client_scripts.js';

export function renderAiPage(overview) {
  const bootstrapJson = JSON.stringify({
    season: overview.season,
    driverStandings: overview.driverStandings || [],
    nextMeeting: overview.nextMeeting || overview.currentMeeting
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TIKE AI · Dedicated Motorsport Intelligence</title>
  <style>${BASE_STYLES}</style>
</head>
<body style="background:var(--canvas); color:var(--ink);">

  <nav class="tike-nav" style="background:rgba(255,255,255,0.85); border-bottom:1px solid rgba(0,0,0,0.08);">
    <div class="container nav-inner">
      <a href="/" class="nav-brand" style="color:var(--ink);">
        <span>TIKE</span>
        <span class="brand-dot"></span>
      </a>
      <a href="/" style="font-size:13px; font-weight:600; color:var(--secondary);">← 返回赛事主站</a>
    </div>
  </nav>

  <main class="container" style="padding:60px var(--gutter); max-width:880px;">
    <div class="eyebrow eyebrow-light">Dedicated Intelligence Console</div>
    <h1 class="headline-large" style="color:var(--ink); margin-bottom:16px;">TIKE AI</h1>
    <p class="subheadline" style="margin-bottom:36px;">
      针对 2026 FIA 一级方程式世界锦标赛的深度自然语言分析引擎。集成 Jolpica/OpenF1 官方数据层与多源实时搜索。
    </p>

    <div class="ai-section-box" style="padding:36px; margin-bottom:32px;">
      <div class="ai-input-wrap" style="margin:0 0 20px 0;">
        <input type="text" id="tike-ai-input" class="ai-input-field" placeholder="输入你想了解的赛事分析、积分算力或车手表现..." onkeydown="if(event.key==='Enter') submitTikeAi()">
        <button class="ai-submit-btn" onclick="submitTikeAi()">↑</button>
      </div>

      <div class="ai-chips-wrap">
        <button class="ai-chip" onclick="submitTikeAi('安东内利在 2026 赛季领先的主要技术优势是什么？')">安东内利领跑优势分析</button>
        <button class="ai-chip" onclick="submitTikeAi('新加坡滨海湾市街赛道换胎策略与安全车窗口')">新加坡换胎窗口与策略</button>
        <button class="ai-chip" onclick="submitTikeAi('详细介绍 2026 冲刺赛排位赛 (SQ) 规则与轮胎配方')">冲刺排位赛规则详解</button>
        <button class="ai-chip" onclick="submitTikeAi('红牛车队最近两站升级带来了哪些圈速改变？')">红牛车队近期技术升级</button>
      </div>

      <div id="tike-ai-result-box" style="display:none; margin-top:32px; padding-top:24px; border-top:1px solid var(--line-light);">
        <div id="tike-ai-text" style="font-size:15px; color:var(--ink); line-height:1.75;"></div>
        <div id="tike-ai-sources" style="font-size:12px; color:var(--secondary); margin-top:16px;"></div>
      </div>
    </div>
  </main>

  <script type="application/json" id="tike-bootstrap">${bootstrapJson}</script>
  <script>${CLIENT_SCRIPTS}</script>
</body>
</html>`;
}
