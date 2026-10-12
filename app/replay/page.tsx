// app/replay/page.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  REAL_REPLAY_SESSIONS,
  DEMO_REPLAY_SESSIONS,
  ALL_REPLAY_SESSIONS,
  interpolateVehiclesAtTimestamp
} from '@/lib/f1/replay/real-sessions';
import { ReplayCanvas } from '@/components/replay/ReplayCanvas';
import { ReplayControls } from '@/components/replay/ReplayControls';
import { Leaderboard } from '@/components/replay/Leaderboard';
import type { ReplayManifest, OpenSession } from '@/lib/f1/replay/openf1';
import { TelemetryVehicleState, ReplayFrame } from '@/lib/f1/replay/types';

function ReplayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 获取当前场次标识，严格遵循真实性原则：未收录场次绝不默认播巴林
  const sessionParam = searchParams.get('session');
  const seasonParam = searchParams.get('season');
  const roundParam = searchParams.get('round');

  const requestedYear = seasonParam || String(new Date().getUTCFullYear());
  const [sessions, setSessions] = useState<(OpenSession & { round?: number; nameZh?: string })[]>([]);
  const [manifest, setManifest] = useState<ReplayManifest | null>(null);
  const [windowFrames, setWindowFrames] = useState<ReplayFrame[]>([]);
  const [loadedOffset, setLoadedOffset] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const explicitDemo = !!sessionParam?.startsWith('demo-') && !!DEMO_REPLAY_SESSIONS[sessionParam];
  const selectedSession = sessionParam?.startsWith('openf1-') ? Number(sessionParam.slice(7))
    : sessionParam && !explicitDemo ? null : sessions.find(s => !roundParam || String(s.round) === roundParam)?.session_key;
  const activeSessionKey = explicitDemo ? sessionParam! : selectedSession ? `openf1-${selectedSession}` : '';
  const isRequestedSessionMissing = !explicitDemo && !loading && (!!loadError || !selectedSession);
  const dataset = explicitDemo ? DEMO_REPLAY_SESSIONS[sessionParam!] : { metadata: manifest?.metadata || DEMO_REPLAY_SESSIONS['demo-singapore'].metadata, frames: windowFrames };
  const { metadata, frames } = dataset;
  const durationMs = metadata.durationSeconds * 1000;
  const isDemo = explicitDemo;
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentMs, setCurrentMs] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [selectedDriverCode, setSelectedDriverCode] = useState<string | null>('VER');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const windowCache = useRef(new Map<string, ReplayFrame[]>());

  useEffect(() => {
    if (explicitDemo) return;
    const controller = new AbortController();
    setLoading(true); setLoadError(''); setSessions([]);
    fetch(`/api/f1/replay?season=${encodeURIComponent(requestedYear)}`, { signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; })
      .then(data => setSessions(data.sessions))
      .catch(e => { if (!controller.signal.aborted) setLoadError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestedYear, explicitDemo]);

  useEffect(() => {
    if (explicitDemo || !selectedSession) { setManifest(null); return; }
    const controller = new AbortController();
    setLoading(true); setLoadError(''); setManifest(null); setWindowFrames([]); setLoadedOffset(null); setCurrentMs(0);
    fetch(`/api/f1/replay?key=${selectedSession}`, { signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; })
      .then(data => setManifest(data))
      .catch(e => { if (!controller.signal.aborted) setLoadError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedSession, explicitDemo]);

  const windowOffset = Math.floor(Math.min(currentMs, Math.max(0, durationMs - 1)) / 60000) * 60;
  const buffering = !explicitDemo && (!manifest || loadedOffset !== windowOffset);
  useEffect(() => {
    if (explicitDemo || !manifest) return;
    const cacheKey = `${manifest.session.session_key}:${windowOffset}`;
    const cached = windowCache.current.get(cacheKey);
    if (cached) { setWindowFrames(cached); setLoadedOffset(windowOffset); return; }
    const controller = new AbortController();
    setLoadError('');
    fetch(`/api/f1/replay?key=${manifest.session.session_key}&offset=${windowOffset}`, { signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; })
      .then(data => {
        if (windowCache.current.size >= 6) windowCache.current.delete(windowCache.current.keys().next().value!);
        windowCache.current.set(cacheKey, data.frames);
        setWindowFrames(data.frames); setLoadedOffset(windowOffset);
      })
      .catch(e => { if (!controller.signal.aborted) { setLoadError(e.message); setIsPlaying(false); } });
    return () => controller.abort();
  }, [manifest, windowOffset, explicitDemo]);

  useEffect(() => {
    if (explicitDemo || !manifest || loadedOffset === null) return;
    const next = loadedOffset + 60;
    if (next >= manifest.metadata.durationSeconds) return;
    const cacheKey = `${manifest.session.session_key}:${next}`;
    if (windowCache.current.has(cacheKey)) return;
    const controller = new AbortController();
    fetch(`/api/f1/replay?key=${manifest.session.session_key}&offset=${next}`, { signal: controller.signal })
      .then(async r => { if (!r.ok) return null; return r.json(); })
      .then(data => {
        if (data) {
          if (windowCache.current.size >= 6) windowCache.current.delete(windowCache.current.keys().next().value!);
          windowCache.current.set(cacheKey, data.frames);
        }
      }).catch(() => {});
    return () => controller.abort();
  }, [manifest, loadedOffset, explicitDemo]);

  // 场次切换
  const handleSelectSession = (key: string) => {
    router.push(`/replay?season=${requestedYear}&session=${key}`);
    setCurrentMs(0);
    setIsPlaying(true);
  };

  // 全屏切换与 Esc 监听
  const toggleFullscreen = () => {
    const el = workbenchRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(!isFullscreen));
      } else {
        setIsFullscreen(!isFullscreen);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => setIsFullscreen(false));
      } else {
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // 高帧率动画时间轴循环驱动
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimeRef.current != null && isPlaying && !buffering && !isRequestedSessionMissing) {
        const delta = timestamp - lastTimeRef.current;
        setCurrentMs(prev => {
          const next = prev + delta * speed;
          if (next >= durationMs) {
            return durationMs; // 停留在比赛结束，不自动跳回开头
          }
          return next;
        });
      }
      lastTimeRef.current = timestamp;
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed, durationMs, buffering, isRequestedSessionMissing]);

  // 根据当前精确时间戳进行非均匀真实插值 (严格执行 >3s 缺口不跨越插值规则)
  const currentVehicles = useMemo((): TelemetryVehicleState[] => {
    return buffering ? [] : interpolateVehiclesAtTimestamp(frames, currentMs, 3000);
  }, [frames, currentMs, buffering]);

  // 当前选中聚焦车手
  const selectedVehicle = useMemo(() => {
    if (!selectedDriverCode) return null;
    return currentVehicles.find(v => v.code === selectedDriverCode) || null;
  }, [selectedDriverCode, currentVehicles]);

  const handleTogglePlay = () => setIsPlaying(!isPlaying);
  const handleSeek = (ms: number) => setCurrentMs(ms);
  const handleRestart = () => setCurrentMs(0);
  const handleChangeSpeed = (s: number) => setSpeed(s);
  useEffect(() => {
    if (currentMs >= durationMs && isPlaying && !buffering) setIsPlaying(false);
  }, [currentMs, durationMs, isPlaying, buffering]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-black, #090a0d)', color: 'var(--text-primary, #ffffff)', paddingBottom: '80px' }}>
      {/* 顶部导航与面包装饰 */}
      <section style={{ borderBottom: '1px solid var(--line-dark, rgba(255,255,255,0.1))', paddingTop: '80px', paddingBottom: '24px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted, #71717a)', marginBottom: '16px' }}>
            <Link href="/" style={{ color: 'var(--text-secondary, #94a3b8)' }}>首页</Link>
            <span>/</span>
            <Link href="/races" style={{ color: 'var(--text-secondary, #94a3b8)' }}>赛历</Link>
            <span>/</span>
            <span style={{ color: '#ffffff' }}>APEX REPLAY 比赛动态回放</span>
          </div>

          {/* 未收录场次提示卡片 (严禁静默回退为仿真) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <label>回放赛季 <select value={requestedYear} onChange={e => router.push(`/replay?season=${e.target.value}`)}>
              {Array.from({ length: Math.max(1, new Date().getUTCFullYear() - 2022) }, (_, i) => String(new Date().getUTCFullYear() - i)).map(y => <option key={y} value={y}>{y}</option>)}
            </select></label>
            <label>真实正赛 <select value={activeSessionKey} onChange={e => handleSelectSession(e.target.value)}>
              <option value="">选择已结束的比赛</option>
              {sessions.map(s => <option key={s.session_key} value={`openf1-${s.session_key}`}>{s.nameZh}</option>)}
            </select></label>
            <Link href="/replay?session=demo-singapore">DEMO 演示</Link>
          </div>
          {(loading || buffering) && !loadError && <p role="status">正在加载真实比赛数据，请稍候…</p>}
          {loadError && <p role="alert">数据暂不可用：{loadError} <button onClick={() => window.location.reload()}>重试</button></p>}
          {isRequestedSessionMissing && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px 20px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#f87171', fontSize: '14px', marginBottom: '4px' }}>
                  ⚠️ 所选年份/分站的高频遥测数据未收录
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  数据源中未收录所选场次的毫秒级遥测记录。系统坚决杜绝静默使用虚假数据冒充真实比赛。可选择体验独立 DEMO 算法仿真演示或查看官方赛历：
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => handleSelectSession('demo-singapore')} className="btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                  体验 DEMO 仿真 (滨海湾)
                </button>
                <button onClick={() => handleSelectSession('demo-bahrain')} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                  体验 DEMO 仿真 (萨基尔)
                </button>
                <button onClick={() => handleSelectSession('demo-silverstone')} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                  体验 DEMO 仿真 (银石)
                </button>
                <Link href={seasonParam ? `/races?season=${seasonParam}` : '/races'} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                  返回官方赛历
                </Link>
              </div>
            </div>
          )}

          {!isRequestedSessionMissing && (explicitDemo || manifest) && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <div className="badge-pill badge-red">
                  APEX REPLAY · 赛道回放引擎
                </div>
                {isDemo ? (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#f87171'
                  }}>
                    DEMO 算法仿真模式
                  </div>
                ) : (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(48, 209, 88, 0.15)',
                    border: '1px solid rgba(48, 209, 88, 0.5)',
                    color: '#30d158'
                  }}>
                    ✓ OpenF1 历史遥测 ({metadata.season} 赛季)
                  </div>
                )}
              </div>

              <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                {metadata.title}
              </h1>

              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '14px', maxWidth: '720px', marginTop: '10px', lineHeight: 1.6 }}>
                {isDemo
                  ? '【DEMO 演示模式】当前为独立算法仿真演示，用于验证赛道渲染与控件逻辑，非真实历史赛事遥测。'
                  : `【OpenF1 历史数据】时间轴覆盖场次开始至最后有效完赛圈，时长约 ${Math.ceil(metadata.durationSeconds / 60)} 分钟。按需加载位置与遥测记录；缺口明确标注。OpenF1 为第三方数据源，位置是近似测量值。`}
              </p>
            </div>

            {/* 比赛场次选择下拉切换 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #71717a)', letterSpacing: '0.05em' }}>
                切换历史回放场次：
              </div>
              <select
                value={activeSessionKey}
                onChange={e => handleSelectSession(e.target.value)}
                style={{
                  background: 'var(--bg-secondary, #18181b)',
                  color: '#ffffff',
                  border: '1px solid var(--line-dark, rgba(255, 255, 255, 0.15))',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '260px'
                }}
              >
                <optgroup label="DEMO 算法仿真模式 (交互与渲染演示)">
                  <option value="demo-singapore">【DEMO】滨海湾市街赛道 60s 算法仿真</option>
                  <option value="demo-bahrain">【DEMO】萨基尔国际赛车场 180s 算法仿真</option>
                  <option value="demo-silverstone">【DEMO】银石赛道 180s 算法仿真</option>
                </optgroup>
                <optgroup label="OpenF1 真实历史正赛">
                  {sessions.map(s => <option key={s.session_key} value={`openf1-${s.session_key}`}>{s.year} {s.nameZh}</option>)}
                </optgroup>              </select>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span className="badge-pill badge-dark" style={{ fontSize: '10px' }}>
                  {metadata.circuitName}
                </span>
                <span className="badge-pill badge-dark" style={{ fontSize: '10px' }}>
                  时长: {metadata.durationSeconds} 秒
                </span>
              </div>
            </div>
          </div>}
        </div>
      </section>

      {/* 主回放工作台：支持一键全屏与横屏优化 */}
      {!isRequestedSessionMissing && (explicitDemo || manifest) && <section style={{ paddingTop: '24px' }}>
        <div className="container">
          <div
            ref={workbenchRef}
            className={`replay-workbench ${isFullscreen ? 'replay-fullscreen-mode' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: isFullscreen ? 'minmax(0, 1fr) 340px' : 'minmax(0, 1.8fr) minmax(300px, 1fr)',
              gap: '20px',
              alignItems: 'stretch',
              ...(isFullscreen ? {
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: '#090a0d',
                padding: '20px',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden'
              } : {})
            }}
          >
            {/* 左侧：赛道画布 + 播放控制 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
              <div style={{ flex: 1, minHeight: isFullscreen ? 'calc(100vh - 140px)' : '480px', width: '100%' }}>
                <ReplayCanvas
                  metadata={metadata}
                  vehicles={currentVehicles}
                  selectedDriverCode={selectedDriverCode}
                  onSelectDriver={setSelectedDriverCode}
                  style={{ height: '100%' }}
                />
              </div>

              <ReplayControls
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                currentMs={currentMs}
                durationMs={durationMs}
                onSeek={handleSeek}
                speed={speed}
                onChangeSpeed={handleChangeSpeed}
                onRestart={handleRestart}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            </div>

            {/* 右侧：实时赛况监测塔与选中单车数据 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', maxHeight: isFullscreen ? 'calc(100vh - 40px)' : 'none' }}>
              {selectedVehicle && (
                <div
                  className="card-dark"
                  style={{
                    padding: '14px 18px',
                    borderLeft: `4px solid ${selectedVehicle.teamColor || 'var(--accent-red, #ff453a)'}`,
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #71717a)', fontFamily: 'var(--font-mono)' }}>
                      FOCUSED VEHICLE · 追踪车辆
                    </div>
                    <button
                      onClick={() => setSelectedDriverCode(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted, #71717a)', cursor: 'pointer', fontSize: '11px' }}
                    >
                      ✕ 取消
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
                        P{selectedVehicle.position || '—'} {selectedVehicle.name} ({selectedVehicle.code})
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                        {selectedVehicle.team} · #{selectedVehicle.driverNumber} · 圈数 {selectedVehicle.lap || '—'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                        {selectedVehicle.stale || selectedVehicle.telemetryStale ? '数据缺失' : selectedVehicle.speed} <span style={{ fontSize: '11px', color: 'var(--text-muted, #71717a)', fontWeight: 400 }}>km/h</span>
                      </div>
                      <div style={{ fontSize: '11px', color: selectedVehicle.drs ? '#30d158' : 'var(--text-muted, #71717a)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        {selectedVehicle.stale || selectedVehicle.telemetryStale ? '遥测暂缺' : `挡位 G${selectedVehicle.gear}`} {!selectedVehicle.stale && !selectedVehicle.telemetryStale && selectedVehicle.drs ? '· [DRS]' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minHeight: '380px', overflowY: 'auto' }}>
                <Leaderboard
                  vehicles={currentVehicles}
                  selectedDriverCode={selectedDriverCode}
                  onSelectDriver={setSelectedDriverCode}
                />
              </div>
            </div>
          </div>
        </div>
      </section>}
    </div>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#090a0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
        加载比赛动态回放中...
      </div>
    }>
      <ReplayContent />
    </Suspense>
  );
}
