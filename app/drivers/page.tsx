// app/drivers/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  const drivers = await defaultF1Service.getDriverStandings('2026');
  const primaryDrivers = drivers.slice(0, 20);
  const reserveDrivers = drivers.slice(20);

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        <div style={{ marginBottom: '48px' }}>
          <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
            2026 赛季 FIA 正式车手名册
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            2026 赛季正式车手阵容
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
            包含 10 支车队共 20 位全赛季正式签约车手，以及出战替补车手记录
          </p>
        </div>

        {/* 1. 20 位正式现役车手 */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>全赛季正式席位车手 (20位)</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>10 支车队现役主力车手</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {primaryDrivers.map(d => (
              <Link
                key={d.code}
                href={`/drivers/${d.driverId || d.code.toLowerCase()}`}
                className="card-dark"
                style={{
                  display: 'block',
                  transition: 'transform 0.2s, border-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: d.rank <= 3 ? '#ff453a' : 'var(--text-muted)' }}>
                    #{d.number}
                  </span>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    第 {d.rank} 名
                  </span>
                </div>

                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {d.nameEn}
                </div>

                <div style={{ borderTop: '1px solid var(--line-dark)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{d.team}</span>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '16px', color: '#ff453a' }}>
                    {d.points} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2. 替补与出场储备车手 (如有) */}
        {reserveDrivers.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderTop: '1px solid var(--line-dark)', paddingTop: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>赛季出场与替补车手</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>共 {reserveDrivers.length} 位</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {reserveDrivers.map(d => (
                <Link
                  key={d.code}
                  href={`/drivers/${d.driverId || d.code.toLowerCase()}`}
                  className="card-dark"
                  style={{
                    display: 'block',
                    opacity: 0.85,
                    transition: 'transform 0.2s, border-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                    <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      #{d.number}
                    </span>
                    <span className="badge-pill badge-dark" style={{ fontSize: '11px' }}>
                      替补出场
                    </span>
                  </div>

                  <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    {d.nameEn}
                  </div>

                  <div style={{ borderTop: '1px solid var(--line-dark)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{d.team}</span>
                    <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px' }}>
                      {d.points} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
