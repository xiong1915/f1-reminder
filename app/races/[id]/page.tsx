// app/races/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { defaultF1Service } from '@/providers/f1/service';
import { CircuitVisual } from '@/components/circuit_visual';
import { CircuitRegistry } from '@/lib/circuits/registry';
import { formatBeijingDisplay } from '@/lib/f1/time';

export const dynamic = 'force-dynamic';

export default async function RaceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const calendar = await defaultF1Service.getCalendar('2026');
  const roundNum = parseInt(id, 10);
  const race = calendar.find(r => r.meetingId === id || r.circuitId === id || r.round === roundNum);

  if (!race) {
    notFound();
  }

  const circuitMeta = CircuitRegistry.getCircuit(race.circuitId);

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        {/* Navigation */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/races" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ← 返回 2026 年度赛历
          </Link>
        </div>

        {/* Hero Banner: Track as Hero Visual on PC & Mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px', alignItems: 'center', marginBottom: '64px' }}>
          <div>
            <div className="badge-pill badge-red" style={{ marginBottom: '14px' }}>
              第 {race.round} 站 / 全季 {calendar.length} 站 · 2026 赛季
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '12px' }}>
              {race.nameZh || race.name}
            </h1>
            <div style={{ fontSize: '20px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {circuitMeta?.nameZh || race.circuitName} · {race.locality} ({race.country})
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
              {race.isSprintWeekend && <span className="badge-pill badge-red">冲刺周末</span>}
              <span className="badge-pill badge-dark">FIA 认证一级赛道</span>
              {circuitMeta && <span className="badge-pill badge-dark">{circuitMeta.turns} 弯道</span>}
              {circuitMeta && <span className="badge-pill badge-dark">{circuitMeta.lengthKm} 公里</span>}
              {circuitMeta?.drsZones && <span className="badge-pill badge-dark">{circuitMeta.drsZones} 个 DRS 区</span>}
            </div>

            <Link href={`/ai`} className="btn-secondary">
              咨询 TIKE AI 分站战术策略 →
            </Link>
          </div>

          <div
            className="card-dark"
            style={{
              height: 'clamp(280px, 35vw, 420px)',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, rgba(10,10,11,0.95) 75%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <CircuitVisual circuitId={race.circuitId} />
          </div>
        </div>

        {/* Sessions Schedule */}
        <div style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>各节练习与排位/正赛赛程 (北京时间 UTC+8)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(race.sessions || []).map((s, idx) => (
              <div
                key={s.id || idx}
                className="card-dark"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 28px',
                  borderLeft: s.type === 'race' ? '4px solid #ff2d20' : '1px solid var(--line-dark)'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: s.type === 'race' ? '#ff2d20' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {s.nameEn}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                    {s.name}
                  </div>
                </div>

                <div className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700 }}>
                  {s.startTimeUTC ? formatBeijingDisplay(s.startTimeUTC) : '待定'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Specs Table */}
        {race.specs && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>赛道技术规格</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>单圈总长</div>
                <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 800 }}>{race.specs.lengthKm} 公里</div>
              </div>
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>正赛总圈数</div>
                <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 800 }}>{race.specs.laps} 圈</div>
              </div>
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>弯道配置</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{race.specs.turns || '标准配置'}</div>
              </div>
              <div className="card-dark">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>赛道纪录圈速</div>
                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: '#ff453a' }}>{race.specs.lapRecord || '1:34.486'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
