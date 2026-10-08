// components/countdown.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { RaceStateService } from '@/lib/f1/race-state';

interface CountdownProps {
  targetUtcMs: number;
  serverTimeMs?: number;
}

export function Countdown({ targetUtcMs, serverTimeMs }: CountdownProps) {
  // 消除客户端与服务端的本地时钟偏差
  const [skew] = useState(() => (serverTimeMs ? Date.now() - serverTimeMs : 0));
  const [delta, setDelta] = useState(() => RaceStateService.calculateCountdown(targetUtcMs, Date.now() - skew));

  useEffect(() => {
    const update = () => {
      const adjustedNow = Date.now() - skew;
      setDelta(RaceStateService.calculateCountdown(targetUtcMs, adjustedNow));
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetUtcMs, skew]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(6px, 1.8vw, 16px)', textAlign: 'center', margin: '24px 0' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 'clamp(10px, 2vw, 16px) 4px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
        <div className="tabular-nums" style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 800, color: 'var(--text-primary)' }}>
          {delta.days}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>天</div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 'clamp(10px, 2vw, 16px) 4px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
        <div className="tabular-nums" style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 800, color: 'var(--text-primary)' }}>
          {delta.hours}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>小时</div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 'clamp(10px, 2vw, 16px) 4px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
        <div className="tabular-nums" style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 800, color: 'var(--text-primary)' }}>
          {delta.mins}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>分</div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 'clamp(10px, 2vw, 16px) 4px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
        <div className="tabular-nums" style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 800, color: '#ff453a' }}>
          {delta.secs}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>秒</div>
      </div>
    </div>
  );
}
