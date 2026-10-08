// app/error.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[TIKE Boundary Error]:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ff453a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        Telemetry Fault · 系统容灾拦截
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginBottom: '16px' }}>
        数据渲染发生非预期异常
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.6, marginBottom: '32px' }}>
        {error.message || '远程 API 服务或网络抖动，系统已触发安全熔断机制。'}
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
        <button onClick={() => reset()} className="btn-primary">重新加载</button>
        <Link href="/" className="btn-secondary">返回首页</Link>
      </div>
    </div>
  );
}
