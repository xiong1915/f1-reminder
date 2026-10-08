// tests/race-state.test.mjs
// RaceStateService 统一赛事状态机边界与倒计时自动化测试套件

import test from 'node:test';
import assert from 'node:assert';
import { RaceStateService } from '../lib/f1/race-state.ts';

const mockMeeting = {
  round: 17,
  season: '2026',
  name: 'Singapore Grand Prix',
  nameZh: '新加坡大奖赛',
  country: 'Singapore',
  locality: 'Marina Bay',
  circuitId: 'marina_bay',
  circuitName: 'Marina Bay Street Circuit',
  raceStartUTC: '2026-10-11T12:00:00Z',
  isSprintWeekend: false,
  sessions: [
    {
      id: 'fp1',
      name: '第一次自由练习 (FP1)',
      nameEn: 'Practice 1',
      type: 'practice',
      startTimeUTC: '2026-10-09T09:30:00Z',
      durationMinutes: 60
    },
    {
      id: 'fp2',
      name: '第二次自由练习 (FP2)',
      nameEn: 'Practice 2',
      type: 'practice',
      startTimeUTC: '2026-10-09T13:00:00Z',
      durationMinutes: 60
    },
    {
      id: 'fp3',
      name: '第三次自由练习 (FP3)',
      nameEn: 'Practice 3',
      type: 'practice',
      startTimeUTC: '2026-10-10T09:30:00Z',
      durationMinutes: 60
    },
    {
      id: 'qualifying',
      name: '排位赛 (Qualifying)',
      nameEn: 'Qualifying',
      type: 'qualifying',
      startTimeUTC: '2026-10-10T13:00:00Z',
      durationMinutes: 60
    },
    {
      id: 'race',
      name: '正赛 (Race)',
      nameEn: 'Race',
      type: 'race',
      startTimeUTC: '2026-10-11T12:00:00Z',
      durationMinutes: 120
    }
  ]
};

test('RaceStateService 统一状态机 9 大时间边界全覆盖验证', async (t) => {
  const fp1StartMs = new Date('2026-10-09T09:30:00Z').getTime();
  const raceStartMs = new Date('2026-10-11T12:00:00Z').getTime();
  const raceEndMs = raceStartMs + 120 * 60 * 1000;

  await t.test('1. T-1 day: 比赛周末前 1 天 -> UPCOMING_WEEKEND', () => {
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, fp1StartMs - 86400000);
    assert.strictEqual(evalResult.state, 'UPCOMING_WEEKEND');
    assert.strictEqual(evalResult.nextSession?.id, 'fp1');
    assert.strictEqual(evalResult.isLive, false);
  });

  await t.test('2. T-1 hour: 首节开赛前 1 小时 (<= 2h 窗口) -> SESSION_UPCOMING', () => {
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, fp1StartMs - 3600000);
    assert.strictEqual(evalResult.state, 'SESSION_UPCOMING');
    assert.strictEqual(evalResult.nextSession?.id, 'fp1');
    assert.strictEqual(evalResult.isLive, false);
  });

  await t.test('3. T-1 second: 首节开赛前 1 秒 -> SESSION_UPCOMING', () => {
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, fp1StartMs - 1000);
    assert.strictEqual(evalResult.state, 'SESSION_UPCOMING');
    assert.strictEqual(evalResult.nextSession?.id, 'fp1');
  });

  await t.test('4. T=0: 首节准点开始 -> SESSION_IN_PROGRESS', () => {
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, fp1StartMs);
    assert.strictEqual(evalResult.state, 'SESSION_IN_PROGRESS');
    assert.strictEqual(evalResult.currentSession?.id, 'fp1');
    assert.strictEqual(evalResult.isLive, true);
  });

  await t.test('5. T+1 second: 首节开跑 1 秒 -> SESSION_IN_PROGRESS', () => {
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, fp1StartMs + 1000);
    assert.strictEqual(evalResult.state, 'SESSION_IN_PROGRESS');
    assert.strictEqual(evalResult.currentSession?.id, 'fp1');
    assert.strictEqual(evalResult.isLive, true);
  });

  await t.test('6. Session finished: FP1 完结且距离 FP2 超过 2h -> SESSION_FINISHED', () => {
    const fp1EndMs = fp1StartMs + 60 * 60 * 1000;
    // FP1 结束后 5 分钟 (距离 FP2 开赛还有 2 小时 25 分钟)
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, fp1EndMs + 5 * 60 * 1000);
    assert.strictEqual(evalResult.state, 'SESSION_FINISHED');
    assert.strictEqual(evalResult.currentSession?.id, 'fp1');
    assert.strictEqual(evalResult.nextSession?.id, 'fp2');
    assert.strictEqual(evalResult.isLive, false);
  });

  await t.test('7. Next session: 距离 FP2 开赛在 2h 内 -> SESSION_UPCOMING', () => {
    const fp2StartMs = new Date('2026-10-09T13:00:00Z').getTime();
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, fp2StartMs - 30 * 60 * 1000);
    assert.strictEqual(evalResult.state, 'SESSION_UPCOMING');
    assert.strictEqual(evalResult.nextSession?.id, 'fp2');
  });

  await t.test('8. Race finished: 正赛刚结束 30 分钟 (成绩核验中) -> RACE_FINISHED', () => {
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, raceEndMs + 30 * 60 * 1000);
    assert.strictEqual(evalResult.state, 'RACE_FINISHED');
    assert.strictEqual(evalResult.isPast, true);
  });

  await t.test('9. Weekend finished: 正赛结束超过 2 小时 -> WEEKEND_FINISHED', () => {
    const evalResult = RaceStateService.evaluateMeeting(mockMeeting, raceEndMs + 3 * 60 * 60 * 1000);
    assert.strictEqual(evalResult.state, 'WEEKEND_FINISHED');
    assert.strictEqual(evalResult.isPast, true);
  });

  await t.test('10. 权威倒计时计算测试: 无负数、无递减漂移', () => {
    const target = 2000000;
    const cd1 = RaceStateService.calculateCountdown(target, 1000000);
    assert.strictEqual(cd1.totalMs, 1000000);
    assert.strictEqual(cd1.isZero, false);

    // 目标时间已过
    const cdPast = RaceStateService.calculateCountdown(target, 3000000);
    assert.strictEqual(cdPast.totalMs, 0);
    assert.strictEqual(cdPast.isZero, true);
    assert.strictEqual(cdPast.secs, '00');
    assert.strictEqual(cdPast.mins, '00');
    assert.strictEqual(cdPast.hours, '00');
    assert.strictEqual(cdPast.days, '00');
  });
});
