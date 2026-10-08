// app/drivers/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export default async function DriverDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drivers = await defaultF1Service.getDriverStandings('2026');
  const driver = drivers.find(d => d.driverId === id || d.code.toLowerCase() === id.toLowerCase());

  if (!driver) {
    notFound();
  }

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        <div style={{ marginBottom: '32px' }}>
          <Link href="/drivers" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ← 返回 2026 车手阵容
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px', alignItems: 'center', marginBottom: '64px' }}>
          <div>
            <div className="badge-pill badge-red" style={{ marginBottom: '14px' }}>
              赛车车号 #{driver.number} · 缩写代码 {driver.code}
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, marginBottom: '8px' }}>
              {driver.name}
            </h1>
            <div style={{ fontSize: '20px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {driver.nameEn} · {driver.team}
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href={`/ai`} className="btn-secondary">
                用 TIKE AI 分析 {driver.name} 的表现 →
              </Link>
            </div>
          </div>

          <div className="card-dark" style={{ background: 'rgba(255,45,32,0.03)', border: '1px solid rgba(255,45,32,0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>车手积分榜排名</div>
                <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 900, color: '#ff453a' }}>
                  第 {driver.rank} 位
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>当前总积分</div>
                <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 900 }}>
                  {driver.points} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)' }}>分</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>分站冠军胜场</div>
                <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 800 }}>
                  {driver.wins} 场
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>距榜首积分差距</div>
                <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 800, color: driver.gap === 0 ? '#ff453a' : 'var(--text-muted)' }}>
                  {driver.gap === 0 ? '榜首领跑' : `${driver.gap} 分`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
