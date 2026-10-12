// components/title_simulator.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { simulateTitleScenario, TitleSimResult } from '@/lib/f1/championship';
import { DriverStanding } from '@/lib/f1/types';

const RACE_OPTIONS = [
  { val: 1, pts: 25, label: '正赛 P1 (25分)' },
  { val: 2, pts: 18, label: '正赛 P2 (18分)' },
  { val: 3, pts: 15, label: '正赛 P3 (15分)' },
  { val: 4, pts: 12, label: '正赛 P4 (12分)' },
  { val: 5, pts: 10, label: '正赛 P5 (10分)' },
  { val: 6, pts: 8, label: '正赛 P6 (8分)' },
  { val: 7, pts: 6, label: '正赛 P7 (6分)' },
  { val: 8, pts: 4, label: '正赛 P8 (4分)' },
  { val: 9, pts: 2, label: '正赛 P9 (2分)' },
  { val: 10, pts: 1, label: '正赛 P10 (1分)' },
  { val: 0, pts: 0, label: '正赛 未获积分 (0分)' }
];

const SPRINT_OPTIONS = [
  { val: 1, pts: 8, label: '冲刺赛 P1 (8分)' },
  { val: 2, pts: 7, label: '冲刺赛 P2 (7分)' },
  { val: 3, pts: 6, label: '冲刺赛 P3 (6分)' },
  { val: 4, pts: 5, label: '冲刺赛 P4 (5分)' },
  { val: 5, pts: 4, label: '冲刺赛 P5 (4分)' },
  { val: 6, pts: 3, label: '冲刺赛 P6 (3分)' },
  { val: 7, pts: 2, label: '冲刺赛 P7 (2分)' },
  { val: 8, pts: 1, label: '冲刺赛 P8 (1分)' },
  { val: 0, pts: 0, label: '冲刺赛 未获积分 (0分)' }
];

