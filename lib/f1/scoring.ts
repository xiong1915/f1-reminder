// lib/f1/scoring.ts
// 2026 赛季 F1 积分规则与换算表

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function getRacePoints(position: number): number {
  if (position >= 1 && position <= 10) {
    return RACE_POINTS[position - 1];
  }
  return 0;
}

export function getSprintPoints(position: number): number {
  if (position >= 1 && position <= 8) {
    return SPRINT_POINTS[position - 1];
  }
  return 0;
}

export function getMaxWeekendPoints(isSprintWeekend: boolean = false): number {
  return isSprintWeekend ? 25 + 8 : 25;
}
