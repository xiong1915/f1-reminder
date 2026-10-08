// src/domain/f1/scoring.js
// 2026 赛季 FIA 官方积分规则（纯确定性算法，严禁 AI 参与数字推导）

export const GP_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

/**
 * 计算大奖赛正赛得分
 * @param {number} position 1-based 名次 (1 = P1)
 * @param {boolean} hasFastestLap 是否获得最快圈速且进入前十
 * @returns {number}
 */
export function getRacePoints(position, hasFastestLap = false) {
  if (position < 1 || position > 10) return 0;
  let pts = GP_POINTS[position - 1] || 0;
  if (hasFastestLap && position <= 10) {
    pts += 1;
  }
  return pts;
}

/**
 * 计算冲刺赛得分
 * @param {number} position 1-based 名次 (1 = P1)
 * @returns {number}
 */
export function getSprintPoints(position) {
  if (position < 1 || position > 8) return 0;
  return SPRINT_POINTS[position - 1] || 0;
}
