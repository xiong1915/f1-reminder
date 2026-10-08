// src/render/home_page.js
// 首页服务端渲染器：Apple 官网级叙事设计、深浅章节节奏、真实数据直出

import { BASE_STYLES } from './styles.js';
import { CLIENT_SCRIPTS } from './client_scripts.js';
import { getCircuitSvg } from './circuit_svgs.js';
import { formatBeijingTime, formatBeijingDisplay, calculateUtcDelta } from '../domain/f1/time.js';
import {
  FALLBACK_CURRENT_MEETING,
  FALLBACK_LAST_RACE,
  FALLBACK_2026_DRIVERS,
  FALLBACK_2026_CONSTRUCTORS
} from '../cache/fallback_data.js';

export function renderHomePage(overview = {}) {
  const currentMeeting = overview.currentMeeting || overview.nextMeeting || FALLBACK_CURRENT_MEETING;
  const nextSession = overview.nextSession || {
    session: currentMeeting.sessions?.[0] || { name: '第一次自由练习 (FP1)', startTimeUTC: '2026-10-09T08:30:00Z' },
    status: 'upcoming',
    targetUtcMs: new Date('2026-10-09T08:30:00Z').getTime()
  };
  const prevRace = overview.previousRace || FALLBACK_LAST_RACE;
  const topDrivers = overview.driverStandings || FALLBACK_2026_DRIVERS;
  const topTeams = overview.constructorStandings || FALLBACK_2026_CONSTRUCTORS;
  const leader = topDrivers[0] || { name: 'Kimi Antonelli', code: 'ANT', points: 320, team: 'Mercedes' };
  const challenger = topDrivers[1] || { name: 'George Russell', code: 'RUS', points: 236, team: 'Mercedes' };
  const p3Driver = topDrivers[2] || { name: 'Lewis Hamilton', code: 'HAM', points: 214, team: 'Ferrari' };

  const circuitSvgHtml = getCircuitSvg(currentMeeting.circuitId || 'marina_bay');
  const nowMs = Date.now();
  const targetUtcMs = nextSession?.targetUtcMs || (currentMeeting.raceStartUTC ? new Date(currentMeeting.raceStartUTC).getTime() : nowMs);
  const initialDelta = calculateUtcDelta(targetUtcMs, nowMs);

  const bootstrapJson = JSON.stringify({
    serverTimeMs: nowMs,
    season: overview.season,
    currentMeeting,
    nextMeeting: currentMeeting,
    nextSession,
    driverStandings: topDrivers,
    constructorStandings: topTeams
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TIKE · F1 Race Intelligence & Championship Hub</title>
  <meta name="description" content="一级方程式官方赛历、即时锦标赛积分榜、赛程时间轴与确定性争冠数学推演。">
  <style>${BASE_STYLES}</style>
</head>
<body>

  <!-- 1. 顶部全局导航 -->
  <nav class="tike-nav">
    <div class="container nav-inner">
      <a href="/" class="nav-brand">
        <span>TIKE</span>
        <span class="brand-dot"></span>
      </a>

      <ul class="nav-menu">
        <li><a href="#race" class="nav-link">Race</a></li>
        <li><a href="#ai" class="nav-link">TIKE AI</a></li>
        <li><a href="#standings" class="nav-link">Standings</a></li>
        <li><a href="#weekend" class="nav-link">Weekend</a></li>
        <li><a href="#season" class="nav-link">Calendar</a></li>
        <li><a href="#simulator" class="nav-link">Simulator</a></li>
      </ul>

      <div style="display:flex; align-items:center; gap:16px;">
        <span id="tike-clock" style="font-family:var(--font-mono); font-size:12px; color:#86868b;">北京时间 --:--:--</span>
        <a href="#ai" class="nav-ai-btn">
          <span>TIKE AI</span>
          <span style="font-size:10px;">✦</span>
        </a>
      </div>
    </div>
  </nav>

  <!-- 2. Hero 首页第一屏 (100svh 视觉焦点) -->
  <header class="section-dark hero-full" id="race">
    <div class="hero-track-bg">${circuitSvgHtml}</div>
    <div class="container hero-grid">
      <div>
        <div class="eyebrow eyebrow-red">Round ${currentMeeting.round} · 2026 World Championship</div>
        <h1 class="hero-title">${currentMeeting.locality || 'Singapore'}</h1>
        <div style="font-size:clamp(18px, 2.5vw, 26px); color:#a1a1a6; margin-bottom:28px;">
          ${currentMeeting.nameZh || currentMeeting.name} · ${currentMeeting.circuitName}
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:40px;">
          <span style="background:var(--race-red-subtle); color:#ff453a; border:1px solid rgba(255,45,32,0.3); padding:4px 12px; border-radius:var(--radius-pill); font-size:11px; font-weight:700;">冲刺赛周末</span>
          <span style="background:rgba(255,255,255,0.06); padding:4px 12px; border-radius:var(--radius-pill); font-size:11px; color:#a1a1a6;">夜赛</span>
          <span style="background:rgba(255,255,255,0.06); padding:4px 12px; border-radius:var(--radius-pill); font-size:11px; color:#a1a1a6;">市街赛道</span>
          <span style="background:rgba(255,255,255,0.06); padding:4px 12px; border-radius:var(--radius-pill); font-size:11px; color:#a1a1a6;">正赛 62 圈</span>
        </div>

        <div style="display:flex; gap:16px;">
          <a href="#weekend" style="background:var(--white); color:var(--black); padding:12px 28px; border-radius:var(--radius-pill); font-size:14px; font-weight:700; transition:opacity 0.2s;">查看周末赛程</a>
          <a href="#ai" style="background:rgba(255,255,255,0.1); border:1px solid var(--line-dark); color:var(--white); padding:12px 28px; border-radius:var(--radius-pill); font-size:14px; font-weight:600;">询问 TIKE AI</a>
        </div>
      </div>

      <div>
        <div class="hero-countdown-box" id="hero-countdown" data-target-utc="${targetUtcMs}">
          <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--line-dark); padding-bottom:14px;">
            <span style="font-size:11px; font-weight:700; letter-spacing:0.1em; color:#86868b; text-transform:uppercase;">
              下一节 · ${nextSession?.session?.name || 'Grand Prix'}
            </span>
            <span style="font-family:var(--font-mono); font-size:13px; color:#ff453a; font-weight:700;">
              ${nextSession?.status === 'IN_PROGRESS' ? '● LIVE 进行中' : (nextSession?.session?.startTimeUTC ? formatBeijingDisplay(nextSession.session.startTimeUTC) : '待定')}
            </span>
          </div>

          <!-- 倒计时 (SSR 输出真实基准，JS 动态毫秒级递减) -->
          <div class="countdown-digits">
            <div>
              <div class="cd-num" id="cd-days">${initialDelta.days}</div>
              <div class="cd-lbl">DAYS</div>
            </div>
            <div>
              <div class="cd-num" id="cd-hours">${initialDelta.hours}</div>
              <div class="cd-lbl">HOURS</div>
            </div>
            <div>
              <div class="cd-num" id="cd-mins">${initialDelta.mins}</div>
              <div class="cd-lbl">MIN</div>
            </div>
            <div>
              <div class="cd-num" id="cd-secs">${initialDelta.secs}</div>
              <div class="cd-lbl">SEC</div>
            </div>
          </div>

          <div style="font-size:12px; color:#86868b; line-height:1.6; border-top:1px solid var(--line-dark); padding-top:16px;">
            开赛时间统一换算为北京时间 (UTC+8)。即使网络断开，本地时间戳引擎依然保持高精度同步。
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- 3. TIKE AI 独立核心 Section (浅色 Canvas 章节过渡) -->
  <section class="section-light" id="ai">
    <div class="container">
      <div class="ai-section-box">
        <div class="eyebrow eyebrow-light">Intelligence & Analysis</div>
        <h2 class="headline-large" style="color:var(--ink);">TIKE AI</h2>
        <p class="subheadline">
          问比赛。问车手。问规则。问策略。内置 2026 赛季权威赛事数据与实时搜索流水线。
        </p>

        <div class="ai-input-wrap">
          <input type="text" id="tike-ai-input" class="ai-input-field" placeholder="问点关于 F1 的事..." onkeydown="if(event.key==='Enter') submitTikeAi()">
          <button class="ai-submit-btn" onclick="submitTikeAi()">↑</button>
        </div>

        <div class="ai-chips-wrap">
          <button class="ai-chip" onclick="submitTikeAi('Antonelli 还能提前几站夺冠？')">Antonelli 还能提前几站夺冠？</button>
          <button class="ai-chip" onclick="submitTikeAi('为什么安全车会缩小领先优势？')">为什么安全车会缩小领先优势？</button>
          <button class="ai-chip" onclick="submitTikeAi('比较 Verstappen 和 Russell 最近五场表现')">比较 Verstappen 和 Russell 最近五场</button>
          <button class="ai-chip" onclick="submitTikeAi('新加坡滨海湾市街赛道最关键的超车点在哪？')">新加坡最关键的策略是什么？</button>
        </div>

        <div id="tike-ai-result-box" style="display:none; margin-top:28px; padding-top:24px; border-top:1px solid var(--line-light);">
          <div id="tike-ai-text" style="font-size:15px; color:var(--ink); line-height:1.7;"></div>
          <div id="tike-ai-sources" style="font-size:12px; color:var(--secondary); margin-top:14px;"></div>
        </div>
      </div>
    </div>
  </section>

  <!-- 4. The Championship 锦标赛积分 (深色 Section，突出领跑者与 Top 3 大数字) -->
  <section class="section-dark" id="standings">
    <div class="container">
      <div class="eyebrow eyebrow-dark">The Championship</div>
      <h2 class="headline-large">World Standings</h2>
      <p class="subheadline">
        2026 赛季车手与车队世界锦标赛即时排行榜（数据基准: Round 16 赛后官方核算）。
      </p>

      <div class="champ-hero-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px; border-bottom:1px solid var(--line-dark); padding-bottom:28px;">
          <div>
            <div style="font-size:11px; font-weight:700; letter-spacing:0.12em; color:var(--race-red); text-transform:uppercase;">Championship Leader</div>
            <div style="font-size:clamp(36px, 5vw, 68px); font-weight:800; letter-spacing:-0.03em; margin:6px 0;">
              ${leader.name}
            </div>
            <div style="font-size:15px; color:#a1a1a6;">${leader.team} · ${leader.wins} 场分站胜利</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-mono); font-size:clamp(52px, 7vw, 96px); font-weight:800; line-height:1; color:var(--white);">
              ${leader.points}
            </div>
            <div style="font-size:12px; color:#86868b; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;">POINTS TOTAL</div>
          </div>
        </div>

        <!-- Top 3 大数字排版 -->
        <div class="champ-top3-grid">
          <div class="champ-top3-item">
            <div class="champ-rank-big">01</div>
            <div class="champ-driver-code">${leader.code}</div>
            <div style="font-size:14px; font-weight:600; margin:2px 0;">${leader.name}</div>
            <div style="font-family:var(--font-mono); font-size:22px; font-weight:700; color:var(--white);">${leader.points} PTS</div>
            <div style="font-size:12px; color:#86868b;">LEADER</div>
          </div>

          <div class="champ-top3-item">
            <div class="champ-rank-big">02</div>
            <div class="champ-driver-code">${challenger.code}</div>
            <div style="font-size:14px; font-weight:600; margin:2px 0;">${challenger.name}</div>
            <div style="font-family:var(--font-mono); font-size:22px; font-weight:700; color:var(--white);">${challenger.points} PTS</div>
            <div style="font-size:12px; color:#86868b;">${challenger.gap} PTS</div>
          </div>

          <div class="champ-top3-item">
            <div class="champ-rank-big">03</div>
            <div class="champ-driver-code">${p3Driver.code}</div>
            <div style="font-size:14px; font-weight:600; margin:2px 0;">${p3Driver.name}</div>
            <div style="font-family:var(--font-mono); font-size:22px; font-weight:700; color:var(--white);">${p3Driver.points} PTS</div>
            <div style="font-size:12px; color:#86868b;">${p3Driver.gap} PTS</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 5. Race Weekend 周末日程 (浅色 Section，横向大尺寸 Session Cards) -->
  <section class="section-light" id="weekend">
    <div class="container">
      <div class="eyebrow eyebrow-light">This Weekend</div>
      <h2 class="headline-large" style="color:var(--ink);">Singapore Schedule</h2>
      <p class="subheadline">
        滨海湾市街赛道比赛周全环节北京时间时刻表，全自动识别当前与即将进行的环节。
      </p>

      <div class="weekend-cards-grid">
        ${(currentMeeting.sessions || []).map(s => {
          const isNext = nextSession?.session?.id === s.id;
          return `
            <div class="session-card ${isNext ? 'next' : ''}">
              <div>
                <div style="font-size:10px; font-weight:700; letter-spacing:0.1em; color:${isNext ? '#ff2d20' : '#86868b'}; text-transform:uppercase;">
                  ${isNext ? '● NEXT SESSION' : s.type.toUpperCase()}
                </div>
                <div style="font-size:18px; font-weight:700; color:var(--ink); margin-top:6px;">
                  ${s.name}
                </div>
              </div>
              <div>
                <div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:${isNext ? '#ff2d20' : 'var(--ink)'};">
                  ${formatBeijingDisplay(s.startTimeUTC)}
                </div>
                <div style="font-size:12px; color:var(--secondary); margin-top:2px;">
                  时长: ${s.durationMinutes} 分钟
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </section>

  <!-- 6. Last Race 上一站复盘 (深色 Section，突出雪邦站冠军维斯塔潘与前五成绩) -->
  <section class="section-dark" id="last-race">
    <div class="container">
      <div class="eyebrow eyebrow-dark">Last Race Review</div>
      <h2 class="headline-large">Round ${prevRace.round} · ${prevRace.nameZh || prevRace.name}</h2>
      <p class="subheadline">
        ${prevRace.circuitName} · 正赛详细技术数据。
      </p>

      <div class="champ-hero-card" style="margin-bottom:0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:24px; border-bottom:1px solid var(--line-dark); padding-bottom:28px;">
          <div>
            <div style="font-size:11px; font-weight:700; letter-spacing:0.12em; color:var(--race-red); text-transform:uppercase;">Grand Prix Winner</div>
            <div style="font-size:clamp(32px, 4.5vw, 60px); font-weight:800; letter-spacing:-0.03em; margin:6px 0;">
              ${prevRace.winner.name}
            </div>
            <div style="font-size:15px; color:#a1a1a6;">${prevRace.winner.team} · 用时 ${prevRace.winner.totalTime}</div>
          </div>
          <div style="display:flex; gap:36px;">
            <div>
              <div style="font-size:11px; font-weight:600; color:#86868b; text-transform:uppercase;">Pole Position</div>
              <div style="font-size:15px; font-weight:700; color:var(--white);">${prevRace.pole?.name || 'Antonelli'}</div>
              <div style="font-family:var(--font-mono); font-size:12px; color:#a1a1a6;">${prevRace.pole?.time || '1:31.285'}</div>
            </div>
            <div>
              <div style="font-size:11px; font-weight:600; color:#86868b; text-transform:uppercase;">Fastest Lap</div>
              <div style="font-size:15px; font-weight:700; color:var(--white);">${prevRace.fastestLap?.name || 'Verstappen'}</div>
              <div style="font-family:var(--font-mono); font-size:12px; color:#a1a1a6;">${prevRace.fastestLap?.time || '1:33.914'}</div>
            </div>
          </div>
        </div>

        <div style="margin-top:24px;">
          <table style="width:100%; border-collapse:collapse;">
            ${(prevRace.results || []).map(r => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:10px 0; font-family:var(--font-mono); font-weight:700; color:#86868b; width:48px;">P${r.position}</td>
                <td style="padding:10px 0; font-weight:600; color:var(--white);">${r.driverName} <span style="color:#86868b; font-size:12px;">(${r.teamName})</span></td>
                <td style="padding:10px 0; font-family:var(--font-mono); text-align:right; color:#a1a1a6;">${r.timeDelta}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- 7. The Season 赛历 (浅色 Section，横向 Editorial Story) -->
  <section class="section-light" id="season">
    <div class="container">
      <div class="eyebrow eyebrow-light">The Season</div>
      <h2 class="headline-large" style="color:var(--ink);">2026 Calendar</h2>
      <p class="subheadline">
        全赛季共 ${(overview.calendar || []).length} 场大奖赛 · 包含 6 场冲刺赛周末。
      </p>

      <div class="season-timeline-list">
        ${(overview.calendar || []).map(r => {
          const isNext = r.round === currentMeeting.round;
          const isFinished = r.round < currentMeeting.round;
          return `
            <div class="season-row ${isNext ? 'next' : ''} ${isFinished ? 'finished' : ''}">
              <div style="display:flex; align-items:center; gap:20px;">
                <span style="font-family:var(--font-mono); font-weight:800; font-size:16px; color:${isNext ? '#ff2d20' : 'var(--secondary)'}; width:36px;">
                  #${String(r.round).padStart(2, '0')}
                </span>
                <div>
                  <div style="font-weight:700; font-size:16px; color:var(--ink);">${r.nameZh || r.name}</div>
                  <div style="font-size:12px; color:var(--secondary);">${r.circuit}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-mono); font-size:13px; font-weight:600; color:var(--ink);">${r.dateStart} ~ ${r.dateEnd}</div>
                <div style="font-size:11px; font-weight:700; color:${isNext ? '#ff2d20' : 'var(--secondary)'};">
                  ${isNext ? 'NEXT RACE' : (isFinished ? 'FINISHED' : 'UPCOMING')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </section>

  <!-- 8. Championship Simulator (深色 Section，确定性数学推演) -->
  <section class="section-dark" id="simulator">
    <div class="container">
      <div class="eyebrow eyebrow-dark">Deterministic Scenarios</div>
      <h2 class="headline-large">Title Simulator</h2>
      <p class="subheadline">
        动态绑定车手榜 P1 (${leader.name}) 与 P2 (${challenger.name})，进行冲刺赛与正赛完赛分差演练。
      </p>

      <div class="champ-hero-card">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:32px;">
          <div>
            <!-- Leader -->
            <div style="margin-bottom:24px;">
              <div style="font-weight:700; margin-bottom:8px;">${leader.name} (${leader.code})</div>
              <div style="display:flex; gap:12px;">
                <select id="sim-l-sprint" onchange="runChampionshipSim()" style="background:#242426; color:#fff; border:1px solid var(--line-dark); padding:8px 12px; border-radius:8px; font-size:13px;">
                  <option value="8">冲刺赛 P1 (8分)</option>
                  <option value="7">冲刺赛 P2 (7分)</option>
                  <option value="6">冲刺赛 P3 (6分)</option>
                  <option value="0">冲刺赛 0分</option>
                </select>
                <select id="sim-l-race" onchange="runChampionshipSim()" style="background:#242426; color:#fff; border:1px solid var(--line-dark); padding:8px 12px; border-radius:8px; font-size:13px;">
                  <option value="25">正赛 P1 (25分)</option>
                  <option value="18">正赛 P2 (18分)</option>
                  <option value="15">正赛 P3 (15分)</option>
                  <option value="12">正赛 P4 (12分)</option>
                  <option value="0">正赛 0分</option>
                </select>
              </div>
            </div>

            <!-- Challenger -->
            <div>
              <div style="font-weight:700; margin-bottom:8px;">${challenger.name} (${challenger.code})</div>
              <div style="display:flex; gap:12px;">
                <select id="sim-c-sprint" onchange="runChampionshipSim()" style="background:#242426; color:#fff; border:1px solid var(--line-dark); padding:8px 12px; border-radius:8px; font-size:13px;">
                  <option value="7">冲刺赛 P2 (7分)</option>
                  <option value="8">冲刺赛 P1 (8分)</option>
                  <option value="6">冲刺赛 P3 (6分)</option>
                  <option value="0">冲刺赛 0分</option>
                </select>
                <select id="sim-c-race" onchange="runChampionshipSim()" style="background:#242426; color:#fff; border:1px solid var(--line-dark); padding:8px 12px; border-radius:8px; font-size:13px;">
                  <option value="18">正赛 P2 (18分)</option>
                  <option value="25">正赛 P1 (25分)</option>
                  <option value="15">正赛 P3 (15分)</option>
                  <option value="0">正赛 0分</option>
                </select>
              </div>
            </div>
          </div>

          <div style="border-left:1px solid var(--line-dark); padding-left:clamp(20px, 3vw, 36px); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <span style="color:#86868b; font-size:13px;">领跑者预测总分:</span>
                <span id="sim-out-leader" style="font-family:var(--font-mono); font-weight:700;">${leader.points + 33} 分</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <span style="color:#86868b; font-size:13px;">追赶者预测总分:</span>
                <span id="sim-out-challenger" style="font-family:var(--font-mono); font-weight:700;">${challenger.points + 25} 分</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-top:1px solid var(--line-dark); padding-top:12px;">
                <span style="font-size:13px; font-weight:700;">预测第一二名分差:</span>
                <span id="sim-out-gap" style="font-family:var(--font-mono); font-weight:800; font-size:18px; color:var(--race-red);">+${(leader.points + 33) - (challenger.points + 25)} 分</span>
              </div>
            </div>

            <div id="sim-out-narrative" style="background:rgba(255,255,255,0.03); border:1px solid var(--line-dark); padding:16px; border-radius:12px; font-size:13px; color:#a1a1a6; line-height:1.6; margin-top:20px;">
              若 ${leader.name} 包揽冲刺赛与正赛胜利，其领先优势将扩大至 ${(leader.points + 33) - (challenger.points + 25)} 分，在后续分站中将建立极高的争冠安全壁垒。
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 9. 页脚 -->
  <footer class="section-dark" style="border-top:1px solid var(--line-dark); padding:64px 0 36px;">
    <div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:36px;">
      <div>
        <div style="font-weight:800; font-size:16px; letter-spacing:0.06em; margin-bottom:8px;">TIKE · MOTORSPORT INTELLIGENCE</div>
        <div style="font-size:13px; color:#86868b; max-width:380px; line-height:1.6;">
          独立一级方程式赛车数据与决策平台。采用纯原生 Cloudflare 边缘计算渲染引擎与确定性数学计算。
        </div>
      </div>
      <div style="display:flex; gap:48px; font-size:13px;">
        <div>
          <div style="font-weight:700; color:#86868b; margin-bottom:12px;">Navigation</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <a href="#race">Current Race</a>
            <a href="#ai">TIKE AI</a>
            <a href="#standings">Standings</a>
            <a href="#weekend">Weekend</a>
            <a href="#season">Calendar</a>
          </div>
        </div>
        <div>
          <div style="font-weight:700; color:#86868b; margin-bottom:12px;">Platform</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <a href="/ai">Dedicated AI</a>
            <a href="/system">System & Telemetry</a>
            <a href="/api/f1/overview" target="_blank">Overview API</a>
            <a href="/api/f1/calendar" target="_blank">Calendar API</a>
          </div>
        </div>
      </div>
    </div>
    <div class="container" style="border-top:1px solid var(--line-dark); margin-top:40px; padding-top:24px; font-size:12px; color:#6e6e73;">
      非官方 F1 数据项目。与 FIA、Formula 1 及相关商业实体无隶属关系。所有比赛开赛时间均自动转换为北京时间 (UTC+8)。
    </div>
  </footer>

  <!-- Bootstrap 数据挂载 -->
  <script type="application/json" id="tike-bootstrap">${bootstrapJson}</script>
  <!-- 客户端渐进增强脚本 -->
  <script>${CLIENT_SCRIPTS}</script>
</body>
</html>`;
}

export const renderEditorialWebPage = renderHomePage;
