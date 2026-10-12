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
  if (newGap === 0) {
    narrative = `若按所选赛果完赛，${leader.name} 与 ${challenger.name} 预计积分持平（均为 ${leaderProjected} 分）。预计积分持平，最终排名还需比较同分规则。（仅计算所选比赛结果，不代表夺冠概率）`;
  } else if (newGap > 0) {
    if (gapDelta > 0) {
      narrative = `若按所选赛果完赛，${leader.name} 本周末新增 ${leaderWeekend} 分（预计总分 ${leaderProjected} 分），${challenger.name} 本周末新增 ${challengerWeekend} 分（预计总分 ${challengerProjected} 分），领先优势将扩大至 ${newGap} 分。（仅计算所选比赛结果，不代表夺冠概率）`;
    } else {
      narrative = `若按所选赛果完赛，${leader.name} 本周末新增 ${leaderWeekend} 分（预计总分 ${leaderProjected} 分），${challenger.name} 本周末新增 ${challengerWeekend} 分（预计总分 ${challengerProjected} 分），预计分差为 ${newGap} 分。（仅计算所选比赛结果，不代表夺冠概率）`;
    }
  } else {
    narrative = `若按所选赛果完赛，${challenger.name} 本周末新增 ${challengerWeekend} 分（预计总分 ${challengerProjected} 分），反超 ${leader.name}（预计总分 ${leaderProjected} 分），预计领先 ${Math.abs(newGap)} 分。（仅计算所选比赛结果，不代表夺冠概率）`;
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

export const FEATURE_POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS_TABLE = [8, 7, 6, 5, 4, 3, 2, 1];

export function calculateWeekendProjection(racePos: number, sprintPos: number = 0, isSprintWeekend: boolean = false) {
  const featurePts = getRacePoints(racePos);
  const sprintPts = isSprintWeekend ? getSprintPoints(sprintPos) : 0;
  return {
    featurePts,
    sprintPts,
    totalNewPts: featurePts + sprintPts
  };
}