export function TitleSimulator({
  drivers,
  isSprintWeekend = false,
  isSprintPending = true,
  available = true
}: {
  drivers: DriverStanding[];
  isSprintWeekend?: boolean;
  isSprintPending?: boolean;
  available?: boolean;
}) {
  const leader = drivers[0] || { name: '数据待更新', code: '---', points: 0 };
  const challenger = drivers[1] || { name: '数据待更新', code: '---', points: 0 };

  const canSelectSprint = isSprintWeekend && isSprintPending;

  const [leaderSprint, setLeaderSprint] = useState<number>(canSelectSprint ? 1 : 0);
  const [leaderRace, setLeaderRace] = useState<number>(1);
  const [challengerSprint, setChallengerSprint] = useState<number>(canSelectSprint ? 2 : 0);
  const [challengerRace, setChallengerRace] = useState<number>(2);

  // 切换分站周末类型或冲刺赛已完赛时，清除不适用的冲刺赛选择并强制为 0
  useEffect(() => {
    if (!canSelectSprint) {
      setLeaderSprint(0);
      setChallengerSprint(0);
    }
  }, [canSelectSprint]);

  const effectiveLeaderSprint = canSelectSprint ? leaderSprint : 0;
  const effectiveChallengerSprint = canSelectSprint ? challengerSprint : 0;

  const result: TitleSimResult = simulateTitleScenario({
    leader: { name: leader.name, code: leader.code, points: leader.points },
    challenger: { name: challenger.name, code: challenger.code, points: challenger.points },
    leaderSprint: effectiveLeaderSprint,
    leaderRace,
    challengerSprint: effectiveChallengerSprint,
    challengerRace
  });

  if (!available || drivers.length < 2) return <p>积分统计范围尚未核实，或本场已开始/已计入积分，暂不提供试算以免重复加分</p>;

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--line-dark)', borderRadius: '24px', padding: 'clamp(24px, 4vw, 40px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
        {/* Controls */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ff453a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            {isSprintWeekend ? (canSelectSprint ? '冲刺赛周末积分测算' : '冲刺赛已完赛 · 正赛积分测算') : '标准周末积分测算'}
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            本周末积分试算
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: isSprintWeekend && !canSelectSprint ? '8px' : '20px' }}>
            仅计算所选比赛结果，不代表夺冠概率
          </p>
          {isSprintWeekend && !canSelectSprint && (
            <p style={{ fontSize: '11px', color: '#ff9f0a', marginBottom: '16px' }}>
              * 本次不额外增加冲刺积分，仅计算所选正赛结果。
            </p>
          )}

          {/* Leader Controls */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {leader.name} (P1 榜首领跑):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isSprintWeekend && (
                <div>
                  <label htmlFor="leader-sprint-select" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    冲刺赛完赛名次
                  </label>
                  <select
                    id="leader-sprint-select"
                    aria-label={`${leader.name} 冲刺赛完赛名次`}
                    value={leaderSprint}
                    onChange={e => setLeaderSprint(Number(e.target.value))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
                  >
                    {SPRINT_OPTIONS.map(opt => {
                      const isOccupied = opt.val > 0 && opt.val === challengerSprint;
                      return (
                        <option key={opt.val} value={opt.val} disabled={isOccupied}>
                          {opt.label}{isOccupied ? ' (已被挑战者占用)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="leader-race-select" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  大奖赛正赛完赛名次
                </label>
                <select
                  id="leader-race-select"
                  aria-label={`${leader.name} 大奖赛正赛完赛名次`}
                  value={leaderRace}
                  onChange={e => setLeaderRace(Number(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
                >
                  {RACE_OPTIONS.map(opt => {
                    const isOccupied = opt.val > 0 && opt.val === challengerRace;
                    return (
                      <option key={opt.val} value={opt.val} disabled={isOccupied}>
                        {opt.label}{isOccupied ? ' (已被挑战者占用)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Challenger Controls */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {challenger.name} (P2 挑战者):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isSprintWeekend && (
                <div>
                  <label htmlFor="challenger-sprint-select" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    冲刺赛完赛名次
                  </label>
                  <select
                    id="challenger-sprint-select"
                    aria-label={`${challenger.name} 冲刺赛完赛名次`}
                    value={challengerSprint}
                    onChange={e => setChallengerSprint(Number(e.target.value))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
                  >
                    {SPRINT_OPTIONS.map(opt => {
                      const isOccupied = opt.val > 0 && opt.val === leaderSprint;
                      return (
                        <option key={opt.val} value={opt.val} disabled={isOccupied}>
                          {opt.label}{isOccupied ? ' (已被领跑者占用)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="challenger-race-select" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  大奖赛正赛完赛名次
                </label>
                <select
                  id="challenger-race-select"
                  aria-label={`${challenger.name} 大奖赛正赛完赛名次`}
                  value={challengerRace}
                  onChange={e => setChallengerRace(Number(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-dark)', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}
                >
                  {RACE_OPTIONS.map(opt => {
                    const isOccupied = opt.val > 0 && opt.val === leaderRace;
                    return (
                      <option key={opt.val} value={opt.val} disabled={isOccupied}>
                        {opt.label}{isOccupied ? ' (已被领跑者占用)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Output */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line-dark)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{leader.name} 本周末新增积分:</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>+{result.leader.weekendPts} 分</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{leader.name} 预计总分:</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>{result.leader.projectedPts} 分</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{challenger.name} 本周末新增积分:</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>+{result.challenger.weekendPts} 分</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{challenger.name} 预计总分:</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>{result.challenger.projectedPts} 分</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line-dark)', paddingTop: '16px', marginTop: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>预计第一二名分差:</span>
              <span className="tabular-nums" style={{ fontWeight: 800, fontSize: '20px', color: result.newGap >= 0 ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
                {result.newGap >= 0 ? `+${result.newGap}` : result.newGap} 分
              </span>
            </div>
            {result.newGap === 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#ff9f0a' }}>
                预计积分持平，最终排名还需比较同分规则
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {result.narrative}
          </div>
        </div>
      </div>
    </div>
  );
}
