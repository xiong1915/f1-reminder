// components/replay/Leaderboard.tsx
'use client';

import React from 'react';
import { TelemetryVehicleState } from '@/lib/f1/replay/types';

interface LeaderboardProps {
  vehicles: TelemetryVehicleState[];
  selectedDriverCode: string | null;
  onSelectDriver: (code: string | null) => void;
}

export function Leaderboard({
  vehicles,
  selectedDriverCode,
  onSelectDriver
}: LeaderboardProps) {
  const sorted = [...vehicles].sort((a, b) => a.position - b.position);

  return (
    <div className="card-dark" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 头部标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--line-dark)', paddingBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', color: '#ffffff' }}>
          历史赛况回放 (REPLAY)
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {vehicles.length} 辆赛车
        </div>
      </div>

      {/* 车手列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {sorted.map(car => {
          const isSelected = car.code === selectedDriverCode;
          return (
            <div
              key={car.code}
              onClick={() => onSelectDriver(isSelected ? null : car.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '6px',
                background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid',
                borderColor: isSelected ? car.teamColor || 'var(--accent-red)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* 左侧：名次、车队色条、代号、车号 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="tabular-nums" style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: car.position <= 3 ? '#ff2d20' : 'var(--text-muted)',
                  width: '20px'
                }}>
                  {car.position || '—'}
                </span>

                <div style={{
                  width: '3px',
                  height: '18px',
                  borderRadius: '2px',
                  background: car.teamColor || '#ffffff'
                }} />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
                      {car.code}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      #{car.driverNumber}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {car.name}
                  </div>
                </div>
              </div>

              {/* 右侧：瞬时速度、挡位与 DRS 状态 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                    {car.stale || car.telemetryStale ? '缺失' : car.speed} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400 }}>km/h</span>
                  </span>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {car.stale || car.telemetryStale ? '数据过期/缺失' : `G${car.gear}`}
                  </span>
                </div>

                <div style={{ width: '38px', textAlign: 'center' }}>
                  {!car.stale && !car.telemetryStale && car.drs ? (
                    <span style={{
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      background: 'rgba(39, 244, 210, 0.2)',
                      color: '#27f4d2',
                      border: '1px solid #27f4d2',
                      padding: '2px 4px',
                      borderRadius: '3px'
                    }}>
                      DRS
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      color: 'rgba(255, 255, 255, 0.2)',
                      padding: '2px 4px'
                    }}>
                      -
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
