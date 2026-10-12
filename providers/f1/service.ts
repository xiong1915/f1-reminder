// providers/f1/service.ts
// F1 统一数据服务门面：提供带多级缓存、Last Known Good (LKG) 权威降级与数据清洗的聚合能力
// 严格遵守数据真实性：严禁运行时硬编码编造假积分或假分站事实，网络与 LKG 皆不可用时显式标记 UNAVAILABLE

import type { CacheStore } from '../../lib/storage/interfaces';
import { defaultCache } from '../../lib/storage';
import { LastKnownGoodStore, defaultLkgStore, FRESHNESS_THRESHOLDS } from '../../lib/storage/lkg';
import {
  fetchJolpicaSeasons,
  fetchJolpicaCalendar,
  fetchJolpicaDriverStandings,
  fetchJolpicaConstructorStandings,
  fetchJolpicaLastResult,
  fetchJolpicaRaceResult,
  fetchJolpicaQualifyingResult,
  fetchJolpicaSprintResult
} from './jolpica';
import { getNextRelevantSession } from '../../lib/f1/time';
import type {
  F1Meeting,
  DriverStanding,
  ConstructorStanding,
  RaceResultSummary,
  F1Overview,
  StandingsScopeDetail,
  DataSyncStatus,
  DetailedRaceResultItem,
  DetailedQualifyingResultItem,
  DetailedSprintResultItem
} from '../../lib/f1/types';

export interface StandingsCutoffResult {
  desc: string;
  verified: boolean;
  isSprintPending: boolean;
  officialRound?: number;
  reason?: string;
}

export interface StandingsReconciliationEvidence {
  sprintResults?: DetailedSprintResultItem[];
  raceResults?: DetailedRaceResultItem[];
  previousRoundDriverPoints?: Record<string, number>;
  previousRoundConstructorPoints?: Record<string, number>;
  season?: string;
  round?: number;
}

