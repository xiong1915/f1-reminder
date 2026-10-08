// app/system/page.tsx
import React from 'react';
import { defaultRegistry } from '@/lib/ai/registry';
import { getStorageInfo } from '@/lib/storage';
import { defaultF1Service } from '@/providers/f1/service';
import { BUILD_ID, BUILD_ENV, BUILD_TIMESTAMP } from '@/lib/build-info';

export const dynamic = 'force-dynamic';

export default async function SystemPage() {
  const healthList = await defaultRegistry.getAllHealth();
  const activeProviderId = process.env.AI_PROVIDER?.toLowerCase() || 'deepseek';
  const activeHealth = healthList.find(h => h.providerId === activeProviderId) || healthList[0];

  const overview = await defaultF1Service.getOverview();
  const storageInfo = getStorageInfo();

  return (
    <div className="section-dark" style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 0 100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div className="badge-pill badge-red" style={{ marginBottom: '12px' }}>
            TIKE V3 系统遥测与架构状态
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            系统遥测与基础设施健康状态
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
            纯零付费基础设施架构 (¥0/月)。安全隔离机制生效中，所有 API 凭据严禁在前端或日志暴露。
          </p>
        </div>

        {/* 1. AI Provider Status (核心指标) */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>AI 智能模型引擎</span>
            <span className="badge-pill badge-red" style={{ fontSize: '10px' }}>正常运行</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>当前主提供者</div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{activeHealth?.providerName || 'DeepSeek AI'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>标识: {activeHealth?.providerId}</div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>生效模型 (Model)</div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{activeHealth?.model || 'deepseek-chat'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>支持流式推理与结构化解析</div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>协议类型 (API Style)</div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{activeHealth?.apiStyle || 'chat-completions'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>全双工 SSE 实时流式输出</div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>运行健康度</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: activeHealth?.status === 'healthy' ? '#30d158' : '#ff9f0a' }}>
                {activeHealth?.status === 'healthy' ? '● 状态健康 (Healthy)' : '○ 服务降级'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                响应延迟: {activeHealth?.latencyMs ? `${activeHealth.latencyMs}ms` : '常规网络'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Registered Providers Overview */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>已注册 AI 模型服务提供商</h2>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line-dark)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
              <span>服务提供商</span>
              <span>模型标识</span>
              <span>接口协议</span>
              <span style={{ textAlign: 'right' }}>健康状态</span>
            </div>

            {healthList.map(h => (
              <div key={h.providerId} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', padding: '18px 24px', borderBottom: '1px solid var(--line-dark)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{h.providerName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{h.providerId}</div>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{h.model}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{h.apiStyle}</div>
                <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: h.status === 'healthy' ? '#30d158' : '#ff9f0a' }}>
                  {h.status === 'healthy' ? '健康 (Healthy)' : '配置待命'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Storage Layer & Persistence Telemetry */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>统一存储与持久化层</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>存储适配器模式</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: storageInfo.persistent ? '#30d158' : '#64d2ff' }}>
                {storageInfo.provider === 'redis' ? 'Upstash Redis' : '内存模式 (In-Memory)'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                状态: {storageInfo.persistent ? 'Persistent (云端持久化)' : '临时内存 (In-Memory)'}
              </div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>飞书幂等与防重机制</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#30d158' }}>
                {storageInfo.persistent ? 'SET NX 原子防重' : 'Map 互斥防重'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                TTL 保护窗口: 600 秒
              </div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>F1 权威数据源模式</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>
                {overview.dataSource === 'live' ? '● Jolpica Live (实时链路)' : (overview.dataSource === 'lkg' ? '○ LKG 权威快照' : '⚠ 暂不可用')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                当前赛季: {overview.season} · 全年总场次: {overview.totalRounds || 0} 站
              </div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>基础设施费用指标</div>
              <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: '#30d158' }}>¥0 / 月</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>严格遵守免费层 (Free Tier) 原则</div>
            </div>
          </div>
        </div>

        {/* 4. Production Topology & Build Fingerprint */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>生产拓扑与构建指纹 (Build Fingerprint)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>X-APEX-Build 指纹</div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#64d2ff' }}>{BUILD_ID}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>唯一构建标识，用于检测生产混流</div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>运行环境 (Environment)</div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>{BUILD_ENV}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Next.js App Router on Vercel Edge</div>
            </div>

            <div className="card-dark">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>构建时间戳 (UTC)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{BUILD_TIMESTAMP}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>发布流水线元数据</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
