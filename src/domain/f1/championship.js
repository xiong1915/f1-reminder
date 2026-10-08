// src/domain/f1/championship.js
// 争冠数学模型推演与分析引擎

import { getRacePoints, getSprintPoints } from './scoring.js';

/**
 * 模拟两位争冠车手在指定比赛周末后的分差与前景
 * @param {object} params
 * @param {object} params.leader 车手榜领跑者 { name, code, points }
 * @param {object} params.challenger 车手榜追赶者 { name, code, points }
 * @param {number} params.leaderSprint P1..P8 或 0 (无分)
 * @param {number} params.leaderRace P1..P10 或 0 (无分)
 * @param {number} params.challengerSprint P1..P8 或 0
 * @param {number} params.challengerRace P1..P10 或 0
 * @param {number} [params.remainingRounds=6] 剩余比赛站数
 * @returns {object}
 */
export function simulateTitleScenario({
  leader,
  challenger,
  leaderSprint = 0,
  leaderRace = 0,
  challengerSprint = 0,
  challengerRace = 0,
  remainingRounds = 6
}) {
  const leaderGained = getSprintPoints(leaderSprint) + getRacePoints(leaderRace);
  const challengerGained = getSprintPoints(challengerSprint) + getRacePoints(challengerRace);

  const projectedLeaderPts = (leader.points || 0) + leaderGained;
  const projectedChallengerPts = (challenger.points || 0) + challengerGained;
  const currentGap = (leader.points || 0) - (challenger.points || 0);
  const newGap = projectedLeaderPts - projectedChallengerPts;
  const deltaChange = newGap - currentGap;

  let narrative = '';
  if (newGap > currentGap) {
    narrative = `若 ${leader.name} 本周表现强势，领先优势将扩大至 ${newGap} 分（单周净增 ${deltaChange} 分），在剩余 ${remainingRounds} 站中将建立极高的夺冠安全壁垒。`;
  } else if (newGap < currentGap && newGap > 0) {
    narrative = `${challenger.name} 成功将分差压缩至 ${newGap} 分（单周追回 ${Math.abs(deltaChange)} 分），车手总冠军悬念将在后续分站全面升温。`;
  } else if (newGap <= 0) {
    narrative = `${challenger.name} 实现了积分反超或持平，榜首易主，争冠主动权发生实质性逆转！`;
  } else {
    narrative = `双方本周得分持平，维持 ${newGap} 分的分差，追赶者仍需在后续分站保持连胜并寄希望于对手失误。`;
  }

  return {
    leader: {
      name: leader.name,
      code: leader.code,
      basePoints: leader.points,
      pointsGained: leaderGained,
      projectedPoints: projectedLeaderPts,
      projectedPts: projectedLeaderPts
    },
    challenger: {
      name: challenger.name,
      code: challenger.code,
      basePoints: challenger.points,
      pointsGained: challengerGained,
      projectedPoints: projectedChallengerPts,
      projectedPts: projectedChallengerPts
    },
    currentGap,
    projectedGap: newGap,
    newGap,
    deltaChange,
    narrative
  };
}
