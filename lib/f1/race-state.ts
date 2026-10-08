// lib/f1/race-state.ts
// 全站唯一统一赛事状态机服务 (RaceStateService)
// 统一管理赛事周末及各 Session 的生命周期状态，杜绝任何组件自行判断

import { F1Meeting, F1Session } from './types';

export type RaceState =
  | 'UPCOMING_WEEKEND'
  | 'SESSION_UPCOMING'
  | 'SESSION_IN_PROGRESS'
  | 'SESSION_FINISHED'
  | 'RACE_FINISHED'
  | 'WEEKEND_FINISHED';

export interface RaceStateEvaluation {
  state: RaceState;
  currentSession: F1Session | null;
  nextSession: F1Session | null;
  targetTimestamp: number;
  remainingMs: number;
  isLive: boolean;
  isPast: boolean;
  statusLabel: string;
}

export class RaceStateService {
  /**
   * 计算指定 Session 的结束时间毫秒
   */
  public static getSessionEndMs(session: F1Session): number {
    const startMs = new Date(session.startTimeUTC).getTime();
    if (session.endTimeUTC) {
      const endMs = new Date(session.endTimeUTC).getTime();
      if (!isNaN(endMs) && endMs > startMs) return endMs;
    }
    const duration = session.durationMinutes || (session.type === 'race' ? 120 : 60);
    return startMs + duration * 60 * 1000;
  }

  /**
   * 评估分站当前所处的精确统一状态
   */
  public static evaluateMeeting(meeting: F1Meeting, nowMs: number = Date.now()): RaceStateEvaluation {
    if (!meeting || !meeting.sessions || meeting.sessions.length === 0) {
      return {
        state: 'UPCOMING_WEEKEND',
        currentSession: null,
        nextSession: null,
        targetTimestamp: 0,
        remainingMs: 0,
        isLive: false,
        isPast: false,
        statusLabel: '等待官方排期'
      };
    }

    // 确保 Session 按时间升序排列
    const sorted = [...meeting.sessions].sort(
      (a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime()
    );

    const firstSession = sorted[0];
    const raceSession = sorted.find(s => s.type === 'race') || sorted[sorted.length - 1];

    const firstStartMs = new Date(firstSession.startTimeUTC).getTime();
    const raceEndMs = this.getSessionEndMs(raceSession);

    // 1. 周末开始前超过 2 小时
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    if (nowMs < firstStartMs - TWO_HOURS_MS) {
      const remainingMs = Math.max(0, firstStartMs - nowMs);
      return {
        state: 'UPCOMING_WEEKEND',
        currentSession: null,
        nextSession: firstSession,
        targetTimestamp: firstStartMs,
        remainingMs,
        isLive: false,
        isPast: false,
        statusLabel: '分站倒计时'
      };
    }

    // 2. 检查是否有 Session 正在进行中
    for (const session of sorted) {
      const sStart = new Date(session.startTimeUTC).getTime();
      const sEnd = this.getSessionEndMs(session);
      if (nowMs >= sStart && nowMs < sEnd) {
        return {
          state: 'SESSION_IN_PROGRESS',
          currentSession: session,
          nextSession: sorted.find(s => new Date(s.startTimeUTC).getTime() > nowMs) || null,
          targetTimestamp: sEnd,
          remainingMs: Math.max(0, sEnd - nowMs),
          isLive: true,
          isPast: false,
          statusLabel: `● LIVE ${session.name} 进行中`
        };
      }
    }

    // 3. 寻找下一个未开始的 Session
    const upcomingIndex = sorted.findIndex(s => new Date(s.startTimeUTC).getTime() > nowMs);
    if (upcomingIndex !== -1) {
      const next = sorted[upcomingIndex];
      const nextStartMs = new Date(next.startTimeUTC).getTime();
      const remainingMs = Math.max(0, nextStartMs - nowMs);

      // 若距离下节开赛在 2 小时以内
      if (remainingMs <= TWO_HOURS_MS) {
        return {
          state: 'SESSION_UPCOMING',
          currentSession: null,
          nextSession: next,
          targetTimestamp: nextStartMs,
          remainingMs,
          isLive: false,
          isPast: false,
          statusLabel: `即将开始 · ${next.name}`
        };
      } else {
        // 处于两个 Session 之间的时间隙
        const prev = upcomingIndex > 0 ? sorted[upcomingIndex - 1] : null;
        return {
          state: 'SESSION_FINISHED',
          currentSession: prev,
          nextSession: next,
          targetTimestamp: nextStartMs,
          remainingMs,
          isLive: false,
          isPast: false,
          statusLabel: `${prev ? prev.name + ' 已完结' : '准备就绪'} · 下一节 ${next.name}`
        };
      }
    }

    // 4. 所有 Session 均已结束
    const raceFinishedWindowMs = TWO_HOURS_MS;
    if (nowMs <= raceEndMs + raceFinishedWindowMs) {
      return {
        state: 'RACE_FINISHED',
        currentSession: raceSession,
        nextSession: null,
        targetTimestamp: raceEndMs,
        remainingMs: 0,
        isLive: false,
        isPast: true,
        statusLabel: '正赛已完结 · 成绩核验中'
      };
    }

    return {
      state: 'WEEKEND_FINISHED',
      currentSession: raceSession,
      nextSession: null,
      targetTimestamp: raceEndMs,
      remainingMs: 0,
      isLive: false,
      isPast: true,
      statusLabel: '本站圆满落幕'
    };
  }

  /**
   * 倒计时计算算法：唯一权威实现 Math.max(0, targetTimestamp - nowMs)
   */
  public static calculateCountdown(targetTimestamp: number, nowMs: number = Date.now()) {
    const diff = Math.max(0, targetTimestamp - nowMs);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');

    return {
      days: pad(days),
      hours: pad(hours),
      mins: pad(mins),
      secs: pad(secs),
      totalMs: diff,
      isZero: diff === 0
    };
  }
}
