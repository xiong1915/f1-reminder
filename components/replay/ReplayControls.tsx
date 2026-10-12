// components/replay/ReplayControls.tsx
'use client';

import React from 'react';

interface ReplayControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  speed: number;
  onChangeSpeed: (spd: number) => void;
  onRestart: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ReplayControls({
  isPlaying,
  onTogglePlay,
  currentMs,
  durationMs,
  onSeek,
  speed,
  onChangeSpeed,
  onRestart,
  isFullscreen,
  onToggleFullscreen
}: ReplayControlsProps) {
  const speeds = [0.5, 1, 2, 4, 8];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onSeek(val);
  };

  const skip = (deltaMs: number) => {
    const target = Math.max(0, Math.min(durationMs, currentMs + deltaMs));
    onSeek(target);
  };

  return (
    <div
      className="card-dark replay-controls-card"
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        background: 'rgba(18, 18, 20, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--line-dark)'
      }}
    >
      {/* 进度条与时间显示 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span
          className="tabular-nums"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#ffffff', minWidth: '46px' }}
        >
          {formatTime(currentMs)}
        </span>

        <input
          type="range"
          min={0}
          max={durationMs}
          step={100}
          value={currentMs}
          onChange={handleSliderChange}
          style={{
            flex: 1,
            accentColor: 'var(--accent-red, #ff453a)',
            cursor: 'pointer',
            height: '6px'
          }}
        />

        <span
          className="tabular-nums"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', minWidth: '46px' }}
        >
          {formatTime(durationMs)}
        </span>
      </div>

      {/* 控制按钮与倍速切换 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* 左侧控制按钮群 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onRestart}
            title="重新开始"
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            ↺ 重置
          </button>

          <button
            onClick={() => skip(-5000)}
            title="后退 5 秒"
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            -5s
          </button>

          <button
            onClick={onTogglePlay}
            className="btn-primary"
            style={{ padding: '6px 20px', fontSize: '13px', minWidth: '80px', fontWeight: 700 }}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>

          <button
            onClick={() => skip(5000)}
            title="快进 5 秒"
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            +5s
          </button>
        </div>

        {/* 右侧：倍速与全屏控制 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px' }}>
            {speeds.map(s => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                style={{
                  background: speed === s ? 'var(--accent-red, #ff453a)' : 'transparent',
                  color: speed === s ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* 全屏切换按钮 */}
          <button
            onClick={onToggleFullscreen}
            className="btn-secondary"
            title={isFullscreen ? '退出全屏 (Esc)' : '全屏沉浸观看'}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{isFullscreen ? '↙ 退出全屏' : '⛶ 全屏'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
