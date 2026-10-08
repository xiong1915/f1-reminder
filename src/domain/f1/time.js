// src/domain/f1/time.js
// 统一时间与会话调度系统：内部全量采用 UTC ISO-8601，展现层统一通过 Intl.DateTimeFormat (Asia/Shanghai) 转换

/**
 * 格式化为北京时间完整字符串
 * @param {string|number|Date} input 
 * @param {Intl.DateTimeFormatOptions} options 
 * @returns {string}
 */
export function formatBeijingTime(input, options = {}) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '时间待定';

  const defaultOpts = {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...options
  };

  return new Intl.DateTimeFormat('zh-CN', defaultOpts).format(d);
}

/**
 * 格式化为标准中文日期时间格式（包含年份、月份、日期、星期几与时分秒）
 * @param {string|number|Date} [date=new Date()]
 * @returns {string} 例如：2026年10月07日星期三 12:28:09
 */
export function getBeijingTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const getPart = type => (parts.find(p => p.type === type) || {}).value || '';
  return `${getPart('year')}年${getPart('month')}月${getPart('day')}日${getPart('weekday')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

/**
 * 格式化为简洁易读的北京时间（例如：10月09日 周五 16:30）
 * @param {string|number|Date} input 
 * @returns {string}
 */
export function formatBeijingDisplay(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '待定';

  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);

  const getPart = type => (parts.find(p => p.type === type) || {}).value || '';
  const month = getPart('month');
  const day = getPart('day');
  const weekday = getPart('weekday');
  const hour = getPart('hour');
  const minute = getPart('minute');

  return `${month}月${day}日 ${weekday} ${hour}:${minute}`;
}

/**
 * 计算两个 UTC 时间戳之间的倒计时差值（毫秒精确计算，杜绝后台漂移）
 * @param {number} targetUtcMs 
 * @param {number} nowUtcMs 
 * @returns {{ days: string, hours: string, mins: string, secs: string, totalMs: number, isPast: boolean }}
 */
export function calculateUtcDelta(targetUtcMs, nowUtcMs = Date.now()) {
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
 * @param {Array<{ id: string, name: string, type: string, startTimeUTC: string, endTimeUTC?: string }>} sessions 
 * @param {Date} nowDate 
 * @returns {{ session: object|null, status: 'NEXT'|'IN_PROGRESS'|'UPCOMING'|'FINISHED', targetUtcMs: number|null, targetIso: string|null }}
 */
export function getNextRelevantSession(sessions = [], nowDate = new Date()) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { session: null, status: 'FINISHED', targetUtcMs: null, targetIso: null };
  }

  const nowMs = nowDate.getTime();

  // 1. 检查是否有正在进行的 Session (IN_PROGRESS)
  for (const s of sessions) {
    const startMs = new Date(s.startTimeUTC).getTime();
    const endMs = s.endTimeUTC ? new Date(s.endTimeUTC).getTime() : startMs + (90 * 60 * 1000); // 默认 90 分钟持续
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
