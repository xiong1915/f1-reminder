// app/standings/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';
import { SeasonSelector } from '@/components/season_selector';
import { formatBeijingDisplay } from '@/lib/f1/time';

export const dynamic = 'force-dynamic';

export default async function StandingsPage({
  searchParams
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: rawSeason } = (await searchParams) || {};
  const season = rawSeason || '2026';

  const [seasons, overview, drivers, constructors] = await Promise.all([
    defaultF1Service.getSeasons(),
    defaultF1Service.getOverview(season),
    defaultF1Service.getDriverStandings(season),
    defaultF1Service.getConstructorStandings(season)
  ]);

  const isHistorical = Number(season) < new Date().getUTCFullYear();
  const isPre1958 = parseInt(season, 10) < 1958;

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        {/* Header & Season Selector */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div className="badge-pill badge-red">
              {season} 赛季世界锦标赛官方积分榜
            </div>
            <SeasonSelector currentSeason={season} seasons={seasons} baseUrl="/standings" />
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            世界一级方程式锦标赛积分榜
          </h1>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', margin: 0 }}>
              {isHistorical
                ? `${season} 赛季车手与车队积分快照。车队积分按各站实际归属统计，可能与当前阵容车手全年积分之和不同。各分站具体历史成绩与车队积分明细仍在逐站核验中。`
                : '官方积分规则：正赛前十名 (25-18-15-12-10-8-6-4-2-1)，冲刺赛前八名 (8-7-6-5-4-3-2-1)。车队积分按各站实际归属统计，可能与当前阵容车手全年积分之和不同。各分站具体历史成绩与车队积分明细仍在逐站核验中。'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div>
                <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>积分统计状态：</span>
                {overview.standingsCutoffDesc || (isHistorical ? `${season} 赛季最终官方积分榜` : '截止场次待核实')}
                {overview.standingsCutoffVerified && <span style={{ color: '#30d158', marginLeft: '6px' }}>✓ 已核实</span>}
              </div>
              <div>
                {isHistorical
                  ? `历史官方权威结算快照 (共 ${drivers.length} 位车手记录)`
                  : `数据同步于：${formatBeijingDisplay(overview.updatedAt)}${overview.upstreamSyncSuccess === false ? ' (最近同步失败，保留已有数据)' : overview.isStale ? ' (部分数据待更新)' : ''}`}
              </div>
            </div>
          </div>
        </div>

        {/* 1. 车手积分榜 (Drivers) */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>车手世界锦标赛总积分榜</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {season} 赛季参与积分榜车手共 {drivers.length} 位
            </span>
          </div>

          {drivers.length === 0 ? (
            <div className="card-dark" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              该赛季暂无车手积分榜数据
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '640px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 2.2fr 2.2fr 90px 90px 100px', padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line-dark)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  <span>排名</span>
                  <span>车手</span>
                  <span>所属车队/赛车</span>
                  <span style={{ textAlign: 'right' }}>分站冠军</span>
                  <span style={{ textAlign: 'right' }}>分差</span>
                  <span style={{ textAlign: 'right' }}>总积分</span>
                </div>

                {drivers.map((d, idx) => (
                  <div
                    key={d.code || d.driverId || idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 2.2fr 2.2fr 90px 90px 100px',
                      padding: '18px 24px',
                      borderBottom: idx === drivers.length - 1 ? 'none' : '1px solid var(--line-dark)',
                      alignItems: 'center',
                      background: idx === 0 ? 'rgba(255,45,32,0.04)' : 'transparent'
                    }}
                  >
                    <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '16px', color: idx === 0 ? '#ff453a' : 'inherit' }}>
                      {d.rank}
                    </span>

                    <div>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>
                        {d.name || d.nameEn}
                      </span>
                      {d.number && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>#{d.number}</span>}
                    </div>

                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {d.team}
                    </div>

                    <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {d.wins} 胜
                    </div>

                    <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {d.gap === 0 ? (isHistorical ? '世界冠军' : '榜首领跑') : `${d.gap} 分`}
                    </div>

                    <div className="tabular-nums" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '17px', color: idx === 0 ? '#ff453a' : 'var(--text-primary)' }}>
                      {d.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. 车队积分榜 (Constructors) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>车队世界锦标赛积分榜</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {isPre1958 ? '1958 年之前未设车队世界冠军' : `${season} 赛季上榜车队共 ${constructors.length} 支`}
            </span>
          </div>

          {isPre1958 ? (
            <div className="card-dark" style={{ padding: '36px 28px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed var(--line-dark)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                {season} 赛季尚未设立车队世界冠军奖项
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
                一级方程式历史事实：国际汽联（FIA）自 1958 赛季（范沃尔车队 Vanwall 夺冠）起正式创立车队世界锦标赛（Constructors&apos; Championship）。在此之前的历史赛季仅评定车手世界冠军。
              </p>
            </div>
          ) : constructors.length === 0 ? (
            <div className="card-dark" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              该赛季暂无车队积分榜数据
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '600px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 3fr 100px 100px 100px', padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line-dark)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  <span>排名</span>
                  <span>车队名称</span>
                  <span style={{ textAlign: 'right' }}>分站冠军</span>
                  <span style={{ textAlign: 'right' }}>分差</span>
                  <span style={{ textAlign: 'right' }}>总积分</span>
                </div>

                {constructors.map((c, idx) => (
                  <div
                    key={c.teamId || idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 3fr 100px 100px 100px',
                      padding: '18px 24px',
                      borderBottom: idx === constructors.length - 1 ? 'none' : '1px solid var(--line-dark)',
                      alignItems: 'center',
                      background: idx === 0 ? 'rgba(255,45,32,0.04)' : 'transparent'
                    }}
                  >
                    <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '16px', color: idx === 0 ? '#ff453a' : 'inherit' }}>
                      {c.rank}
                    </span>

                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      {c.name || c.nameEn}
                    </div>

                    <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {c.wins} 胜
                    </div>

                    <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {c.gap === 0 ? (isHistorical ? '年度冠军车队' : '榜首领跑') : `${c.gap} 分`}
                    </div>

                    <div className="tabular-nums" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '17px', color: idx === 0 ? '#ff453a' : 'var(--text-primary)' }}>
                      {c.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
