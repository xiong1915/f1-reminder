// lib/f1/championship.ts
// 2026 世界一级方程式锦标赛数学推演与争冠情景模拟器

import { getRacePoints, getSprintPoints } from './scoring';

export interface TitleSimParams {
  leader: { name: string; code: string; points: number };
  challenger: { name: string; code: string; points: number };
  leaderSprint?: number; // 完赛顺位 (1..8, 0表示无分)
  leaderRace?: number;   // 完赛顺位 (1..10, 0表示无分)
  challengerSprint?: number;
  challengerRace?: number;
  remainingRounds?: number;
}

export interface TitleSimResult {
  leader: { name: string; code: string; currentPts: number; weekendPts: number; projectedPts: number };
  challenger: { name: string; code: string; currentPts: number; weekendPts: number; projectedPts: number };
  currentGap: number;
  newGap: number;
  gapDelta: number;
  narrative: string;
}

export function simulateTitleScenario(params: TitleSimParams): TitleSimResult {
  const {
    leader,
    challenger,
    leaderSprint = 0,
    leaderRace = 0,
    challengerSprint = 0,
    challengerRace = 0
  } = params;

  const leaderWeekend = (leaderSprint ? getSprintPoints(leaderSprint) : 0) + (leaderRace ? getRacePoints(leaderRace) : 0);
  const challengerWeekend = (challengerSprint ? getSprintPoints(challengerSprint) : 0) + (challengerRace ? getRacePoints(challengerRace) : 0);

  const leaderProjected = leader.points + leaderWeekend;
  const challengerProjected = challenger.points + challengerWeekend;

  const currentGap = leader.points - challenger.points;
  const newGap = leaderProjected - challengerProjected;
  const gapDelta = newGap - currentGap;

  let narrative = '';
  if (gapDelta > 0) {
    narrative = `若 ${leader.name} 在本周末稳定取分（+${leaderWeekend}分），领先优势将扩大至 ${newGap} 分（扩大 ${gapDelta} 分），建立稳固争冠壁垒。`;
  } else if (gapDelta < 0 && newGap > 0) {
    narrative = `${challenger.name} 斩获 +${challengerWeekend} 分，成功将分差缩小至 ${newGap} 分（追回 ${Math.abs(gapDelta)} 分），争冠悬念进一步加剧。`;
  } else if (newGap <= 0) {
    narrative = `${challenger.name} 实现了积分反超或持平（分差 ${newGap} 分），年度车手总冠军争夺发生实质性逆转！`;
  } else {
    narrative = `双方本周末所获积分相当（+${leaderWeekend} vs +${challengerWeekend}），积分差距维持在 ${newGap} 分左右。`;
  }

  return {
    leader: { ...leader, currentPts: leader.points, weekendPts: leaderWeekend, projectedPts: leaderProjected },
    challenger: { ...challenger, currentPts: challenger.points, weekendPts: challengerWeekend, projectedPts: challengerProjected },
    currentGap,
    newGap,
    gapDelta,
    narrative
  };
}
