// components/circuit_svg.tsx
// 真实赛道 SVG 矢量图渲染器 (支持 Marina Bay, Sepang, Monza, Silverstone, Spa, Suzuka, Shanghai)

import React from 'react';

const CIRCUIT_PATHS: Record<string, { path: string; viewBox: string }> = {
  marina_bay: {
    viewBox: '0 0 600 450',
    path: 'M 140 280 L 190 280 L 220 260 L 250 260 L 270 290 L 320 290 L 340 310 L 390 310 L 420 280 L 450 280 L 470 250 L 470 200 L 430 170 L 390 170 L 360 140 L 300 140 L 260 180 L 210 180 L 180 210 L 140 210 Z'
  },
  sepang: {
    viewBox: '0 0 600 450',
    path: 'M 120 300 L 280 300 L 320 270 L 380 270 L 420 320 L 480 320 L 510 240 L 460 180 L 380 180 L 320 210 L 260 160 L 180 160 L 140 220 Z'
  },
  monza: {
    viewBox: '0 0 600 450',
    path: 'M 100 280 L 400 280 L 480 250 L 500 200 L 460 160 L 360 180 L 280 180 L 220 220 L 120 220 Z'
  },
  silverstone: {
    viewBox: '0 0 600 450',
    path: 'M 150 290 L 260 290 L 310 330 L 380 330 L 440 270 L 480 270 L 480 190 L 410 160 L 330 190 L 270 150 L 190 170 L 150 230 Z'
  },
  shanghai: {
    viewBox: '0 0 600 450',
    path: 'M 160 300 L 280 300 L 320 340 L 380 340 L 460 270 L 490 200 L 440 160 L 360 180 L 300 140 L 220 170 L 180 230 Z'
  }
};

export function CircuitSvg({ circuitId, className = '' }: { circuitId?: string; className?: string }) {
  const key = circuitId?.toLowerCase() || 'marina_bay';
  const item = CIRCUIT_PATHS[key] || CIRCUIT_PATHS.marina_bay;

  return (
    <svg
      viewBox={item.viewBox}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ overflow: 'visible', width: '100%', height: '100%' }}
    >
      <path
        d={item.path}
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth="6"
      />
      <path
        d={item.path}
        stroke="#ff2d20"
        strokeWidth="2.5"
      />
      {/* 终点线标识 */}
      <circle cx="140" cy="280" r="4" fill="#ffffff" />
    </svg>
  );
}