export function determineStandingsCutoff(
  driverStandings: DriverStanding[] = [],
  constructorStandings: ConstructorStanding[] = [],
  calendar: F1Meeting[] = [],
  previousRace?: RaceResultSummary,
  standingsFetchedAt?: string,
  season: string = '2026',
  reconciliation?: StandingsReconciliationEvidence
): StandingsCutoffResult {
  const seasonNum = Number(season);
  const currentYear = new Date().getUTCFullYear();

  // 1. 空数据与未来年份门禁拦截 (严禁将空数据或未来年份标记为已验证最终官方榜)
  if (!driverStandings || driverStandings.length === 0) {
    if (seasonNum > currentYear) {
      return { desc: `${season} 赛季尚未开赛`, verified: false, isSprintPending: false, reason: 'FUTURE_SEASON' };
    }
    return { desc: `${season} 赛季暂无积分数据`, verified: false, isSprintPending: false, reason: 'NO_DRIVER_STANDINGS' };
  }

  if (seasonNum > currentYear) {
    return { desc: `${season} 赛季尚未开赛`, verified: false, isSprintPending: false, reason: 'FUTURE_SEASON' };
  }

  // 2. 历史已完赛非空赛季直接标记为年度最终官方积分榜，绝不套用进行中周末的待更新逻辑
  if (seasonNum < currentYear) {
    const finalRound = Math.max(0, ...calendar.map(r => r.round));
    const calendarComplete = calendar.length === finalRound && new Set(calendar.map(r => r.round)).size === finalRound && calendar.every(r => r.season === season && r.round >= 1);
    const driversComplete = finalRound > 0 && driverStandings.every(d => d.officialRound === finalRound);
    const constructorsComplete = seasonNum < 1958 || (constructorStandings.length > 0 && constructorStandings.every(c => c.officialRound === finalRound));
    if (!calendarComplete || !driversComplete || !constructorsComplete || !previousRace?.winner || previousRace.season !== season || previousRace.round !== finalRound) {
      return { desc: '历史积分统计范围待核实', verified: false, isSprintPending: false, reason: 'HISTORICAL_SCOPE_UNVERIFIED' };
    }
    return {
      desc: `${season} 赛季最终官方积分榜`,
      verified: true,
      isSprintPending: false,
      officialRound: finalRound,
      reason: 'HISTORICAL_FINAL_SEASON'
    };
  }

  // 1. 独立检查车手积分的官方轮次（绝不能用 previousRace.round 代替！）
  const officialRound = driverStandings[0]?.officialRound;
  if (!officialRound) {
    // 缺少官方轮次，实事求是：截止场次待核实，verified: false
    return {
      desc: '截止场次待核实',
      verified: false,
      isSprintPending: false,
      reason: 'MISSING_OFFICIAL_ROUND'
    };
  }

  if (!driverStandings.every(d => d.officialRound === officialRound && d.snapshotSession === driverStandings[0].snapshotSession)) return {desc: '截止场次待核实', verified: false, isSprintPending: false, reason: 'DRIVER_SCOPE_MISMATCH'};
  // 2. 分别检查车队积分的统计范围
  const constructorRound = constructorStandings[0]?.officialRound;
  const isStandingsInSync = Boolean(constructorRound && constructorRound === officialRound && constructorStandings.every(c => c.officialRound === constructorRound && c.snapshotSession === constructorStandings[0].snapshotSession));

  // 3. 匹配官方赛历中的对应分站
  const meeting = calendar.find(m => m.round === officialRound);
  const raceNameZh = meeting?.nameZh || `第 ${officialRound} 站`;

  if (!meeting) {
    return {
      desc: `第 ${officialRound} 站`,
      verified: false,
      isSprintPending: false,
      officialRound,
      reason: 'MEETING_NOT_IN_CALENDAR'
    };
  }

  // 4. 标准周末：该站仅正赛产生积分，官方 round 到达该站必然结算正赛
  if (!meeting.isSprintWeekend) {
    return {
      desc: `第 ${officialRound} 站 ${raceNameZh} 正赛`,
      verified: isStandingsInSync,
      isSprintPending: false,
      officialRound,
      reason: isStandingsInSync ? undefined : 'CONSTRUCTOR_ROUND_MISMATCH'
    };
  }

  // 5. 冲刺周末：分站官方 round 不能单独证明同一冲刺周末已包含正赛积分
  // 必须依据明确的场次元数据（snapshotSession）或逐场积分核对证据
  // 严禁依赖 standingsFetchedAt 与 previousRace.date 比较
  // 严禁在没有取得正赛赛果时直接假设当前积分一定是冲刺积分
  // 缺少场次证据时坚决返回“截止场次待核实”，verified=false
  const driverSession = driverStandings[0]?.snapshotSession;
  const constructorSession = constructorStandings[0]?.snapshotSession;

  if (driverSession === 'race') {
    const inSync = isStandingsInSync && constructorSession === 'race';
    if (inSync) {
      return {
        desc: `第 ${officialRound} 站 ${raceNameZh} 正赛`,
        verified: true,
        isSprintPending: false,
        officialRound
      };
    }
    return {
      desc: '截止场次待核实',
      verified: false,
      isSprintPending: false,
      officialRound,
      reason: isStandingsInSync ? 'CONSTRUCTOR_SESSION_MISMATCH' : 'CONSTRUCTOR_ROUND_MISMATCH'
    };
  }

  if (driverSession === 'sprint') {
    const inSync = isStandingsInSync && constructorSession === 'sprint';
    if (inSync) {
      return {
        desc: `第 ${officialRound} 站 ${raceNameZh} 冲刺赛`,
        verified: true,
        isSprintPending: true,
        officialRound
      };
    }
    return {
      desc: '截止场次待核实',
      verified: false,
      isSprintPending: false,
      officialRound,
      reason: isStandingsInSync ? 'CONSTRUCTOR_SESSION_MISMATCH' : 'CONSTRUCTOR_ROUND_MISMATCH'
    };
  }

  // 全榜核对：上一轮快照 + 官方逐车手/车队赛果；单个车手增量不能证明场次。
  if (reconciliation?.season === season && reconciliation.round === officialRound &&
      reconciliation.previousRoundDriverPoints && reconciliation.previousRoundConstructorPoints) {
    const matches = (events: (DetailedRaceResultItem | DetailedSprintResultItem)[]) => {
      if (!events.length || events.some(e => !Number.isFinite(e.points) || !e.driverId || !e.constructorId)) return false;
      const drivers = new Map<string, number>(); const teams = new Map<string, number>();
      for (const e of events) { drivers.set(e.driverId, (drivers.get(e.driverId) || 0) + e.points); teams.set(e.constructorId, (teams.get(e.constructorId) || 0) + e.points); }
      const baseD = reconciliation.previousRoundDriverPoints!; const baseC = reconciliation.previousRoundConstructorPoints!;
      const same = (actual: number, expected: number) => Number.isFinite(actual) && Math.abs(actual - expected) < 0.001;
      return Object.keys(baseD).every(id => driverStandings.some(d => d.driverId === id)) &&
        [...drivers.keys()].every(id => driverStandings.some(d => d.driverId === id)) &&
        Object.keys(baseC).every(id => constructorStandings.some(c => c.teamId === id)) &&
        [...teams.keys()].every(id => constructorStandings.some(c => c.teamId === id)) &&
        driverStandings.every(d => same(d.points, (baseD[d.driverId] || 0) + (drivers.get(d.driverId) || 0))) &&
        constructorStandings.every(c => same(c.points, (baseC[c.teamId] || 0) + (teams.get(c.teamId) || 0)));
    };
    const sprint = reconciliation.sprintResults || []; const race = reconciliation.raceResults || [];
    if (race.length && matches([...sprint, ...race])) return { desc: `第 ${officialRound} 站 ${raceNameZh} 正赛`, verified: true, isSprintPending: false, officialRound, reason: 'FULL_RESULTS_RECONCILED_RACE' };
    if (sprint.length && matches(sprint)) return { desc: `第 ${officialRound} 站 ${raceNameZh} 冲刺赛`, verified: true, isSprintPending: true, officialRound, reason: 'FULL_RESULTS_RECONCILED_SPRINT' };
  }

  // 没有完整证据：坚决保持待核实
  return {
    desc: '截止场次待核实',
    verified: false,
    isSprintPending: false,
    officialRound,
    reason: 'SESSION_EVIDENCE_REQUIRED_FOR_SPRINT_WEEKEND'
  };
}

