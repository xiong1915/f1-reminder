// lib/f1/time.ts
// 统一时间与会话调度系统：内部全量采用 UTC ISO-8601，展现层统一通过 Asia/Shanghai 时区转换并规整数字格式

import { F1Session, NextSessionState } from './types';

export interface TimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  weekdayShort: string;
  weekdayLong: string;
}

/**
 * 安全解析时间并提取 Asia/Shanghai 时区的确定性数字与星期部件
 * 杜绝任何因为 Intl 混合输出而导致的“10月月11日日”重复字符问题
 */
export function extractBeijingParts(input: string | number | Date): TimeParts | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number' && isNaN(input)) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return null;

  const numParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const findNum = (type: string) => numParts.find(p => p.type === type)?.value || '00';

  let weekdayShort = '';
  let weekdayLong = '';
  try {
    weekdayShort = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'short' }).format(d);
    weekdayLong = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'long' }).format(d);
  } catch (_) {
    weekdayShort = '周--';
    weekdayLong = '星期--';
  }

  return {
    year: findNum('year'),
    month: findNum('month'),
    day: findNum('day'),
    hour: findNum('hour'),
    minute: findNum('minute'),
    second: findNum('second'),
    weekdayShort,
    weekdayLong
  };
}

/**
 * 格式化为标准日期：例如 "2026年10月09日" 或 "10月09日"
 */
export function formatDate(input: string | number | Date, includeYear: boolean = true): string {
  const parts = extractBeijingParts(input);
  if (!parts) return '待定';
  return includeYear ? `${parts.year}年${parts.month}月${parts.day}日` : `${parts.month}月${parts.day}日`;
}

/**
 * 格式化为时间：例如 "20:00"
 */
export function formatTime(input: string | number | Date): string {
  const parts = extractBeijingParts(input);
  if (!parts) return '待定';
  return `${parts.hour}:${parts.minute}`;
}

/**
 * 格式化为日期时间：例如 "2026年10月09日 20:00"
 */
export function formatDateTime(input: string | number | Date, includeYear: boolean = true): string {
  const parts = extractBeijingParts(input);
  if (!parts) return '时间待定';
  const dateStr = includeYear ? `${parts.year}年${parts.month}月${parts.day}日` : `${parts.month}月${parts.day}日`;
  return `${dateStr} ${parts.hour}:${parts.minute}`;
}

/**
 * 格式化比赛周末跨度范围：例如 "10月09日 - 10月11日"
 */
export function formatRaceRange(startInput: string | number | Date, endInput: string | number | Date): string {
  const startParts = extractBeijingParts(startInput);
  const endParts = extractBeijingParts(endInput);

  if (!startParts && !endParts) return '日期待定';
  if (!startParts) return formatDate(endInput, false);
  if (!endParts) return formatDate(startInput, false);

  if (startParts.month === endParts.month) {
    return `${startParts.month}月${startParts.day}日 - ${endParts.day}日`;
  }
  return `${startParts.month}月${startParts.day}日 - ${endParts.month}月${endParts.day}日`;
}

/**
 * 简洁比赛周末卡片显示（例如：10月09日 周五 20:00）
 */
export function formatBeijingDisplay(input: string | number | Date): string {
  const parts = extractBeijingParts(input);
  if (!parts) return '待定';
  return `${parts.month}月${parts.day}日 ${parts.weekdayShort} ${parts.hour}:${parts.minute}`;
}

/**
 * 格式化为标准中文日期时间格式（包含年份、月份、日期、星期几与时分秒）
 * 例如：2026年10月07日星期三 18:30:00
 */
export function getBeijingTime(date: string | number | Date = new Date()): string {
  const parts = extractBeijingParts(date);
  if (!parts) return '待定';
  return `${parts.year}年${parts.month}月${parts.day}日${parts.weekdayLong} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/**
 * 兼容旧方法名称
 */
export function formatBeijingTime(input: string | number | Date): string {
  return formatDateTime(input, true);
}

/**
 * 计算两个 UTC 时间戳之间的倒计时差值（毫秒精确计算，杜绝后台漂移）
 */
export function calculateUtcDelta(targetUtcMs: number, nowUtcMs: number = Date.now()) {
  const diff = targetUtcMs - nowUtcMs;
  if (diff <= 0) {
    return { days: '00', hours: '00', mins: '00', secs: '00', totalMs: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    mins: String(mins).padStart(2, '0'),
    secs: String(secs).padStart(2, '0'),
    totalMs: diff,
    isPast: false
  };
}

/**
 * 确定当前比赛周末最相关的下一节（Session）及其状态
 */
export function getNextRelevantSession(sessions: F1Session[] = [], nowDate: Date = new Date()): NextSessionState {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { session: null, status: 'FINISHED', targetUtcMs: null, targetIso: null };
  }

  const nowMs = nowDate.getTime();

  // 1. 检查是否有正在进行的 Session (IN_PROGRESS)
  for (const s of sessions) {
    const startMs = new Date(s.startTimeUTC).getTime();
    const endMs = s.endTimeUTC ? new Date(s.endTimeUTC).getTime() : startMs + (s.durationMinutes * 60 * 1000);
    if (nowMs >= startMs && nowMs < endMs) {
      return {
        session: s,
        status: 'IN_PROGRESS',
        targetUtcMs: endMs,
        targetIso: s.endTimeUTC || new Date(endMs).toISOString()
      };
    }
  }

  // 2. 查找第一个尚未开始的 Session (NEXT)
  for (const s of sessions) {
    const startMs = new Date(s.startTimeUTC).getTime();
    if (startMs > nowMs) {
      return {
        session: s,
        status: 'NEXT',
        targetUtcMs: startMs,
        targetIso: s.startTimeUTC
      };
    }
  }

  // 3. 所有环节均已结束 (FINISHED)
  return {
    session: sessions[sessions.length - 1],
    status: 'FINISHED',
    targetUtcMs: null,
    targetIso: null
  };
}
