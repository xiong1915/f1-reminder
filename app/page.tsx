// app/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';
import { CircuitVisual } from '@/components/circuit_visual';
import { Countdown } from '@/components/countdown';
import { AISearchBox } from '@/components/ai_search_box';
import { TitleSimulator } from '@/components/title_simulator';
import { AutoRefresher } from '@/components/auto_refresher';
import { formatBeijingDisplay } from '@/lib/f1/time';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const overview = await defaultF1Service.getOverview();
  const calendar = await defaultF1Service.getCalendar('2026');

  const { currentMeeting, nextSession, driverStandings, previousRace } = overview;
  const targetUtcMs = nextSession?.targetUtcMs || (currentMeeting.raceStartUTC ? new Date(currentMeeting.raceStartUTC).getTime() : Date.now());

  const leader = driverStandings[0] || { name: '数据加载中', code: '---', points: 0, team: 'F1 车队' };
  const challenger = driverStandings[1] || { name: '数据加载中', code: '---', points: 0, team: 'F1 车队' };
  const p3 = driverStandings[2] || { name: '数据加载中', code: '---', points: 0, team: 'F1 车队' };

  // 接下来三站：按比赛时间排序，只展示当前分站之后的赛事
  const currentRound = currentMeeting?.round || 0;
  const upcomingThreeRaces = calendar
    .filter(r => r.round > currentRound)
    .sort((a, b) => a.round - b.round)
    .slice(0, 3);
  const isSeasonEnded = calendar.length > 0 && upcomingThreeRaces.length === 0;

  return (
    <>
      {/* 1. 当前分站与下一场比赛倒计时 */}
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
                    {nextSession?.status === 'IN_PROGRESS' ? '当前进行' : '下一节'} · {nextSession?.session?.name || '大奖赛正赛'}
                  </span>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#ff453a', fontWeight: 700 }}>
                    {nextSession?.status === 'IN_PROGRESS' ? '● 进行中' : (nextSession?.session?.startTimeUTC ? formatBeijingDisplay(nextSession.session.startTimeUTC) : '待定')}
                  </span>
                </div>

                {/* 客户端无漂移精准倒计时 */}
                <Countdown targetUtcMs={targetUtcMs} serverTimeMs={Date.now()} isInProgress={nextSession?.status === 'IN_PROGRESS'} />

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--line-dark)', paddingTop: '16px' }}>
                  {nextSession?.status === 'IN_PROGRESS' ? '比赛进行中，上方计时为预计剩余时间。' : '开赛时间统一换算为北京时间 (UTC+8)。'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 本周末完整赛程 */}
      <section className="section-light" id="weekend">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
            <div>
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
            <div style={{ fontSize: '12px', color: 'var(--text-dark-secondary)' }}>
              数据来源：官方同步 · 数据更新于：{formatBeijingDisplay(overview.updatedAt)}
              {overview.upstreamSyncSuccess === false ? ' (最近同步失败，保留已有数据)' : overview.isStale ? ' (部分数据待更新)' : ''}
            </div>
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

      {/* 3. 当前车手积分前三及完整积分榜入口 */}
      <section className="section-dark" id="standings">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
            <div>
              <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
                {overview.season} 赛季车手锦标赛
              </div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800 }}>
                年度车手积分榜前三
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                积分统计截至：{overview.standingsCutoffDesc || '截止场次待核实'} · 数据更新于：{formatBeijingDisplay(overview.updatedAt)}
                {overview.upstreamSyncSuccess === false ? ' (最近同步失败，保留已有数据)' : overview.isStale ? ' (部分数据待更新)' : ''}
              </div>
              <Link href="/standings" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                查看完整积分榜 →
              </Link>
            </div>
          </div>

          {/* Top 3 Drivers Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
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
        </div>
      </section>

      {/* 4. 上一站回顾 */}
      {previousRace && (
        <section className="section-dark" id="last-race" style={{ borderTop: '1px solid var(--line-dark)' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
              <div>
                <div className="badge-pill badge-dark" style={{ marginBottom: '12px' }}>
                  前站赛况与回顾
                </div>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800 }}>
                  上一站回顾 · 第 {previousRace.round} 站 {previousRace.nameZh || previousRace.name}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  数据更新于：{formatBeijingDisplay(overview.updatedAt)}
                </div>
                {previousRace.sourceUrls?.raceResult ? (
                  <a
                    href={previousRace.sourceUrls.raceResult}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                  >
                    官方正赛赛果 ↗
                  </a>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>官方直达链接暂缺</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {/* Winner */}
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>分站正赛冠军 (Winner)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{previousRace.winner?.name || '暂无数据'}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{previousRace.winner?.team || '暂无数据'}</div>
                {previousRace.sourceUrls?.raceResult && (
                  <div style={{ marginTop: '8px' }}>
                    <a href={previousRace.sourceUrls.raceResult} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#64d2ff' }}>
                      官方正赛成绩 ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Pole or Starting Grid P1 */}
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {previousRace.pole ? '杆位得主 (Pole Position)' : (previousRace.startingGridP1 ? '发车首位 (Starting Grid P1)' : '杆位得主 (Pole Position)')}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {previousRace.pole?.name || previousRace.startingGridP1?.name || previousRace.qualifyingP1?.name || '暂无数据'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {previousRace.pole?.team || previousRace.startingGridP1?.team || previousRace.qualifyingP1?.team || '暂无数据'}
                  {!previousRace.pole && previousRace.startingGridP1 && ' (按正赛发车格首位统计，排位赛官方成绩待确认)'}
                </div>
                {previousRace.sourceUrls?.qualifying && (
                  <div style={{ marginTop: '8px' }}>
                    <a href={previousRace.sourceUrls.qualifying} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#64d2ff' }}>
                      官方排位成绩 ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Fastest Lap */}
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>本场最快圈速 (Fastest Lap)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: previousRace.fastestLap?.name ? '#ff453a' : 'var(--text-primary)' }}>
                  {previousRace.fastestLap?.name || '暂无数据'}
                </div>
                <div className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {previousRace.fastestLap?.lapTime ? `${previousRace.fastestLap.lapTime}${previousRace.fastestLap.lap ? ` (第 ${previousRace.fastestLap.lap} 圈)` : ''}` : '暂无数据'}
                </div>
                {previousRace.sourceUrls?.fastestLaps && (
                  <div style={{ marginTop: '8px' }}>
                    <a href={previousRace.sourceUrls.fastestLaps} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#64d2ff' }}>
                      官方最快圈成绩 ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. 接下来三站 */}
      <section className="section-light" id="next-races">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '36px' }}>
            <div>
              <div className="badge-pill badge-light" style={{ marginBottom: '12px' }}>
                后续赛程走势
              </div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 800 }}>
                接下来三站赛事
              </h2>
            </div>
            <Link href="/races" className="btn-primary" style={{ padding: '8px 24px', fontSize: '13px' }}>
              浏览全赛季 {calendar.length} 站赛历 →
            </Link>
          </div>

          {isSeasonEnded ? (
            <div className="card-light" style={{ textAlign: 'center', padding: '40px 20px', fontSize: '16px', fontWeight: 700, color: 'var(--text-dark-secondary)' }}>
              本赛季已结束
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {upcomingThreeRaces.map((race, idx) => (
                <div key={race.meetingId || race.round || idx} className="card-light" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#ff2d20' }}>第 {race.round} 站</span>
                      <span className="badge-pill badge-light" style={{ fontSize: '11px' }}>
                        {race.isSprintWeekend ? '冲刺周末' : '标准周末'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark-primary)', marginBottom: '6px' }}>
                      {race.nameZh || race.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-dark-secondary)', marginBottom: '12px' }}>
                      {race.circuitName} · {race.locality} ({race.country})
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark-primary)', marginBottom: '16px' }}>
                      正赛时间：{race.raceStartUTC ? formatBeijingDisplay(race.raceStartUTC) : '待定'}
                    </div>
                  </div>

                  <Link href={`/races/${race.round}`} style={{ fontSize: '13px', fontWeight: 700, color: '#ff2d20' }}>
                    分站详情 →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. AI 问答入口 */}
      <section className="section-light" id="ai" style={{ borderTop: '1px solid var(--line-light)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="badge-pill badge-light" style={{ marginBottom: '14px' }}>
            赛车智能助手
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

      {/* 7. 积分试算，默认折叠 */}
      <section className="section-dark" id="simulator">
        <div className="container">
          <details style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '24px', overflow: 'hidden' }}>
            <summary style={{ padding: '24px 32px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '18px', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="badge-pill badge-red" style={{ fontSize: '11px' }}>积分工具</span>
                <span>本周末积分试算</span>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>点击展开 / 折叠 ▾</span>
            </summary>
            <div style={{ padding: '0 20px 24px' }}>
              <TitleSimulator
                drivers={driverStandings}
                isSprintWeekend={Boolean(currentMeeting.isSprintWeekend)}
                isSprintPending={overview.canSimulateSprint === true}
                available={overview.canSimulateRace === true}
              />
            </div>
          </details>
        </div>
      </section>
      <AutoRefresher />
    </>
  );
}
