// src/services/f1_service.js
// 统一 Canonical F1 数据服务：编排 Jolpica、OpenF1、KV 缓存与降级机制

import { getCache, setCache, TTL_CONFIG } from '../cache/kv_cache.js';
import {
  FALLBACK_2026_CALENDAR,
  FALLBACK_2026_DRIVERS,
  FALLBACK_2026_CONSTRUCTORS,
  FALLBACK_LAST_RACE,
  FALLBACK_CURRENT_MEETING
} from '../cache/fallback_data.js';
import {
  fetchJolpicaCalendar,
  fetchJolpicaDriverStandings,
  fetchJolpicaConstructorStandings,
  fetchJolpicaLastResult
} from '../providers/jolpica.js';
import { getNextRelevantSession } from '../domain/f1/time.js';
import { validateOverview } from '../domain/f1/schemas.js';

export class F1Service {
  constructor(env = null) {
    this.env = env;
  }

  /**
   * 获取 2026 赛季赛历列表
   */
  async getCalendar() {
    const cacheKey = 'f1:2026:calendar';
    const cached = await getCache(cacheKey, this.env);
    if (cached.found && !cached.isStale && Array.isArray(cached.data)) {
      return { data: cached.data, stale: false, updatedAt: cached.updatedAt };
    }

    try {
      const live = await fetchJolpicaCalendar('current');
      if (Array.isArray(live) && live.length > 0) {
        await setCache(cacheKey, live, TTL_CONFIG.CALENDAR, this.env);
        return { data: live, stale: false, updatedAt: new Date().toISOString() };
      }
    } catch (e) {
      console.warn('[F1Service] Jolpica calendar fetch failed:', e.message);
    }

    // 尝试 Stale 缓存
    if (cached.found && Array.isArray(cached.data)) {
      return { data: cached.data, stale: true, updatedAt: cached.updatedAt };
    }

    // 最终回退至真实基准快照
    return { data: FALLBACK_2026_CALENDAR, stale: true, updatedAt: new Date().toISOString() };
  }

  /**
   * 获取车手积分榜
   */
  async getDriverStandings() {
    const cacheKey = 'f1:2026:standings:drivers';
    const cached = await getCache(cacheKey, this.env);
    if (cached.found && !cached.isStale && Array.isArray(cached.data)) {
      return { data: cached.data, stale: false, updatedAt: cached.updatedAt };
    }

    try {
      const live = await fetchJolpicaDriverStandings('current');
      if (Array.isArray(live) && live.length > 0) {
        await setCache(cacheKey, live, TTL_CONFIG.STANDINGS, this.env);
        return { data: live, stale: false, updatedAt: new Date().toISOString() };
      }
    } catch (e) {
      console.warn('[F1Service] Jolpica driver standings failed:', e.message);
    }

    if (cached.found && Array.isArray(cached.data)) {
      return { data: cached.data, stale: true, updatedAt: cached.updatedAt };
    }

    return { data: FALLBACK_2026_DRIVERS, stale: true, updatedAt: new Date().toISOString() };
  }

  /**
   * 获取车队积分榜
   */
  async getConstructorStandings() {
    const cacheKey = 'f1:2026:standings:constructors';
    const cached = await getCache(cacheKey, this.env);
    if (cached.found && !cached.isStale && Array.isArray(cached.data)) {
      return { data: cached.data, stale: false, updatedAt: cached.updatedAt };
    }

    try {
      const live = await fetchJolpicaConstructorStandings('current');
      if (Array.isArray(live) && live.length > 0) {
        await setCache(cacheKey, live, TTL_CONFIG.STANDINGS, this.env);
        return { data: live, stale: false, updatedAt: new Date().toISOString() };
      }
    } catch (e) {
      console.warn('[F1Service] Jolpica constructor standings failed:', e.message);
    }

    if (cached.found && Array.isArray(cached.data)) {
      return { data: cached.data, stale: true, updatedAt: cached.updatedAt };
    }

    return { data: FALLBACK_2026_CONSTRUCTORS, stale: true, updatedAt: new Date().toISOString() };
  }

