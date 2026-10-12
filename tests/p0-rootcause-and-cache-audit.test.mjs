// tests/p0-rootcause-and-cache-audit.test.mjs
// P0 根因复核、动态截止场次、三维状态解耦与固定时钟专项回归测试

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F1Service, determineStandingsCutoff, evaluateHasLatestRaceResult } from '../providers/f1/service.ts';
import { LastKnownGoodStore } from '../lib/storage/lkg.ts';
import { MemoryCacheStore } from '../lib/storage/index.ts';
import { DEFAULT_SINGAPORE_REPLAY } from '../lib/f1/replay/sample-sessions.ts';

test('P0 根因复核与数据中心严谨性验收', async (t) => {
  // 固定参考时间戳与独立隔离内存存储（杜绝写工作区真实磁盘快照）
  const FIXED_SYNC_TIMESTAMP = '2026-10-12T01:31:25.983Z';
  const memCache = new MemoryCacheStore();
  const memLkg = new LastKnownGoodStore(memCache, '');
  const service = new F1Service(memCache, memLkg);

  await t.test('1. 积分截止场次动态计算：完全杜绝硬编码死值积分，带明确正赛场次元数据时确认正赛', async () => {
    // 领跑者积分被任意修改（例如 999 分），但官方轮次为 17，显式带有 snapshotSession: 'race'
    const mockDriverStandings = [
      {
        rank: 1,
        driverId: 'antonelli',
        code: 'ANT',
        number: '12',
        name: '基米·安东内利',
        nameEn: 'Andrea Kimi Antonelli',
        fullZh: '基米·安东内利',
        team: '梅赛德斯车队',
        teamId: 'mercedes',
        points: 999, // 极端积分，验证完全不依赖 340/325
        wins: 8,
        gap: 0,
        officialRound: 17,
        snapshotSession: 'race'
      }
    ];

    const mockConstructorStandings = [
      {
        rank: 1,
        teamId: 'mercedes',
        name: '梅赛德斯车队',
        nameEn: 'Mercedes',
        points: 578,
        wins: 11,
        gap: 0,
        officialRound: 17,
        snapshotSession: 'race'
      }
    ];

    const mockCalendar = [
      {
        meetingId: '2026-17',
        round: 17,
        season: '2026',
        name: 'Singapore Grand Prix',
        nameZh: '新加坡大奖赛',
        country: '新加坡',
        locality: 'Marina Bay',
        circuitId: 'marina_bay',
        circuitName: '滨海湾市街赛道',
        raceStartUTC: '2026-10-11T12:00:00Z',
        isSprintWeekend: true,
        sessions: [
          {
            id: 'race-17',
            name: '大奖赛正赛 (Race)',
            nameEn: 'Grand Prix',
            type: 'race',
            startTimeUTC: '2026-10-11T12:00:00Z',
            durationMinutes: 120
          }
        ]
      }
    ];

    const mockPreviousRace = {
      round: 17,
      season: '2026',
      name: 'Singapore Grand Prix',
      nameZh: '新加坡大奖赛',
      locality: 'Marina Bay',
      date: '2026-10-11',
      winner: { code: 'VER', name: '马克斯·维斯塔潘', team: '红牛车队' },
      podium: []
    };

    // 存入独立内存缓存
    await memCache.set('f1:v3:standings:drivers:2026', mockDriverStandings, 3600);
    await memCache.set('f1:v3:standings:constructors:2026', mockConstructorStandings, 3600);
    await memCache.set('f1:v3:calendar:2026', mockCalendar, 3600);
    await memCache.set('f1:v3:results:last:2026', mockPreviousRace, 3600);
    await memLkg.save('driverStandings', mockDriverStandings, 'jolpica', '2026');

    const overview = await service.getOverview('2026');
    assert.strictEqual(overview.standingsCutoffDesc, '第 17 站 新加坡大奖赛 正赛');
    assert.strictEqual(overview.standingsCutoffVerified, true);
    assert.strictEqual(overview.isSprintPending, false);
  });

  await t.test('2. 场景A：同轮次冲刺周末，正赛结果已发布，但积分缺少正赛场次证据（证据不足 -> 待核实）', () => {
    // 缺少 snapshotSession 场次明确元数据
    const driversR17 = [{ rank: 1, driverId: 'antonelli', officialRound: 17 }];
    const constructorsR17 = [{ rank: 1, teamId: 'mercedes', officialRound: 17 }];
    const calendarR17 = [{
      round: 17,
      nameZh: '新加坡大奖赛',
      isSprintWeekend: true,
      sessions: []
    }];
    const raceFinished = {
      round: 17,
      nameZh: '新加坡大奖赛',
      date: '2026-10-11',
      winner: { code: 'VER' }
    };
    const sprintSnapshotTime = '2026-10-10T16:00:00Z';

    const result = determineStandingsCutoff(
      driversR17,
      constructorsR17,
      calendarR17,
      raceFinished,
      sprintSnapshotTime
    );

    assert.strictEqual(result.desc, '截止场次待核实', '冲刺周末缺少确凿场次元数据证据时必须标为待核实');
    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.reason, 'SESSION_EVIDENCE_REQUIRED_FOR_SPRINT_WEEKEND');
  });

  await t.test('3. 场景B：冲刺积分尚未更新，正赛已经结束发布（完赛轮次领先积分榜）', async () => {
    const freshCache = new MemoryCacheStore();
    const freshLkg = new LastKnownGoodStore(freshCache, '');
    const freshService = new F1Service(freshCache, freshLkg);

    // 正赛第 17 站已完赛发布
    const previousRaceR17 = {
      round: 17,
      season: '2026',
      nameZh: '新加坡大奖赛',
      date: '2026-10-11',
      winner: { code: 'VER' }
    };

    // 但车手积分仍滞后在第 16 站
    const standingsR16 = [{ rank: 1, driverId: 'antonelli', officialRound: 16 }];
    const constructorsR16 = [{ rank: 1, teamId: 'mercedes', officialRound: 16 }];
    const calendar = [
      {
        round: 16,
        season: '2026',
        nameZh: '马来西亚站',
        isSprintWeekend: false,
        raceStartUTC: '2026-09-27T12:00:00Z',
        sessions: [{ type: 'race', startTimeUTC: '2026-09-27T12:00:00Z' }]
      },
      {
        round: 17,
        season: '2026',
        nameZh: '新加坡大奖赛',
        isSprintWeekend: true,
        raceStartUTC: '2026-10-11T12:00:00Z',
        sessions: [{ type: 'race', startTimeUTC: '2026-10-11T12:00:00Z' }]
      }
    ];

    await freshCache.set('f1:v3:calendar:2026', calendar, 3600);
    await freshCache.set('f1:v3:standings:drivers:2026', standingsR16, 3600);
    await freshCache.set('f1:v3:standings:constructors:2026', constructorsR16, 3600);
    await freshCache.set('f1:v3:results:last:2026', previousRaceR17, 3600);

    const overview = await freshService.getOverview('2026');
    assert.strictEqual(overview.scopeDetail?.standingsLagging, true, '必须准确检出积分榜滞后');
    assert.strictEqual(overview.scopeDetail?.hasLatestRaceResult, true, '包含最新正赛赛果');
    assert.strictEqual(overview.isStale, true, '赛程领先积分榜必须标记 isStale: true');
    assert.strictEqual(overview.staleReason, 'STANDINGS_PENDING_ROUND_17');
  });

  await t.test('4. 场景C：比赛延迟或红旗，开赛超过 2.5 小时但未完赛（冲刺积分绝不脑补正赛结算）', () => {
    const driversR17 = [{ rank: 1, driverId: 'antonelli', officialRound: 17, snapshotSession: 'sprint' }];
    const constructorsR17 = [{ rank: 1, teamId: 'mercedes', officialRound: 17, snapshotSession: 'sprint' }];
    const calendarR17 = [{
      round: 17,
      nameZh: '新加坡大奖赛',
      isSprintWeekend: true,
      sessions: [
        { type: 'race', startTimeUTC: '2026-10-11T12:00:00Z' }
      ]
    }];
    const previousRaceOld = {
      round: 16,
      nameZh: '马来西亚站',
      winner: { code: 'NOR' }
    };

    const result = determineStandingsCutoff(
      driversR17,
      constructorsR17,
      calendarR17,
      previousRaceOld
    );

    // 绝对不能脑补为正赛已结算！
    assert.strictEqual(result.desc, '第 17 站 新加坡大奖赛 冲刺赛');
    assert.strictEqual(result.isSprintPending, true);
    assert.strictEqual(result.verified, true);
  });

  await t.test('5. 场景D：积分缺少官方轮次（禁止用 previousRace.round 代替并冒充已验证）', () => {
    const driversWithoutRound = [{ rank: 1, driverId: 'antonelli', officialRound: undefined }];
    const constructorsWithoutRound = [{ rank: 1, teamId: 'mercedes', officialRound: undefined }];
    const calendarR17 = [{ round: 17, nameZh: '新加坡大奖赛', isSprintWeekend: false }];
    const previousRaceR17 = { round: 17, nameZh: '新加坡大奖赛', winner: { code: 'VER' } };

    const result = determineStandingsCutoff(
      driversWithoutRound,
      constructorsWithoutRound,
      calendarR17,
      previousRaceR17
    );

    assert.strictEqual(result.desc, '截止场次待核实');
    assert.strictEqual(result.verified, false, '严禁拿 previousRace.round 代替积分榜缺失轮次');
    assert.strictEqual(result.reason, 'MISSING_OFFICIAL_ROUND');
  });

  await t.test('6. 场景E：车手与车队积分更新不同步（车手 R17，车队 R16）', () => {
    const driversR17 = [{ rank: 1, driverId: 'antonelli', officialRound: 17 }];
    const constructorsR16 = [{ rank: 1, teamId: 'mercedes', officialRound: 16 }];
    const calendarR17 = [{ round: 17, nameZh: '新加坡大奖赛', isSprintWeekend: false }];

    const result = determineStandingsCutoff(
      driversR17,
      constructorsR16,
      calendarR17
    );

    assert.strictEqual(result.verified, false, '车手车队不同步时不得标记为 verified: true');
    assert.strictEqual(result.reason, 'CONSTRUCTOR_ROUND_MISMATCH');
  });

  await t.test('7. 三维状态解耦：上游失败、缓存命中与最新数据独立汇报', async () => {
    const failCache = new MemoryCacheStore();
    const failLkg = new LastKnownGoodStore(failCache, '');
    const failService = new F1Service(failCache, failLkg);
    const faultSeason = '2099_fault_test';

    // 预置 LKG 快照
    await failLkg.save('driverStandings', [{ rank: 1, driverId: 'antonelli', officialRound: 17 }], 'jolpica', faultSeason);
    await failLkg.save('calendar', [{ round: 17, nameZh: '新加坡大奖赛', isSprintWeekend: false }], 'jolpica', faultSeason);

    // 请求 2099_fault_test，上游将 400/404 失败并优雅降级至预置的 LKG
    const overview = await failService.getOverview(faultSeason);

    // 1. 是否使用缓存/LKG
    assert.strictEqual(overview.dataSource, 'lkg');
    // 2. 上游同步状态：明确报告失败，绝不因读到了降级数据而隐瞒
    assert.strictEqual(overview.upstreamSyncSuccess, false);
    assert.strictEqual(overview.syncStatus?.upstreamSyncSuccess, false);
    assert.match(overview.syncStatus?.upstreamError || '', /^UPSTREAM_FAILED:/);
    // 3. 数据是否包含赛果独立报告
    assert.ok(typeof overview.hasLatestRaceResult === 'boolean' || overview.hasLatestRaceResult === 'unknown');
  });

  await t.test('8. 赛历覆盖年份与改期保护：2026 新加坡限定与后来官方改期保留', async () => {
    // 模拟 2025 年新加坡站，验证绝不受 2026 规则污染
    const cal2025 = [
      {
        season: '2025',
        round: 17,
        circuitId: 'marina_bay',
        sessions: [{ type: 'qualifying', startTimeUTC: '2025-09-20T13:00:00Z' }]
      }
    ];
    await memCache.set('f1:v3:calendar:2025', cal2025, 3600);
    const res2025 = await service.getCalendarResult('2025');
    assert.strictEqual(res2025.data[0].sessions[0].startTimeUTC, '2025-09-20T13:00:00Z', '2025 年绝不受 2026 规则覆盖');

    // 模拟 2026 年官方后来发布了更晚的有效改期 (2026-10-09)
    const cal2026OfficialRescheduled = [
      {
        season: '2026',
        round: 17,
        circuitId: 'marina_bay',
        officialVerifiedAt: '2026-10-09T10:00:00Z',
        sessions: [
          {
            type: 'qualifying',
            startTimeUTC: '2026-10-10T14:00:00Z',
            officialVerifiedAt: '2026-10-09T10:00:00Z'
          }
        ]
      }
    ];
    await memCache.set('f1:v3:calendar:2026_rescheduled', cal2026OfficialRescheduled, 3600);
    const res2026Rescheduled = await service.getCalendarResult('2026_rescheduled');
    assert.strictEqual(
      res2026Rescheduled.data[0].sessions[0].startTimeUTC,
      '2026-10-10T14:00:00Z',
      '官方后来的有效改期时间必须保留，旧规则不得强行压过！'
    );
  });

  await t.test('9. APEX REPLAY 真实性与 DEMO 仿真标识检查', () => {
    assert.strictEqual(DEFAULT_SINGAPORE_REPLAY.metadata.sourceProvider, 'curated_demo');
    assert.ok(
      DEFAULT_SINGAPORE_REPLAY.metadata.title.includes('DEMO'),
      '回放标题必须明确携带 DEMO 标识，杜绝以假乱真'
    );
  });

  // 用户指令 3-7 专项必通验收用例：
  await t.test('10. [指令3-1] 2026-10-11T01:00:00Z 采集的冲刺积分，随后第 17 站正赛结果发布，不能标成已验证的正赛积分', () => {
    const sprintStandings = [
      {
        rank: 1,
        driverId: 'antonelli',
        officialRound: 17,
        snapshotSession: 'sprint'
      }
    ];
    const constructorStandings = [
      {
        rank: 1,
        teamId: 'mercedes',
        officialRound: 17,
        snapshotSession: 'sprint'
      }
    ];
    const calendar = [{ round: 17, nameZh: '新加坡大奖赛', isSprintWeekend: true }];
    const previousRaceFinished = {
      round: 17,
      season: '2026',
      nameZh: '新加坡大奖赛',
      winner: { code: 'VER' }
    };

    // 即使采集时间较早（2026-10-11T01:00:00Z），随后正赛赛果发布：
    const result = determineStandingsCutoff(
      sprintStandings,
      constructorStandings,
      calendar,
      previousRaceFinished,
      '2026-10-11T01:00:00Z'
    );

    assert.notStrictEqual(result.desc, '第 17 站 新加坡大奖赛 正赛', '冲刺积分绝不能因为正赛结果已发布而误标成正赛积分');
    assert.strictEqual(result.desc, '第 17 站 新加坡大奖赛 冲刺赛');
    assert.strictEqual(result.isSprintPending, true);

    // 若无场次元数据证据，也绝不标成已验证正赛积分，必须待核实
    const rawStandings = [{ rank: 1, driverId: 'antonelli', officialRound: 17 }];
    const rawConstructors = [{ rank: 1, teamId: 'mercedes', officialRound: 17 }];
    const rawResult = determineStandingsCutoff(
      rawStandings,
      rawConstructors,
      calendar,
      previousRaceFinished,
      '2026-10-11T01:00:00Z'
    );
    assert.strictEqual(rawResult.desc, '截止场次待核实');
    assert.strictEqual(rawResult.verified, false);
  });

  await t.test('11. [指令3-2] 正赛结果接口不可用，但第 17 站积分存在，缺少场次证据不能直接标成已验证的冲刺积分', () => {
    const standingsWithoutSession = [{ rank: 1, driverId: 'antonelli', officialRound: 17 }];
    const constructorWithoutSession = [{ rank: 1, teamId: 'mercedes', officialRound: 17 }];
    const calendar = [{ round: 17, nameZh: '新加坡大奖赛', isSprintWeekend: true }];
    const previousRaceUnavailable = undefined;

    const result = determineStandingsCutoff(
      standingsWithoutSession,
      constructorWithoutSession,
      calendar,
      previousRaceUnavailable
    );

    // 没有取得正赛赛果，不等于正赛未结束，也不等于当前积分一定是冲刺积分！缺少场次证据时坚决返回“截止场次待核实”，verified=false
    assert.notStrictEqual(result.desc, '第 17 站 新加坡大奖赛 冲刺赛', '缺少场次证据时绝不能脑补断定为冲刺积分');
    assert.strictEqual(result.desc, '截止场次待核实');
    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.reason, 'SESSION_EVIDENCE_REQUIRED_FOR_SPRINT_WEEKEND');
  });

  await t.test('12. [指令4] 正赛结束后重新抓到同一份冲刺积分，也不能因为采集时间较晚而升级为正赛积分', () => {
    // 即使在正赛结束后很久重新抓取（例如 2026-10-12T10:00:00Z）
    const sprintStandingsLate = [
      {
        rank: 1,
        driverId: 'antonelli',
        officialRound: 17,
        snapshotSession: 'sprint'
      }
    ];
    const constructorStandingsLate = [
      {
        rank: 1,
        teamId: 'mercedes',
        officialRound: 17,
        snapshotSession: 'sprint'
      }
    ];
    const calendar = [{ round: 17, nameZh: '新加坡大奖赛', isSprintWeekend: true }];
    const previousRaceFinished = {
      round: 17,
      season: '2026',
      nameZh: '新加坡大奖赛',
      winner: { code: 'VER' }
    };
    const lateFetchedAt = '2026-10-12T10:00:00Z';

    const result = determineStandingsCutoff(
      sprintStandingsLate,
      constructorStandingsLate,
      calendar,
      previousRaceFinished,
      lateFetchedAt
    );

    assert.notStrictEqual(result.desc, '第 17 站 新加坡大奖赛 正赛', '绝不能因为抓取时间晚于正赛而误将冲刺积分升级为正赛积分');
    assert.strictEqual(result.desc, '第 17 站 新加坡大奖赛 冲刺赛');
    assert.strictEqual(result.isSprintPending, true);

    // 缺少场次元数据时，即使抓取时间很晚，也必须保持待核实
    const rawStandingsLate = [{ rank: 1, driverId: 'antonelli', officialRound: 17 }];
    const rawConstructorLate = [{ rank: 1, teamId: 'mercedes', officialRound: 17 }];
    const resultRaw = determineStandingsCutoff(
      rawStandingsLate,
      rawConstructorLate,
      calendar,
      previousRaceFinished,
      lateFetchedAt
    );
    assert.strictEqual(resultRaw.desc, '截止场次待核实');
    assert.strictEqual(resultRaw.verified, false);
  });

  await t.test('13. [指令5] 彻底删除所有伪造 fetchedAt 回退：旧缓存/无数据无采集时间时返回 undefined，绝不补造历史', async () => {
    const emptyCache = new MemoryCacheStore();
    const emptyLkg = new LastKnownGoodStore(emptyCache, '');
    const serviceEmpty = new F1Service(emptyCache, emptyLkg);

    // 预存无 fetchedAt 的裸数据快照（模拟旧版遗留快照）
    await emptyCache.set('f1:v3:calendar:2026', [{ round: 17, isSprintWeekend: false }], 3600);
    await emptyCache.set('f1:v3:standings:drivers:2026', [{ rank: 1, driverId: 'antonelli', officialRound: 17 }], 3600);
    await emptyCache.set('f1:v3:standings:constructors:2026', [{ rank: 1, officialRound: 17 }], 3600);
    await emptyCache.set('f1:v3:results:last:2026', { round: 17, winner: { code: 'VER' } }, 3600);

    const driversRes = await serviceEmpty.getDriverStandingsResult('2026');
    assert.strictEqual(driversRes.source, 'cache');
    assert.strictEqual(driversRes.fetchedAt, undefined, '旧缓存无采集时间时必须返回 undefined，严禁填入固定伪造时间或当前请求时间');

    // 验证 overview 中对应字段为 undefined
    const overview = await serviceEmpty.getOverview('2026');
    assert.strictEqual(overview.updatedAt, undefined, '无真实采集时间时 updatedAt 必须为 undefined');
    assert.strictEqual(overview.syncStatus?.lastSuccessfulSyncAt, undefined);
  });

  await t.test('14. [指令6] hasLatestRaceResult 严谨判定：必须精确匹配目标分站，无法确认返回 false 或 unknown', () => {
    const fixedNow = new Date('2026-10-12T00:00:00Z');
    const calendar = [
      {
        season: '2026',
        round: 16,
        raceStartUTC: '2026-09-27T12:00:00Z',
        isSprintWeekend: false,
        sessions: [{ id: 's1', name: 'Race', nameEn: 'Race', type: 'race', startTimeUTC: '2026-09-27T12:00:00Z', durationMinutes: 120 }]
      },
      {
        season: '2026',
        round: 17,
        raceStartUTC: '2026-10-11T12:00:00Z',
        isSprintWeekend: true,
        sessions: [{ id: 's2', name: 'Race', nameEn: 'Race', type: 'race', startTimeUTC: '2026-10-11T12:00:00Z', durationMinutes: 120 }]
      }
    ];

    // 情况 1：赛历上第 17 站应当完赛，但上游给出的 raceResult 仍是第 16 站
    const raceR16 = { season: '2026', round: 16, winner: { code: 'NOR', name: '诺里斯', team: '迈凯伦' } };
    assert.strictEqual(evaluateHasLatestRaceResult(calendar, raceR16, fixedNow), 'unknown', '赛果停留在旧分站时判定为 false');

    // 情况 2：赛果为第 17 站，精确对应目标赛事
    const raceR17 = { season: '2026', round: 17, winner: { code: 'VER', name: '维斯塔潘', team: '红牛' } };
    assert.strictEqual(evaluateHasLatestRaceResult(calendar, raceR17, fixedNow), true, '精确匹配最新完赛目标分站');

    // 情况 3：赛历缺失或无排期时间戳，无法确认
    assert.strictEqual(evaluateHasLatestRaceResult([], raceR17, fixedNow), 'unknown', '赛历缺失时无法确认返回 unknown');
    assert.strictEqual(evaluateHasLatestRaceResult([{ round: 17 }], raceR17, fixedNow), 'unknown', '无排期时间戳返回 unknown');

    // 情况 4：赛果无 winner
    assert.strictEqual(evaluateHasLatestRaceResult(calendar, { season: '2026', round: 17 }, fixedNow), 'unknown', '无 winner 判定为 false');
  });

  await t.test('15. [指令7] upstreamSyncSuccess 记录真实最近同步结果：持久化存储，纯缓存命中未请求时读取历史或返回未知', async () => {
    const memCache2 = new MemoryCacheStore();
    const memLkg2 = new LastKnownGoodStore(memCache2, '');
    const service2 = new F1Service(memCache2, memLkg2);

    // 预存缓存（命中缓存，不发起任何网络请求）
    await memCache2.set('f1:v3:calendar:2026', [{ round: 17 }], 3600);
    await memCache2.set('f1:v3:standings:drivers:2026', [{ rank: 1, officialRound: 17 }], 3600);
    await memCache2.set('f1:v3:standings:constructors:2026', [{ rank: 1, officialRound: 17 }], 3600);
    await memCache2.set('f1:v3:results:last:2026', { round: 17, winner: { code: 'VER' } }, 3600);

    // 此时尚未有任何持久化同步记录：纯缓存命中必须标为 undefined（未知），绝不直接倒推为 true
    const overviewInitial = await service2.getOverview('2026');
    assert.strictEqual(overviewInitial.upstreamSyncSuccess, undefined, '缓存命中且无历史同步记录时必须为 undefined (未知)');
    assert.strictEqual(overviewInitial.syncStatus?.upstreamSyncSuccess, undefined);

    // 当真实执行了一次上游同步尝试（例如成功记录）
    await service2.recordUpstreamAttempt(true);
    // 清除 overview 60s 内存缓存重新调用，验证从持久化记录读取真实状态
    await memCache2.delete('f1:v3:overview:2026');
    const overviewAfterSync = await service2.getOverview('2026');
    assert.strictEqual(overviewAfterSync.upstreamSyncSuccess, true, '缓存命中时应保留最近一次真实上游同步结果');
  });
});
