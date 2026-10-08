// components/title_simulator.tsx
'use client';

import React, { useState } from 'react';
import { simulateTitleScenario, TitleSimResult } from '@/lib/f1/championship';
import { DriverStanding } from '@/lib/f1/types';

export function TitleSimulator({ drivers }: { drivers: DriverStanding[] }) {
  const leader = drivers[0] || { name: '基米·安东内利', code: 'ANT', points: 320 };
  const challenger = drivers[1] || { name: '乔治·拉塞尔', code: 'RUS', points: 236 };

  const [leaderSprint, setLeaderSprint] = useState<number>(1);
  const [leaderRace, setLeaderRace] = useState<number>(1);
  const [challengerSprint, setChallengerSprint] = useState<number>(2);
  const [challengerRace, setChallengerRace] = useState<number>(2);

  const result: TitleSimResult = simulateTitleScenario({
    leader: { name: leader.name, code: leader.code, points: leader.points },
    challenger: { name: challenger.name, code: challenger.code, points: challenger.points },
    leaderSprint,
    leaderRace,
    challengerSprint,
    challengerRace
  });

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '24px', padding: 'clamp(24px, 4vw, 40px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
        {/* Controls */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ff453a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            交互式积分模拟推演
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
            模拟本周末积分结算走势
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {leader.name} (P1 领跑者):
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={leaderSprint}
                onChange={e => setLeaderSprint(Number(e.target.value))}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
              >
                <option value={1}>冲刺赛 P1 (8分)</option>
                <option value={2}>冲刺赛 P2 (7分)</option>
                <option value={3}>冲刺赛 P3 (6分)</option>
                <option value={0}>冲刺赛 无分</option>
              </select>
              <select
                value={leaderRace}
                onChange={e => setLeaderRace(Number(e.target.value))}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
              >
                <option value={1}>正赛 P1 (25分)</option>
                <option value={2}>正赛 P2 (18分)</option>
                <option value={3}>正赛 P3 (15分)</option>
                <option value={0}>正赛 退赛/无分</option>
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {challenger.name} (P2 挑战者):
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={challengerSprint}
                onChange={e => setChallengerSprint(Number(e.target.value))}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
              >
                <option value={2}>冲刺赛 P2 (7分)</option>
                <option value={1}>冲刺赛 P1 (8分)</option>
                <option value={3}>冲刺赛 P3 (6分)</option>
                <option value={0}>冲刺赛 无分</option>
              </select>
              <select
                value={challengerRace}
                onChange={e => setChallengerRace(Number(e.target.value))}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
              >
                <option value={2}>正赛 P2 (18分)</option>
                <option value={1}>正赛 P1 (25分)</option>
                <option value={3}>正赛 P3 (15分)</option>
                <option value={0}>正赛 退赛/无分</option>
              </select>
            </div>
          </div>
        </div>

        {/* Output */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line-dark)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{leader.name} 预计总分:</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>{result.leader.projectedPts} 分 (+{result.leader.weekendPts})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{challenger.name} 预计总分:</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>{result.challenger.projectedPts} 分 (+{result.challenger.weekendPts})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line-dark)', paddingTop: '16px', marginTop: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>预测第一二名分差:</span>
              <span className="tabular-nums" style={{ fontWeight: 800, fontSize: '20px', color: result.newGap >= 0 ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
                {result.newGap >= 0 ? `+${result.newGap}` : result.newGap} 分
              </span>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {result.narrative}
          </div>
        </div>
      </div>
    </div>
  );
}
