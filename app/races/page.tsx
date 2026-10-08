// app/races/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';
import { formatBeijingDisplay } from '@/lib/f1/time';

export const dynamic = 'force-dynamic';

export default async function RacesPage() {
  const calendar = await defaultF1Service.getCalendar('2026');
  const sprintCount = calendar.filter(r => r.isSprintWeekend).length;

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        <div style={{ marginBottom: '48px' }}>
          <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
            2026 赛季 FIA 世界一级方程式锦标赛
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            年度分站全赛历 ({calendar.length} 站)
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
            包含全部标准周末与 {sprintCount} 站冲刺赛周末，开赛时间统一换算为北京时间 (UTC+8)
          </p>
        </div>

        {calendar.length === 0 ? (
          <div className="card-dark" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>实时赛历同步中</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px' }}>
              正在与官方 Jolpica 数据节点建立连接。若遇到网络波动，可进入 AI 智能控制台直接提问最新赛程。
            </p>
            <Link href="/ai" className="btn-primary">
              前往 TIKE AI 咨询赛程 →
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
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
                    {race.nameZh || race.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {race.circuitName} · {race.locality}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line-dark)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {race.raceStartUTC ? formatBeijingDisplay(race.raceStartUTC) : '待定'}
                  </span>
                  <Link
                    href={`/races/${race.meetingId || race.round}`}
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    分站详情 →
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