export function evaluateHasLatestRaceResult(
  calendar: F1Meeting[] = [],
  previousRace?: RaceResultSummary,
  referenceTime: Date = new Date()
): boolean | 'unknown' {
  if (!calendar || calendar.length === 0) {
    return 'unknown';
  }

  const nowMs = referenceTime.getTime();
  if (!Number.isFinite(nowMs)) return 'unknown';
  const scheduled = calendar.map(m => ({meeting: m, start: Date.parse(m.raceStartUTC || m.sessions?.find(s => s.type === 'race')?.startTimeUTC || '')}));
  if (scheduled.some(m => !Number.isFinite(m.start))) return 'unknown';
  const started = scheduled.filter(m => m.start <= nowMs).sort((a, b) => a.start - b.start);
  if (!started.length) return false;
  const target = started[started.length - 1].meeting;
  // Scheduled time identifies a target, but cannot prove that a race has finished.
  if (!previousRace?.winner || previousRace.round !== target.round || String(previousRace.season) !== String(target.season)) return 'unknown';
  return true;
}

export interface UpstreamSyncRecord {
  success: boolean;
  error?: string;
  attemptedAt: string;
}

export const UPSTREAM_SYNC_STATUS_KEY = 'tike:sync:upstream_status';

export interface DataFetchResult<T> {
  data: T;
  source: 'live' | 'cache' | 'lkg' | 'unavailable';
  fetchedAt?: string;
  cacheHit?: boolean;
  isStale: boolean;
  staleReason?: string;
}

export class F1Service {
  private cache: CacheStore;
  private lkg: LastKnownGoodStore;

  constructor(cache: CacheStore = defaultCache, lkg: LastKnownGoodStore = defaultLkgStore) {
    this.cache = cache;
    this.lkg = lkg;
  }

