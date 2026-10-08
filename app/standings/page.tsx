// app/standings/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const [drivers, constructors] = await Promise.all([
    defaultF1Service.getDriverStandings('2026'),
    defaultF1Service.getConstructorStandings('2026')
  ]);

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
            2026 赛季世界锦标赛官方积分榜
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            世界一级方程式锦标赛积分榜
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
            FIA 官方积分规则：正赛前十名 (25-18-15-12-10-8-6-4-2-1)，冲刺赛前八名 (8-7-6-5-4-3-2-1)
          </p>
        </div>

        {/* 1. 车手积分榜 (Drivers) */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>车手世界锦标赛总积分榜</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>共 {drivers.length} 位签约正赛车手</span>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '620px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 2fr 2fr 100px 90px 100px', padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line-dark)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                <span>排名</span>
                <span>车手</span>
                <span>所属车队</span>
                <span style={{ textAlign: 'right' }}>分站冠军</span>
                <span style={{ textAlign: 'right' }}>分差</span>
                <span style={{ textAlign: 'right' }}>总积分</span>
              </div>

              {drivers.map((d, idx) => (
                <div
                  key={d.code || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 2fr 2fr 100px 90px 100px',
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
                    <Link href={`/drivers/${d.driverId || d.code.toLowerCase()}`} style={{ fontWeight: 700, fontSize: '15px' }}>
                      {d.name}
                    </Link>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>#{d.number} {d.code}</span>
                  </div>

                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {d.team}
                  </div>

                  <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {d.wins} 胜
                  </div>

                  <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {d.gap === 0 ? '榜首领跑' : `${d.gap} 分`}
                  </div>

                  <div className="tabular-nums" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '17px', color: idx === 0 ? '#ff453a' : 'var(--text-primary)' }}>
                    {d.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. 车队积分榜 (Constructors) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>车队世界锦标赛总积分榜</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>共 {constructors.length} 支制造商品牌</span>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '580px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 3fr 100px 100px 100px', padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line-dark)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                <span>排名</span>
                <span>车队品牌</span>
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
                    <Link href={`/teams/${c.teamId}`}>{c.name}</Link>
                  </div>

                  <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {c.wins} 胜
                  </div>

                  <div className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {c.gap === 0 ? '榜首领跑' : `${c.gap} 分`}
                  </div>

                  <div className="tabular-nums" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '17px', color: idx === 0 ? '#ff453a' : 'var(--text-primary)' }}>
                    {c.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
