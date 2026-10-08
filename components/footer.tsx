// components/footer.tsx
import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--line-dark)', padding: '80px 0 40px' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '48px' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '0.08em', marginBottom: '12px' }}>
            TIKE · 一级方程式赛车数据平台
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.6 }}>
            一级方程式赛车数据与赛事分析平台。提供分站赛程、积分榜与车况洞察。
          </p>
        </div>

        <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              平台导航
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <Link href="/#race" style={{ color: 'var(--text-secondary)' }}>当前分站赛程</Link>
              <Link href="/standings" style={{ color: 'var(--text-secondary)' }}>锦标赛积分榜</Link>
              <Link href="/drivers" style={{ color: 'var(--text-secondary)' }}>2026 正式车手</Link>
              <Link href="/teams" style={{ color: 'var(--text-secondary)' }}>车队与制造商</Link>
              <Link href="/races" style={{ color: 'var(--text-secondary)' }}>年度全站赛历</Link>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              数据与智能
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <Link href="/ai" style={{ color: 'var(--text-secondary)' }}>TIKE AI 智能控制台</Link>
              <Link href="/system" style={{ color: 'var(--text-secondary)' }}>系统遥测与健康状态</Link>
              <Link href="/api/f1/overview" target="_blank" style={{ color: 'var(--text-muted)' }}>赛季概览接口 (JSON)</Link>
              <Link href="/api/f1/calendar" target="_blank" style={{ color: 'var(--text-muted)' }}>全赛历接口 (JSON)</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ borderTop: '1px solid var(--line-dark)', marginTop: '64px', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div>
          非官方 F1 数据项目。与 FIA、Formula 1 及各参赛车队无商业隶属关系。所有比赛开赛时间均自动换算为北京时间 (UTC+8)。
        </div>
        <div>
          TIKE V3 · 2026 赛季
        </div>
      </div>
    </footer>
  );
}
