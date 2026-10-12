// app/races/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';
import { formatBeijingDisplay } from '@/lib/f1/time';
import { SeasonSelector } from '@/components/season_selector';

export const dynamic = 'force-dynamic';

export default async function RacesPage({
  searchParams
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: rawSeason } = (await searchParams) || {};
  const season = rawSeason || '2026';

  const [seasons, calendar, overview] = await Promise.all([
    defaultF1Service.getSeasons(),
    defaultF1Service.getCalendar(season),
    defaultF1Service.getOverview(season)
  ]);

  const sprintCount = calendar.filter(r => r.isSprintWeekend).length;
  const isHistorical = Number(season) < new Date().getUTCFullYear();

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        {/* Header & Season Selector */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div className="badge-pill badge-red">
              {season} 赛季 FIA 世界一级方程式锦标赛
            </div>
            <SeasonSelector currentSeason={season} seasons={seasons} baseUrl="/races" />
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            年度分站全赛历 ({calendar.length} 站)
          </h1>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', margin: 0 }}>
              {isHistorical
                ? `${season} 赛季已全部完赛，共收录 ${calendar.length} 站大奖赛官方赛程与分站赛果`
                : `包含全部标准周末与 ${sprintCount} 站冲刺赛周末，开赛时间统一换算为北京时间 (UTC+8)`}
            </p>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              数据来源：Jolpica 历史数据库 · {isHistorical ? `${season} 赛季已完赛档案` : `数据更新于：${formatBeijingDisplay(overview.updatedAt)}`}
            </div>
          </div>
        </div>

        {calendar.length === 0 ? (
          <div className="card-dark" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>该赛季暂无赛历数据</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px' }}>
              未在官方数据源中检索到 {season} 赛季的赛历记录。可尝试切换其他赛季查看。
            </p>
            <Link href="/races?season=2026" className="btn-primary">
              返回 2026 赛季赛历 →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {calendar.map((race, idx) => (
              <div
                key={race.meetingId || `round-${race.round}` || idx}
                className="card-dark"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#ff453a' }}>
                      第 {race.round} 站
                    </span>
                    {race.isSprintWeekend && (
                      <span className="badge-pill badge-red" style={{ fontSize: '10px' }}>冲刺周末</span>
                    )}
                    {isHistorical && (
                      <span className="badge-pill badge-dark" style={{ fontSize: '10px' }}>已完赛</span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
                    {race.nameZh || race.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {race.circuitName} · {race.locality} ({race.country})
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line-dark)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {race.raceStartUTC ? formatBeijingDisplay(race.raceStartUTC) : (race.sessions?.[0]?.startTimeUTC ? formatBeijingDisplay(race.sessions[0].startTimeUTC) : '日期记录暂缺')}
                  </span>
                  <Link
                    href={`/races/${race.round}?season=${season}`}
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    分站详情与赛果 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
