// providers/f1/service.ts
// F1 统一数据服务门面：提供带多级缓存、Last Known Good (LKG) 权威降级与数据清洗的聚合能力
// 严格遵守数据真实性：严禁运行时硬编码编造假积分或假分站事实，网络与 LKG 皆不可用时显式标记 UNAVAILABLE

import { CacheStore } from '../../lib/storage/interfaces';
import { defaultCache } from '../../lib/storage';
import { LastKnownGoodStore, defaultLkgStore, FRESHNESS_THRESHOLDS } from '../../lib/storage/lkg';
import {
  fetchJolpicaCalendar,
  fetchJolpicaDriverStandings,
  fetchJolpicaConstructorStandings,
  fetchJolpicaLastResult
} from './jolpica';
import { getNextRelevantSession } from '../../lib/f1/time';
import { F1Meeting, DriverStanding, ConstructorStanding, RaceResultSummary, F1Overview } from '../../lib/f1/types';

export class F1Service {
  private cache: CacheStore;
  private lkg: LastKnownGoodStore;

  constructor(cache: CacheStore = defaultCache, lkg: LastKnownGoodStore = defaultLkgStore) {
    this.cache = cache;
    this.lkg = lkg;
  }

  async getCalendar(season: string = '2026'): Promise<F1Meeting[]> {
    const cacheKey = `f1:v3:calendar:${season}`;
    const cached = await this.cache.get<F1Meeting[]>(cacheKey);
    if (cached) return cached;

    // 1. 尝试从上游 Jolpica 获取实时赛历
    try {
      const live = await fetchJolpicaCalendar(season);
      if (live && live.length > 0) {
        await this.cache.set(cacheKey, live, 3600); // 1小时热缓存
        await this.lkg.save('calendar', live, 'jolpica', season); // 持久化到 LKG
        return live;
      }
    } catch (err: any) {
      console.warn(`[F1Service] Jolpica calendar fetch failed: ${err.message}. Checking LKG store...`);
    }

    // 2. 降级读取持久化 LKG 快照
    const lkgSnapshot = await this.lkg.get<F1Meeting[]>('calendar', FRESHNESS_THRESHOLDS.calendar, season);
    if (lkgSnapshot.available && lkgSnapshot.data && lkgSnapshot.data.length > 0) {
      await this.cache.set(cacheKey, lkgSnapshot.data, 300);
      return lkgSnapshot.data;
    }

    // 3. 上游与 LKG 皆无有效数据，返回空数组（绝对不编造虚假赛程）
    return [];
  }

  async getDriverStandings(season: string = '2026'): Promise<DriverStanding[]> {
    const cacheKey = `f1:v3:standings:drivers:${season}`;
    const cached = await this.cache.get<DriverStanding[]>(cacheKey);
    if (cached) return cached;

    // 1. 尝试从上游 Jolpica 获取车手积分
    try {
      const live = await fetchJolpicaDriverStandings(season);
      if (live && live.length > 0) {
        await this.cache.set(cacheKey, live, 1800); // 30分钟热缓存
        await this.lkg.save('driverStandings', live, 'jolpica', season);
        return live;
      }
    } catch (err: any) {
      console.warn(`[F1Service] Jolpica driver standings failed: ${err.message}. Checking LKG store...`);
    }

    // 2. 降级读取持久化 LKG 快照
    const lkgSnapshot = await this.lkg.get<DriverStanding[]>('driverStandings', FRESHNESS_THRESHOLDS.driverStandings, season);
    if (lkgSnapshot.available && lkgSnapshot.data && lkgSnapshot.data.length > 0) {
      await this.cache.set(cacheKey, lkgSnapshot.data, 300);
      return lkgSnapshot.data;
    }

    return [];
  }

