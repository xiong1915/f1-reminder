// app/teams/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const teams = await defaultF1Service.getConstructorStandings('2026');

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        <div style={{ marginBottom: '48px' }}>
          <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
            2026 赛季 FIA 制造商品牌名录
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            2026 赛季制造商品牌阵容
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
            统计包含当前赛季车队总积分、分站冠军数及年度车队世界总冠军争夺
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {teams.map(t => (
            <Link
              key={t.teamId}
              href={`/teams/${t.teamId}`}
              className="card-dark"
              style={{
                display: 'block',
                transition: 'transform 0.2s, border-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: t.rank <= 3 ? '#ff453a' : 'var(--text-muted)' }}>
                  第 {t.rank} 名
                </span>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t.wins} 场胜绩
                </span>
              </div>

              <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>
                {t.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                {t.nameEn}
              </div>

              <div style={{ borderTop: '1px solid var(--line-dark)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t.gap === 0 ? '车队积分榜首领跑' : `分差 ${t.gap} 分`}
                </span>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '18px', color: '#ff453a' }}>
                  {t.points} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