  async recordUpstreamAttempt(success: boolean, error?: string, domain = 'manual', season = '2026'): Promise<void> {
    const record: UpstreamSyncRecord = {success, error: success ? undefined : error, attemptedAt: new Date().toISOString()};
    await this.cache.set(`${UPSTREAM_SYNC_STATUS_KEY}:${season}:${domain}`, record, 7 * 86400);
    await this.cache.delete(`f1:v3:overview:${season}`);
  }
  async getUpstreamSyncRecord(season = '2026'): Promise<UpstreamSyncRecord | null> {
    const domains = ['calendar', 'driverStandings', 'constructorStandings', 'lastResult'];
    const records = await Promise.all(domains.map(domain => this.cache.get<UpstreamSyncRecord>(`${UPSTREAM_SYNC_STATUS_KEY}:${season}:${domain}`)));
    const known = records.filter((r): r is UpstreamSyncRecord => Boolean(r));
    if (!known.length) return this.cache.get<UpstreamSyncRecord>(`${UPSTREAM_SYNC_STATUS_KEY}:${season}:manual`);
    const failed = domains.filter((_, i) => records[i]?.success === false);
    if (!failed.length && known.length !== domains.length) return null;
    return {success: !failed.length, error: failed.length ? `UPSTREAM_FAILED:${failed.join(',')}` : undefined,
      attemptedAt: known.map(r => r.attemptedAt).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!};
  }
  private async loadDomain<T>(season: string, domain: string, key: string, ttl: number, freshness: number,
    fetcher: () => Promise<T>, valid: (data: T) => boolean, force = false): Promise<DataFetchResult<T>> {
    if (!force) {
      const cached = await this.cache.get<any>(key);
      if (cached?.dataCacheVersion === 1 && valid(cached.result?.data)) return {...cached.result, cacheHit: true, source: cached.result.source === 'lkg' ? 'lkg' : 'cache'};
      if (cached && valid(cached)) return {data: cached, source: 'cache', cacheHit: true, fetchedAt: undefined, isStale: false};
    }
    let live: T;
    try {
      live = await fetcher();
      if (!valid(live)) throw new Error('Invalid or empty upstream data');
    } catch {
      await this.recordUpstreamAttempt(false, 'UPSTREAM_REQUEST_FAILED', domain, season);
      const fallback = await this.lkg.get<T>(domain, freshness, season);
      const result: DataFetchResult<T> = fallback.available && fallback.data && valid(fallback.data)
        ? {data: fallback.data, source: 'lkg', fetchedAt: fallback.fetchedAt, isStale: fallback.isStale, staleReason: fallback.staleReason}
        : {data: (domain === 'lastResult' ? undefined : []) as T, source: 'unavailable', isStale: true, staleReason: 'NO_DATA'};
      if (result.source === 'lkg') await this.cache.set(key, {dataCacheVersion: 1, result}, 300);
      return result;
    }
    const fetchedAt = new Date().toISOString();
    const result: DataFetchResult<T> = {data: live, source: 'live', fetchedAt, isStale: false};
    await this.recordUpstreamAttempt(true, undefined, domain, season);
    await this.lkg.save(domain, live, 'jolpica', season, fetchedAt);
    await this.cache.set(key, {dataCacheVersion: 1, result}, ttl);
    return result;
  }
  async getCalendarResult(season = '2026', force = false): Promise<DataFetchResult<F1Meeting[]>> {
    return this.loadDomain(season, 'calendar', `f1:v3:calendar:${season}`, 3600, FRESHNESS_THRESHOLDS.calendar,
      () => fetchJolpicaCalendar(season), data => Array.isArray(data) && data.length > 0, force);
  }
  async getCalendar(season = '2026'): Promise<F1Meeting[]> { return (await this.getCalendarResult(season)).data; }
  async getDriverStandingsResult(season = '2026', force = false): Promise<DataFetchResult<DriverStanding[]>> {
    return this.loadDomain(season, 'driverStandings', `f1:v3:standings:drivers:${season}`, 1800, FRESHNESS_THRESHOLDS.driverStandings,
      () => fetchJolpicaDriverStandings(season), data => Array.isArray(data) && data.length > 0, force);
  }
  async getDriverStandings(season = '2026'): Promise<DriverStanding[]> { return (await this.getDriverStandingsResult(season)).data; }
  async getConstructorStandingsResult(season = '2026', force = false): Promise<DataFetchResult<ConstructorStanding[]>> {
    return this.loadDomain(season, 'constructorStandings', `f1:v3:standings:constructors:${season}`, 1800, FRESHNESS_THRESHOLDS.constructorStandings,
      () => fetchJolpicaConstructorStandings(season), data => Array.isArray(data) && (data.length > 0 || Number(season) < 1958), force);
  }
  async getConstructorStandings(season = '2026'): Promise<ConstructorStanding[]> { return (await this.getConstructorStandingsResult(season)).data; }
  async getLastRaceResultResult(season = '2026', force = false): Promise<DataFetchResult<RaceResultSummary | undefined>> {
    return this.loadDomain(season, 'lastResult', `f1:v3:results:last:${season}`, 3600, FRESHNESS_THRESHOLDS.lastResult,
      () => fetchJolpicaLastResult(season), data => Boolean(data?.winner && (!data.season || data.season === season)), force);
  }
  async getLastRaceResult(season = '2026'): Promise<RaceResultSummary | undefined> { return (await this.getLastRaceResultResult(season)).data; }