  async getConstructorStandings(season: string = '2026'): Promise<ConstructorStanding[]> {
    const cacheKey = `f1:v3:standings:constructors:${season}`;
    const cached = await this.cache.get<ConstructorStanding[]>(cacheKey);
    if (cached) return cached;

    // 1. 尝试从上游 Jolpica 获取车队积分
    try {
      const live = await fetchJolpicaConstructorStandings(season);
      if (live && live.length > 0) {
        await this.cache.set(cacheKey, live, 1800);
        await this.lkg.save('constructorStandings', live, 'jolpica', season);
        return live;
      }
    } catch (err: any) {
      console.warn(`[F1Service] Jolpica constructor standings failed: ${err.message}. Checking LKG store...`);
    }

    // 2. 降级读取持久化 LKG 快照
    const lkgSnapshot = await this.lkg.get<ConstructorStanding[]>('constructorStandings', FRESHNESS_THRESHOLDS.constructorStandings, season);
    if (lkgSnapshot.available && lkgSnapshot.data && lkgSnapshot.data.length > 0) {
      await this.cache.set(cacheKey, lkgSnapshot.data, 300);
      return lkgSnapshot.data;
    }

    return [];
  }

  async getLastRaceResult(season: string = '2026'): Promise<RaceResultSummary | undefined> {
    const cacheKey = `f1:v3:results:last:${season}`;
    const cached = await this.cache.get<RaceResultSummary>(cacheKey);
    if (cached) return cached;

    // 1. 尝试从上游 Jolpica 获取上一场比赛结果
    try {
      const live = await fetchJolpicaLastResult();
      if (live && live.winner) {
        await this.cache.set(cacheKey, live, 3600);
        await this.lkg.save('lastResult', live, 'jolpica', season);
        return live;
      }
    } catch (err: any) {
      console.warn(`[F1Service] Jolpica last result failed: ${err.message}. Checking LKG store...`);
    }

    // 2. 降级读取持久化 LKG 快照
    const lkgSnapshot = await this.lkg.get<RaceResultSummary>('lastResult', FRESHNESS_THRESHOLDS.lastResult, season);
    if (lkgSnapshot.available && lkgSnapshot.data) {
      await this.cache.set(cacheKey, lkgSnapshot.data, 300);
      return lkgSnapshot.data;
    }

    return undefined;
  }

  async getOverview(season: string = '2026'): Promise<F1Overview> {
    const cacheKey = `f1:v3:overview:${season}`;
    const cached = await this.cache.get<F1Overview>(cacheKey);
    if (cached) return cached;

    const [calendar, driverStandings, constructorStandings, previousRace] = await Promise.all([
      this.getCalendar(season),
      this.getDriverStandings(season),
      this.getConstructorStandings(season),
      this.getLastRaceResult(season)
    ]);

    const now = new Date();
    const nowMs = now.getTime();

    // 确定数据源与陈旧度状态
    let dataSource: 'live' | 'cache' | 'lkg' | 'unavailable' = 'live';
    let isStale = false;
    let staleReason: string | undefined;

    if (calendar.length === 0 || driverStandings.length === 0) {
      dataSource = 'unavailable';
      staleReason = 'DATA_SYNCING';
    }

    // 动态查找当前进行中或下一个分站
    let currentMeeting: F1Meeting;
    if (calendar.length > 0) {
      const upcoming = calendar.find(m => {
        const raceTime = m.raceStartUTC ? new Date(m.raceStartUTC).getTime() : 0;
        return raceTime + (4 * 3600 * 1000) > nowMs; // 比赛结束4小时内仍作为当前分站
      });
      currentMeeting = upcoming || calendar[calendar.length - 1];
    } else {
      // 优雅的占位结构，避免前端解构崩溃
      currentMeeting = {
        meetingId: 'tbd',
        round: 0,
        season,
        name: 'FIA Formula 1 World Championship',
        nameZh: '新赛季赛程同步中',
        country: 'Global',
        locality: '待定',
        circuitId: 'unknown',
        circuitName: '待定赛道',
        raceStartUTC: '',
        isSprintWeekend: false,
        sessions: []
      };
    }

    const nextSession = getNextRelevantSession(currentMeeting.sessions || [], now);

    const overview: F1Overview = {
      season,
      currentMeeting,
      nextSession,
      driverStandings,
      constructorStandings,
      previousRace,
      updatedAt: now.toISOString(),
      dataSource,
      isStale,
      staleReason,
      totalRounds: calendar.length
    };

    // 如果数据有效，缓存 60 秒
    if (dataSource !== 'unavailable') {
      await this.cache.set(cacheKey, overview, 60);
    }

    return overview;
  }
}

// 导出全局单例
export const defaultF1Service = new F1Service(defaultCache, defaultLkgStore);
