// components/circuit_visual.tsx
// 统一真实赛道视觉呈现组件 (CircuitVisual)
// 遵循真实性原则：未知或该年代无对应构型时严禁回退新加坡，清晰展示“赛道构型暂缺”提示

import React from 'react';
import { CircuitRegistry } from '@/lib/circuits/registry';
import { normalizeCircuitId } from '@/lib/circuits/mapping';

interface CircuitVisualProps {
  circuitId: string;
  season?: string;
  layoutId?: string;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

export function CircuitVisual({
  circuitId,
  season,
  layoutId,
  className = '',
  animate = true,
  style = {}
}: CircuitVisualProps) {
  const meta = CircuitRegistry.getCircuit(circuitId, season, layoutId);
  const normalizedKey = normalizeCircuitId(circuitId);

  if (!meta) {
    return (
      <div
        className={`circuit-visual-unavailable card-dark ${className}`}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--line-dark, rgba(255, 255, 255, 0.15))',
          borderRadius: '8px',
          ...style
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.5 }}>🏁</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
          历史赛道构型暂缺
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', maxWidth: '280px', lineHeight: 1.5 }}>
          {circuitId ? `赛道 [${circuitId}]` : '该分站'} 在 {season ? `${season} 年代` : '当前'} 的真实测绘矢量构型暂未收录，严格杜绝使用其他赛道冒充
        </div>
      </div>
    );
  }

  return (
    <div
      className={`circuit-visual-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <svg
        viewBox={meta.viewBox}
        width="100%"
        height="100%"
        style={{
          overflow: 'visible',
          filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.45))',
          maxHeight: '100%'
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id={`shadow-${normalizedKey}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.7" />
          </filter>
          <linearGradient id={`accent-grad-${normalizedKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff453a" />
            <stop offset="100%" stopColor="#ff9f0a" />
          </linearGradient>
        </defs>

        {/* 动态或静态加载 SVG 元素 */}
        <image
          href={meta.svgFile}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          className={animate ? 'circuit-svg-animated' : ''}
        />
      </svg>
    </div>
  );
}
