// app/teams/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teams = await defaultF1Service.getConstructorStandings('2026');
  const drivers = await defaultF1Service.getDriverStandings('2026');

  const team = teams.find(t => t.teamId === id || t.nameEn.toLowerCase().includes(id.toLowerCase()));

  if (!team) {
    notFound();
  }

  const teamDrivers = drivers.filter(d => d.teamId === team.teamId || d.team.includes(team.name));

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        <div style={{ marginBottom: '32px' }}>
          <Link href="/teams" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ← 返回 2026 车队阵容
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px', alignItems: 'center', marginBottom: '64px' }}>
          <div>
            <div className="badge-pill badge-red" style={{ marginBottom: '14px' }}>
              车队世界积分榜第 #{team.rank} 位
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, marginBottom: '8px' }}>
              {team.name}
            </h1>
            <div style={{ fontSize: '20px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {team.nameEn}
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href={`/ai`} className="btn-secondary">
                用 TIKE AI 深度分析 {team.name} 的空力与底盘套件 →
              </Link>
            </div>
          </div>

          <div className="card-dark" style={{ background: 'rgba(255,45,32,0.03)', border: '1px solid rgba(255,45,32,0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>车队总积分</div>
                <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 900, color: '#ff453a' }}>
                  {team.points} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>胜场记录</div>
                <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 900 }}>
                  {team.wins} 胜
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>距车队榜首差距</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: team.gap === 0 ? '#ff453a' : 'var(--text-muted)' }}>
                  {team.gap === 0 ? '车队世界锦标赛榜首领跑' : `${team.gap} 分`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drivers under this team */}
        {teamDrivers.length > 0 && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>代表车手阵容</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {teamDrivers.map(d => (
                <Link key={d.code} href={`/drivers/${d.driverId || d.code.toLowerCase()}`} className="card-dark">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>#{d.number} · {d.code}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{d.name}</div>
                  <div className="tabular-nums" style={{ fontSize: '14px', color: '#ff453a', marginTop: '8px' }}>{d.points} 分</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
