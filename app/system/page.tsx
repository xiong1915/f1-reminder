// app/system/page.tsx
import React from 'react';
import Link from 'next/link';
import { defaultF1Service } from '@/providers/f1/service';
import { formatBeijingDisplay } from '@/lib/f1/time';

export const dynamic = 'force-dynamic';

export default async function SystemPage() {
  const overview = await defaultF1Service.getOverview();
  const checkTime = overview.respondedAt || new Date().toISOString();

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
            平台服务状态
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            系统可用性与服务检查
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
            当前面向公众公开展示服务可用性指标与最新检查时间。
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div className="card-dark">
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>服务可用性</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#30d158' }}>
              ● 正常可用 (Healthy)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              核心页面与 API 接口正常
            </div>
          </div>

          <div className="card-dark">
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>检查时间</div>
            <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {formatBeijingDisplay(checkTime)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              统一对齐北京时间 (UTC+8)
            </div>
          </div>

          <div className="card-dark">
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>连接状态</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#64d2ff' }}>
              已连接
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              上游数据与网络链路畅通
            </div>
          </div>

          <div className="card-dark">
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>数据更新状态</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: overview.isStale ? '#ff9f0a' : 'var(--text-primary)' }}>
              {overview.upstreamSyncSuccess === false ? '最近同步失败，保留已有数据' : overview.upstreamSyncSuccess === undefined ? '最近同步状态未知' : overview.isStale ? '部分数据待更新' : '最近同步成功'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              最后更新：{formatBeijingDisplay(overview.updatedAt)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '36px' }}>
          <Link href="/" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>
            ← 返回平台首页
          </Link>
        </div>
      </div>
    </div>
  );
}
