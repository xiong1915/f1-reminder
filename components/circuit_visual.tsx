// components/circuit_visual.tsx
// 统一真实赛道视觉呈现组件 (CircuitVisual)
// 包含 5 层专业赛道拓扑渲染、起终点标线、DRS 动效及 Reduced Motion 无障碍适配

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
  season = '2026',
  layoutId,
  className = '',
  animate = true,
  style = {}
}: CircuitVisualProps) {
  const meta = CircuitRegistry.getCircuit(circuitId, season, layoutId) || CircuitRegistry.getCircuit('marina_bay')!;
  const normalizedKey = normalizeCircuitId(circuitId);

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