  /**
   * 获取上一站大奖赛赛果
   */
  async getLatestRaceResult() {
    const cacheKey = 'f1:2026:last_result';
    const cached = await getCache(cacheKey, this.env);
    if (cached.found && !cached.isStale && cached.data) {
      return { data: cached.data, stale: false, updatedAt: cached.updatedAt };
    }

    try {
      const live = await fetchJolpicaLastResult();
      if (live && live.winner) {
        await setCache(cacheKey, live, TTL_CONFIG.LAST_RESULT, this.env);
        return { data: live, stale: false, updatedAt: new Date().toISOString() };
      }
    } catch (e) {
      console.warn('[F1Service] Jolpica last result failed:', e.message);
    }

    if (cached.found && cached.data) {
      return { data: cached.data, stale: true, updatedAt: cached.updatedAt };
    }

    return { data: FALLBACK_LAST_RACE, stale: true, updatedAt: new Date().toISOString() };
  }

  /**
   * 聚合首页核心 Overview 数据 (解决首屏同时发 8 个请求的开销)
   * @param {Date} [nowDate=new Date()]
   */
  async getOverview(nowDate = new Date()) {
    const cacheKey = 'f1:2026:overview';
    const cached = await getCache(cacheKey, this.env);
    if (cached.found && !cached.isStale && cached.data) {
      // 动态重新计算 nextSession（避免静态缓存导致会话过期不刷新）
      const meeting = cached.data.currentMeeting || cached.data.nextMeeting;
      const nextSession = getNextRelevantSession(meeting?.sessions, nowDate);
      return {
        ...cached.data,
        nextSession,
        stale: false,
        updatedAt: cached.updatedAt
      };
    }

    // 并发聚合基础数据
    const [calRes, driversRes, teamsRes, lastResultRes] = await Promise.all([
      this.getCalendar(),
      this.getDriverStandings(),
      this.getConstructorStandings(),
      this.getLatestRaceResult()
    ]);

    const calendar = calRes.data;
    const nowIso = nowDate.toISOString().split('T')[0];

    // 寻找当前/即将进行的 Meeting
    const nextRace = calendar.find(r => r.dateEnd >= nowIso) || FALLBACK_CURRENT_MEETING;
    const currentMeeting = nextRace.sessions ? nextRace : FALLBACK_CURRENT_MEETING;
    const nextSession = getNextRelevantSession(currentMeeting.sessions, nowDate);

    const totalRounds = calendar.length || 23;
    const completedRounds = calendar.filter(r => r.dateEnd < nowIso).length;

    const overviewData = {
      season: '2026',
      currentMeeting,
      nextMeeting: currentMeeting,
      nextSession,
      previousRace: lastResultRes.data || FALLBACK_LAST_RACE,
      driverStandings: driversRes.data || FALLBACK_2026_DRIVERS,
      constructorStandings: teamsRes.data || FALLBACK_2026_CONSTRUCTORS,
      calendar,
      seasonProgress: {
        completedRounds,
        totalRounds,
        percentage: Math.round((completedRounds / totalRounds) * 100)
      },
      liveState: {
        isLive: nextSession.status === 'IN_PROGRESS',
        label: nextSession.status === 'IN_PROGRESS' ? '比赛进行中 (LIVE)' : '最新官方数据 (Latest Data)',
        status: nextSession.status
      },
      updatedAt: new Date().toISOString(),
      stale: calRes.stale || driversRes.stale
    };

    // 校验完整性
    const validation = validateOverview(overviewData);
    if (validation.valid) {
      await setCache(cacheKey, overviewData, TTL_CONFIG.OVERVIEW, this.env);
    }

    return overviewData;
  }
}