  async getSeasons(): Promise<string[]> {
    const cacheKey = 'f1:v3:seasons';
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seasons = await fetchJolpicaSeasons();
    await this.cache.set(cacheKey, seasons, 86400);
    return seasons;
  }

  async getRaceResult(season: string, round: number | string): Promise<DetailedRaceResultItem[]> {
    const cacheKey = `f1:v3:results:race:${season}:${round}`;
    const cached = await this.cache.get<DetailedRaceResultItem[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    try {
      const results = await fetchJolpicaRaceResult(season, round);
      if (results && results.length > 0) {
        await this.cache.set(cacheKey, results, 86400);
      }
      return results;
    } catch {
      return [];
    }
  }

  async getQualifyingResult(season: string, round: number | string): Promise<DetailedQualifyingResultItem[]> {
    const cacheKey = `f1:v3:results:quali:${season}:${round}`;
    const cached = await this.cache.get<DetailedQualifyingResultItem[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    try {
      const results = await fetchJolpicaQualifyingResult(season, round);
      if (results && results.length > 0) {
        await this.cache.set(cacheKey, results, 86400);
      }
      return results;
    } catch {
      return [];
    }
  }

  async getSprintResult(season: string, round: number | string): Promise<DetailedSprintResultItem[]> {
    const cacheKey = `f1:v3:results:sprint:${season}:${round}`;
    const cached = await this.cache.get<DetailedSprintResultItem[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    try {
      const results = await fetchJolpicaSprintResult(season, round);
      if (results && results.length > 0) {
        await this.cache.set(cacheKey, results, 86400);
      }
      return results;
    } catch {
      return [];
    }
  }

  async getOverview(season: string = '2026'): Promise<F1Overview> {
    const cacheKey = `f1:v3:overview:${season}`;
    const cached = await this.cache.get<F1Overview>(cacheKey);
    if (cached) {
      const source = cached.dataSource === 'live' ? 'cache' : cached.dataSource;
      const record = await this.getUpstreamSyncRecord(season);
      return {...cached, dataSource: source, isCacheHit: true, respondedAt: new Date().toISOString(),
        upstreamSyncSuccess: record?.success, syncStatus: cached.syncStatus ? {...cached.syncStatus,
          source, isCacheHit: true, upstreamSyncSuccess: record?.success, upstreamError: record?.error, lastAttemptAt: record?.attemptedAt} : undefined};
    }

    const [calendarRes, driversRes, constructorsRes, previousRaceRes] = await Promise.all([
      this.getCalendarResult(season),
      this.getDriverStandingsResult(season),
      this.getConstructorStandingsResult(season),
      this.getLastRaceResultResult(season)
    ]);

    const calendar = calendarRes.data;
    const driverStandings = driversRes.data;
    const constructorStandings = constructorsRes.data;
    const previousRace = previousRaceRes.data;

    const now = new Date();
    const nowMs = now.getTime();
    const isHistorical = Number(season) < new Date().getUTCFullYear();

    // 1. 独立判断当前是否命中缓存及数据来源路径
    const results = [calendarRes, driversRes, constructorsRes, previousRaceRes];
    const hasAnyCache = results.some(r => r.source === 'cache' || r.cacheHit);
    const hasAnyLkg = results.some(r => r.source === 'lkg');
    const isCacheHit = hasAnyCache;

    let dataSource: 'live' | 'cache' | 'lkg' | 'unavailable' = 'live';
    if (calendar.length === 0 || driverStandings.length === 0) {
      dataSource = 'unavailable';
    } else if (hasAnyLkg) {
      dataSource = 'lkg';
    } else if (hasAnyCache) {
      dataSource = 'cache';
    } else {
      dataSource = 'live';
    }

    // 2. 上游同步状态：从真实持久化同步记录读取，绝不从 cache/lkg 直接倒推；缓存命中未发起请求时保留最近结果或标为未知
    const syncRecord = await this.getUpstreamSyncRecord(season);
    const upstreamSyncSuccess = syncRecord?.success;
    const upstreamError = syncRecord?.error;

    // 3. 统计范围与截止场次动态判断（绝不猜测时间，结合场次与快照证据）
    const driverRound = driverStandings[0]?.officialRound;
    const constructorRound = constructorStandings[0]?.officialRound;
    const driverSnapshotSession = driverStandings[0]?.snapshotSession;
    const constructorSnapshotSession = constructorStandings[0]?.snapshotSession;
    const raceResultRound = previousRace?.round;

    const hasLatestRaceResult = evaluateHasLatestRaceResult(calendar, previousRace, now);

    const isSprintWeekendMeeting = Boolean(
      driverRound && calendar.find(m => m.round === driverRound)?.isSprintWeekend
    );

    let cutoffInfo = determineStandingsCutoff(driverStandings, constructorStandings, calendar, previousRace, driversRes.fetchedAt, season);
    if (!cutoffInfo.verified && isSprintWeekendMeeting && driverRound && driverRound > 1 && driverRound === constructorRound) {
      try {
        const evidenceKey = `f1:reconciliation:${season}:${driverRound}`;
        let evidence = await this.cache.get<StandingsReconciliationEvidence>(evidenceKey);
        if (!evidence) {
          const [baseDrivers, baseTeams, sprintResults, raceResults] = await Promise.all([
            fetchJolpicaDriverStandings(season, driverRound - 1), fetchJolpicaConstructorStandings(season, driverRound - 1),
            fetchJolpicaSprintResult(season, driverRound), fetchJolpicaRaceResult(season, driverRound)
          ]);
          evidence = { season, round: driverRound, sprintResults, raceResults,
            previousRoundDriverPoints: Object.fromEntries(baseDrivers.map(d => [d.driverId, d.points])),
            previousRoundConstructorPoints: Object.fromEntries(baseTeams.map(c => [c.teamId, c.points])) };
          await this.cache.set(evidenceKey, evidence, 60);
        }
        cutoffInfo = determineStandingsCutoff(driverStandings, constructorStandings, calendar, previousRace, driversRes.fetchedAt, season, evidence);
      } catch { /* 无法取得完整官方证据时保留待核实 */ }
    }
    const isStandingsInSync = cutoffInfo.verified;
    const sessionEvidenceAvailable = isHistorical || !isSprintWeekendMeeting || Boolean(driverSnapshotSession && constructorSnapshotSession && driverSnapshotSession === constructorSnapshotSession && cutoffInfo.verified);

    const standingsLagging = !isHistorical && Boolean(
      previousRace?.winner && previousRace.season === season &&
      driverRound &&
      (driverRound < previousRace.round || Boolean(constructorRound && constructorRound < previousRace.round) || (driverRound === previousRace.round && isSprintWeekendMeeting && (driverSnapshotSession === 'sprint' || constructorSnapshotSession === 'sprint')))
    );

    const scopeDetail: StandingsScopeDetail = {
      driverStandingsRound: driverRound,
      constructorStandingsRound: constructorRound,
      lastRaceResultRound: raceResultRound,
      driverSnapshotSession,
      isSynchronized: isStandingsInSync,
      hasLatestRaceResult,
      standingsLagging,
      sessionEvidenceAvailable
    };

    // 4. 严谨评估陈旧度：历史赛季已完结绝不标为 isStale
    let isStale = false;
    let staleReason: string | undefined;

    if (!isHistorical) {
      if (dataSource === 'unavailable') {
        isStale = true;
        staleReason = 'DATA_SYNCING';
      } else if (standingsLagging) {
        isStale = true;
        staleReason = `STANDINGS_PENDING_ROUND_${previousRace?.round}`;
      } else if (results.some(r => r.isStale)) {
        isStale = true;
        staleReason = 'DATA_FRESHNESS_UNKNOWN';
      }
    }

    // 动态查找分站
    let currentMeeting: F1Meeting;
    if (calendar.length > 0) {
      if (isHistorical) {
        currentMeeting = calendar[calendar.length - 1];
      } else {
        const upcoming = calendar.find(m => {
          const raceTime = m.raceStartUTC ? new Date(m.raceStartUTC).getTime() : 0;
          return raceTime + (4 * 3600 * 1000) > nowMs; // 比赛结束4小时内仍作为当前分站
        });
        currentMeeting = upcoming || calendar[calendar.length - 1];
      }
    } else {
      currentMeeting = {
        meetingId: 'tbd',
        round: 0,
        season,
        name: 'FIA Formula 1 World Championship',
        nameZh: isHistorical ? `${season} 赛季未收录赛历` : '新赛季赛程同步中',
        country: 'Global',
        locality: '待定',
        circuitId: 'unknown',
        circuitName: '待定赛道',
        raceStartUTC: '',
        isSprintWeekend: false,
        sessions: []
      };
    }

    const nextSession = isHistorical
      ? { session: null, status: 'FINISHED' as const, targetUtcMs: null, targetIso: null }
      : getNextRelevantSession(currentMeeting.sessions || [], now);

    const raceStart = Date.parse(currentMeeting.raceStartUTC);
    const sprintStart = Date.parse(currentMeeting.sessions?.find(s => s.type === 'sprint')?.startTimeUTC || '');
    const baseRound = cutoffInfo.officialRound;
    const baseBeforeMeeting = Boolean(baseRound && baseRound < currentMeeting.round);
    const sprintAlreadyIncluded = baseRound === currentMeeting.round && driverSnapshotSession === 'sprint' && constructorSnapshotSession === 'sprint';
    const canSimulateSprint = !isHistorical && Boolean(cutoffInfo.verified && baseBeforeMeeting && currentMeeting.isSprintWeekend && sprintStart > nowMs);
    const canSimulateRace = !isHistorical && Boolean(cutoffInfo.verified && driverStandings.length >= 2 && raceStart > nowMs &&
      (sprintAlreadyIncluded || (baseBeforeMeeting && (!currentMeeting.isSprintWeekend || canSimulateSprint))));

    // 获取实际数据成功落库/同步的权威时间戳（无真实记录时为 undefined，绝不补造假时间）
    const timestamps = results.map(r => r.fetchedAt).filter((t): t is string => Boolean(t && Number.isFinite(Date.parse(t))));
    const lastSuccessfulUpdate = timestamps.length === results.length ? timestamps.sort((a, b) => Date.parse(a) - Date.parse(b))[0] : undefined;

    const syncStatus: DataSyncStatus = {
      lastSuccessfulSyncAt: lastSuccessfulUpdate,
      lastAttemptAt: syncRecord?.attemptedAt,
      source: dataSource,
      upstreamSyncSuccess,
      upstreamError,
      isCacheHit,
      hasLatestRaceResult,
      scopeDetail,
      isStale,
      staleReason
    };

    const overview: F1Overview = {
      season,
      currentMeeting,
      nextSession,
      driverStandings,
      constructorStandings,
      previousRace,
      updatedAt: lastSuccessfulUpdate,
      respondedAt: now.toISOString(),
      dataSource,
      upstreamSyncSuccess,
      isCacheHit,
      hasLatestRaceResult,
      scopeDetail,
      isStale,
      staleReason,
      totalRounds: calendar.length,
      canSimulateRace,
      canSimulateSprint,
      standingsCutoffDesc: cutoffInfo.desc,
      standingsCutoffVerified: cutoffInfo.verified,
      isSprintPending: cutoffInfo.isSprintPending,
      syncStatus
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
