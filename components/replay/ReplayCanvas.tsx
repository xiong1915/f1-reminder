// components/replay/ReplayCanvas.tsx
'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { ReplaySessionMetadata, TelemetryVehicleState } from '@/lib/f1/replay/types';

interface ReplayCanvasProps {
  metadata: ReplaySessionMetadata;
  vehicles: TelemetryVehicleState[];
  selectedDriverCode: string | null;
  onSelectDriver: (code: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ReplayCanvas({
  metadata,
  vehicles,
  selectedDriverCode,
  onSelectDriver,
  className = '',
  style = {}
}: ReplayCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 内部缓存画布尺寸，仅在尺寸变化时重设 buffer，禁止每帧重设
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 800,
    height: 560,
    dpr: 1
  });

  // 1. 尺寸监听 (ResizeObserver)：仅在容器大小变化时调整 canvas 物理尺寸与 DPR
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(240, Math.floor(rect.height || (w * 0.65)));
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

      if (sizeRef.current.width !== w || sizeRef.current.height !== h || sizeRef.current.dpr !== dpr) {
        sizeRef.current = { width: w, height: h, dpr };
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置矩阵
          ctx.scale(dpr, dpr);
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // 2. 高效绘制过程 (仅重绘像素内容，绝对不重设 canvas 尺寸)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewport = sizeRef.current;
    const aspect = metadata.coordinateAspectRatio || 4 / 3;
    const width = Math.min(viewport.width, viewport.height * aspect);
    const height = width / aspect;
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    if (!metadata.trackPath?.length) return;
    ctx.save();
    ctx.translate((viewport.width - width) / 2, (viewport.height - height) / 2);
    const { trackPath, corners, drsZones } = metadata;

    // 清空背景并填充 APEX 深色沉浸底色
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(0, 0, width, height);

    // 微光网格背景
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    ctx.beginPath();
    for (let x = 0; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    if (!trackPath || trackPath.length === 0) return;

    // 绘制赛道基底槽 (粗深灰外发光)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    trackPath.forEach(([nx, ny], idx) => {
      const px = nx * width;
      const py = ny * height;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 16;
    ctx.stroke();

    // 绘制 DRS 区域 (青绿色霓虹光带)
    if (drsZones && drsZones.length > 0) {
      drsZones.forEach(zone => {
        const zonePoints = trackPath.slice(zone.startIndex, zone.endIndex + 1);
        if (zonePoints.length > 1) {
          ctx.beginPath();
          zonePoints.forEach(([nx, ny], idx) => {
            const px = nx * width;
            const py = ny * height;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.strokeStyle = 'rgba(39, 244, 210, 0.35)';
          ctx.lineWidth = 8;
          ctx.stroke();
        }
      });
    }

    // 绘制主行驶线 (白灰色高反差跑道)
    ctx.beginPath();
    trackPath.forEach(([nx, ny], idx) => {
      const px = nx * width;
      const py = ny * height;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 绘制弯角标识
    if (corners && corners.length > 0) {
      ctx.font = '600 10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      corners.forEach(c => {
        const cx = c.x * width;
        const cy = c.y * height;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(`T${c.number}`, cx, cy - 8);
      });
    }

    // 绘制赛车 (Vehicles)
    // 先画普通赛车，选中的车最后画在最顶层
    const sortedVehicles = [...vehicles].sort((a, b) => {
      if (a.code === selectedDriverCode) return 1;
      if (b.code === selectedDriverCode) return -1;
      return a.position - b.position;
    });

    sortedVehicles.forEach(v => {
      ctx.globalAlpha = v.stale ? 0.35 : 1;
      const vx = v.normX * width;
      const vy = v.normY * height;
      const isSelected = v.code === selectedDriverCode;
      const teamColor = v.teamColor || '#ffffff';

      if (isSelected) {
        // 高亮外发光脉冲圆环
        ctx.beginPath();
        ctx.arc(vx, vy, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 45, 32, 0.2)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff453a';
        ctx.stroke();
      }

      // 车辆主体圆点 (带车队标志色)
      ctx.beginPath();
      ctx.arc(vx, vy, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 车手代码小标签
      ctx.font = isSelected ? '700 11px sans-serif' : '600 9px monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(v.stale ? `${v.code} · 数据缺口` : v.code, vx, vy - (isSelected ? 14 : 9));

      // 若处于 DRS 状态，绘制顶部微型绿色光标
      if (!v.stale && !v.telemetryStale && v.drs) {
        ctx.fillStyle = '#30d158';
        ctx.fillRect(vx - 4, vy + 8, 8, 2);
      }
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }, [metadata, vehicles, selectedDriverCode]);

  useEffect(() => {
    draw();
  }, [draw]);

  // 点击画布选择邻近车手
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const viewport = sizeRef.current;
    const aspect = metadata.coordinateAspectRatio || 4 / 3;
    const width = Math.min(viewport.width, viewport.height * aspect);
    const height = width / aspect;
    const clickX = e.clientX - rect.left - (viewport.width - width) / 2;
    const clickY = e.clientY - rect.top - (viewport.height - height) / 2;

    let closestCode: string | null = null;
    let minDistance = 24; // 24px 命中容限

    vehicles.forEach(v => {
      const vx = v.normX * width;
      const vy = v.normY * height;
      const dist = Math.hypot(clickX - vx, clickY - vy);
      if (dist < minDistance) {
        minDistance = dist;
        closestCode = v.code;
      }
    });

    onSelectDriver(closestCode);
  };

  return (
    <div
      ref={containerRef}
      className={`replay-canvas-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '380px',
        overflow: 'hidden',
        background: '#090a0d',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          display: 'block',
          cursor: 'pointer'
        }}
      />
    </div>
  );
}
