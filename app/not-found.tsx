// app/not-found.tsx
import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ff453a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        404 · Pit Lane Missed
      </div>
      <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: '16px' }}>
        未检索到目标赛道或页面
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.6, marginBottom: '32px' }}>
        您请求的页面或分站不存在，或赛季赛程已发生调整。请返回比赛中心或直接通过 TIKE AI 查询。
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Link href="/" className="btn-primary">返回主页</Link>
        <Link href="/ai" className="btn-secondary">向 AI 提问</Link>
      </div>
    </div>
  );
}
