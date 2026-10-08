// app/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';
import { CircuitVisual } from '@/components/circuit_visual';
import { Countdown } from '@/components/countdown';
import { AISearchBox } from '@/components/ai_search_box';
import { TitleSimulator } from '@/components/title_simulator';
import { formatBeijingDisplay } from '@/lib/f1/time';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const overview = await defaultF1Service.getOverview();
  const calendar = await defaultF1Service.getCalendar('2026');

  const { currentMeeting, nextSession, driverStandings, constructorStandings, previousRace } = overview;
  const targetUtcMs = nextSession?.targetUtcMs || (currentMeeting.raceStartUTC ? new Date(currentMeeting.raceStartUTC).getTime() : Date.now());

  const leader = driverStandings[0] || { name: '数据同步中', code: '---', points: 0, team: 'FIA F1' };
  const challenger = driverStandings[1] || { name: '数据同步中', code: '---', points: 0, team: 'FIA F1' };
  const p3 = driverStandings[2] || { name: '数据同步中', code: '---', points: 0, team: 'FIA F1' };

  return (
    <>
      {/* 1. Hero 首页第一屏 (100svh 视觉焦点) */}
      <section className="hero-100 section-dark" id="race">
        <div className="container" style={{ position: 'relative', width: '100%', zIndex: 2, padding: '40px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            {/* Left Column: Race Brief & Action */}
            <div>
              <div className="badge-pill badge-red" style={{ marginBottom: '16px' }}>
                第 {currentMeeting.round} 站 / 全季 {calendar.length} 站 · {overview.season} 赛季世界锦标赛
              </div>

              <h1 style={{ fontSize: 'clamp(44px, 7vw, 76px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: '12px' }}>
                {currentMeeting.nameZh || `${currentMeeting.locality || '新加坡'}大奖赛`}
              </h1>

              <div style={{ fontSize: 'clamp(16px, 2.2vw, 22px)', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                {currentMeeting.circuitName} · {currentMeeting.locality} ({currentMeeting.country})
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '36px' }}>
                {currentMeeting.isSprintWeekend && (
                  <span className="badge-pill badge-red">冲刺赛周末</span>
                )}
                <span className="badge-pill badge-dark">市街赛道</span>
                <span className="badge-pill badge-dark">夜赛</span>
                {currentMeeting.specs?.laps && (
                  <span className="badge-pill badge-dark">正赛 {currentMeeting.specs.laps} 圈</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <a href="#weekend" className="btn-primary">查看周末赛程</a>
                <a href="#ai" className="btn-secondary">询问 TIKE AI</a>
              </div>
            </div>

            {/* Right Column: Dynamic SVG & High-Precision Countdown */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-40px', right: 0, width: '100%', height: '100%', opacity: 0.35, pointerEvents: 'none', zIndex: 0 }}>
                <CircuitVisual circuitId={currentMeeting.circuitId} />
              </div>

              <div className="card-dark" style={{ position: 'relative', zIndex: 1, backdropFilter: 'blur(16px)', background: 'rgba(18, 18, 20, 0.85)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--line-dark)', paddingBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    下一节 · {nextSession?.session?.name || '大奖赛正赛'}
                  </span>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#ff453a', fontWeight: 700 }}>
                    {nextSession?.status === 'IN_PROGRESS' ? '● LIVE 进行中' : (nextSession?.session?.startTimeUTC ? formatBeijingDisplay(nextSession.session.startTimeUTC) : '待定')}
                  </span>
                </div>

                {/* 客户端无漂移精准倒计时 */}
                <Countdown targetUtcMs={targetUtcMs} serverTimeMs={Date.now()} />

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--line-dark)', paddingTop: '16px' }}>
                  开赛时间统一换算为北京时间 (UTC+8)，由服务端与客户端对齐同步。
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TIKE AI 聚光灯 (浅色 Light Section，形成高级杂志节奏感) */}
      <section className="section-light" id="ai">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="badge-pill badge-light" style={{ marginBottom: '14px' }}>
            TIKE 赛车智能引擎
          </div>
          <h2 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>
            TIKE AI
          </h2>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-dark-secondary)', marginBottom: '40px' }}>
            问比赛。问策略。问车手。问规则。
          </p>

          <AISearchBox defaultLight={true} />
        </div>
      </section>

      {/* 3. Championship 争冠格局与数学推演 (深色 Section) */}
      <section className="section-dark" id="standings">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '48px' }}>
            <div>
              <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
                2026 赛季世界车手锦标赛
              </div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800 }}>
                年度车手争冠格局
              </h2>
            </div>
            <Link href="/standings" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>
              查看完整积分榜 →
            </Link>
          </div>

          {/* Top 3 Drivers Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '48px' }}>
            {/* P1 Leader */}
            <div className="card-dark" style={{ borderLeft: '4px solid var(--accent-red)', background: 'linear-gradient(180deg, rgba(255,45,32,0.06) 0%, rgba(18,18,20,1) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#ff453a' }}>P1 · 榜首领跑</span>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 900 }}>
                  {leader.points} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                </span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{leader.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{leader.team}</div>
            </div>

            {/* P2 Challenger */}
            <div className="card-dark">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>P2 · 积分追赶</span>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 900 }}>
                  {challenger.points} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                </span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{challenger.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{challenger.team} (落后 {Math.abs(challenger.gap)} 分)</div>
            </div>

            {/* P3 */}
            <div className="card-dark">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>P3 · 季军排位</span>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 900 }}>
                  {p3.points} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                </span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{p3.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p3.team} (落后 {Math.abs(p3.gap)} 分)</div>
            </div>
          </div>

          {/* Embedded Title Fight Math Simulator */}
          <TitleSimulator drivers={driverStandings} />
        </div>
      </section>

      {/* 4. Race Weekend 赛程时间线 (浅色 Light Section) */}
      <section className="section-light" id="weekend">
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <div className="badge-pill badge-light" style={{ marginBottom: '12px' }}>
              周末赛程与时间表
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800 }}>
              {currentMeeting.nameZh || currentMeeting.name} · 周末赛程
            </h2>
            <p style={{ color: 'var(--text-dark-secondary)', marginTop: '8px' }}>
              开赛时间均自动转换为北京时间 (UTC+8)
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(currentMeeting.sessions || []).map((session, idx) => (
              <div
                key={session.id || idx}
                className="card-light"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '24px 32px',
                  borderLeft: session.type === 'race' ? '4px solid #ff2d20' : '1px solid var(--line-light)'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: session.type === 'race' ? '#ff2d20' : 'var(--text-dark-secondary)', letterSpacing: '0.04em' }}>
                    {session.name}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark-secondary)', marginTop: '4px' }}>
                    {session.nameEn}
                  </div>
                </div>

                <div className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                  {session.startTimeUTC ? formatBeijingDisplay(session.startTimeUTC) : '待定'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Last Race Recap (深色 Section) */}
      {previousRace && (
        <section className="section-dark">
          <div className="container">
            <div style={{ marginBottom: '40px' }}>
              <div className="badge-pill badge-dark" style={{ marginBottom: '12px' }}>
                前站战报与回顾
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800 }}>
                上一站回顾 · 第 {previousRace.round} 站 {previousRace.name}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>分站冠军</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{previousRace.winner.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{previousRace.winner.team}</div>
              </div>

              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>杆位得主 (Pole Position)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{previousRace.pole?.name || previousRace.winner.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{previousRace.winner.team}</div>
              </div>

              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>最快圈速 (Fastest Lap)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ff453a' }}>{previousRace.fastestLap?.name || previousRace.winner.name}</div>
                <div className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {previousRace.fastestLap?.lapTime || '比赛阶段最快圈'}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Season Calendar Preview (浅色 Section) */}
      <section className="section-light">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '40px' }}>
            <div>
              <div className="badge-pill badge-light" style={{ marginBottom: '12px' }}>
                {overview.season} 赛季世界一级方程式赛历
              </div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 800 }}>
                {overview.season} 赛季年度分站赛历
              </h2>
            </div>
            <Link href="/races" className="btn-primary" style={{ padding: '8px 24px', fontSize: '13px' }}>
              浏览全赛季 {calendar.length} 站赛程 →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {calendar.slice(0, 6).map((race, idx) => (
              <div key={race.round || idx} className="card-light" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#ff2d20' }}>第 {race.round} 站</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dark-secondary)' }}>{race.isSprintWeekend ? '冲刺周末' : '标准周末'}</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark-primary)' }}>{race.nameZh || race.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dark-secondary)', marginTop: '4px' }}>{race.circuitName} · {race.locality}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
