// tests/historical-center-and-real-replay.test.mjs
// 历史比赛中心、真实回放引擎、真实赛道匹配与更新状态自动化质量门禁测试套件

import test from 'node:test';
import assert from 'node:assert';
import { CircuitRegistry } from '../lib/circuits/registry.ts';
import { normalizeCircuitId } from '../lib/circuits/mapping.ts';
import { determineStandingsCutoff } from '../providers/f1/service.ts';
import {
  REAL_REPLAY_SESSIONS,
  DEMO_REPLAY_SESSIONS,
  interpolateVehiclesAtTimestamp
} from '../lib/f1/replay/real-sessions/index.ts';

test('Historical Center, Authentic Circuits & Real Replay Gate', async (t) => {
  await t.test('1. 赛道资产年代匹配与严格禁回退新加坡原则', () => {
    // 1.1 未知赛道必须返回 null，严禁隐式回退到 marina_bay
    assert.strictEqual(CircuitRegistry.getCircuit('non_existent_track'), null);
    assert.strictEqual(CircuitRegistry.getCircuit('fake_circuit'), null);
    assert.strictEqual(CircuitRegistry.getCircuit(''), null);

    // 1.2 现代银石在 2023/2026 赛季匹配成功
    const modernSilverstone = CircuitRegistry.getCircuit('silverstone', '2023');
    assert.ok(modernSilverstone !== null);
    assert.strictEqual(modernSilverstone.circuitId, 'silverstone');
    assert.strictEqual(modernSilverstone.layoutId, '2010-current');

    // 1.3 1950 年代无现代 Arena 构型，必须返回 null (由 UI 显示历史构型暂缺)，严禁拿 2010 构型冒充
    const histSilverstone = CircuitRegistry.getCircuit('silverstone', '1950');
    assert.strictEqual(histSilverstone, null, '1950 年 Silverstone 无现代构型，必须返回 null');

    // 1.4 2015 年墨尔本 (16 弯旧布局) 严禁使用 2022 年翻新后的 14 弯构型冒充
    const melbourne2015 = CircuitRegistry.getCircuit('albert_park', '2015');
    assert.strictEqual(melbourne2015, null, '2015 年 Albert Park 严禁使用 2022 构型，必须返回 null');
    assert.ok(CircuitRegistry.getCircuit('albert_park', '2026') !== null, '2026 Albert Park 正常匹配 2022 现代构型');

    // 1.5 2008 年巴塞罗那 (带减速弯) 严禁使用 2023 年移除减速弯的新布局冒充
    const catalunya2008 = CircuitRegistry.getCircuit('catalunya', '2008');
    assert.strictEqual(catalunya2008, null, '2008 年 Catalunya 严禁使用 2023 构型，必须返回 null');
    assert.ok(CircuitRegistry.getCircuit('catalunya', '2026') !== null, '2026 Catalunya 正常匹配 2023 现代构型');

    // 1.6 2015 年新加坡严禁使用 2023 移除浮动看台直角弯的新构型冒充
    assert.strictEqual(CircuitRegistry.getCircuit('marina_bay', '2015'), null);
    assert.ok(CircuitRegistry.getCircuit('marina_bay', '2026') !== null);

    // 1.7 2026 新增赛道 Madring，在 2026 有效，在 2020 无效
    assert.ok(CircuitRegistry.getCircuit('madring', '2026') !== null);
    assert.strictEqual(CircuitRegistry.getCircuit('madring', '2020'), null);

    // 1.8 验证别名映射均可正确归一化
    assert.strictEqual(normalizeCircuitId('bahrain'), 'bahrain');
    assert.strictEqual(normalizeCircuitId('sakhir'), 'bahrain');
    assert.strictEqual(normalizeCircuitId('sepang'), 'sepang');
    assert.strictEqual(normalizeCircuitId('shanghai'), 'shanghai');
  });

  await t.test('2. 历史赛季最终官方积分榜核验与数学推导验证', () => {
    // 2.1 1950 年已完结历史赛季：直接标记为权威最终官方积分榜，verified = true
    const res1950 = determineStandingsCutoff(
      [{ rank: 1, driverId: 'farina', points: 30, wins: 3, code: 'FAR', number: '1', name: 'Farina', nameEn: 'Farina', fullZh: 'Farina', team: 'Alfa Romeo', teamId: 'alfa', gap: 0 }],
      [], // 1950 年未设车队世界冠军
      [{ round: 7, season: '1950', name: 'Italian GP', nameZh: '意大利大奖赛', country: 'Italy', locality: 'Monza', circuitId: 'monza', circuitName: 'Monza', raceStartUTC: '1950-09-03T14:00:00Z', isSprintWeekend: false, sessions: [] }],
      undefined,
      undefined,
      '1950'
    );
    assert.strictEqual(res1950.verified, false);
    assert.strictEqual(res1950.desc, '历史积分统计范围待核实');
    assert.strictEqual(res1950.reason, 'HISTORICAL_SCOPE_UNVERIFIED');

    // 2.2 2008 年已完结历史赛季
    const res2008 = determineStandingsCutoff(
      [{ rank: 1, driverId: 'hamilton', points: 98, wins: 5, code: 'HAM', number: '22', name: 'Hamilton', nameEn: 'Hamilton', fullZh: 'Hamilton', team: 'McLaren', teamId: 'mclaren', gap: 0 }],
      [{ rank: 1, teamId: 'ferrari', name: 'Ferrari', nameEn: 'Ferrari', points: 172, wins: 8, gap: 0 }],
      [{ round: 18, season: '2008', name: 'Brazilian GP', nameZh: '巴西大奖赛', country: 'Brazil', locality: 'Sao Paulo', circuitId: 'interlagos', circuitName: 'Interlagos', raceStartUTC: '2008-11-02T17:00:00Z', isSprintWeekend: false, sessions: [] }],
      undefined,
      undefined,
      '2008'
    );
    assert.strictEqual(res2008.verified, false);
    assert.strictEqual(res2008.desc, '历史积分统计范围待核实');

    // 2.3 2023 年已完结历史赛季
    const res2023 = determineStandingsCutoff(
      [{ rank: 1, driverId: 'verstappen', points: 575, wins: 19, code: 'VER', number: '1', name: 'Verstappen', nameEn: 'Verstappen', fullZh: 'Verstappen', team: 'Red Bull', teamId: 'red_bull', gap: 0 }],
      [{ rank: 1, teamId: 'red_bull', name: 'Red Bull', nameEn: 'Red Bull', points: 860, wins: 21, gap: 0 }],
      [{ round: 22, season: '2023', name: 'Abu Dhabi GP', nameZh: '阿布扎比大奖赛', country: 'UAE', locality: 'Yas Marina', circuitId: 'yas_marina', circuitName: 'Yas Marina', raceStartUTC: '2023-11-26T13:00:00Z', isSprintWeekend: false, sessions: [] }],
      undefined,
      undefined,
      '2023'
    );
    assert.strictEqual(res2023.verified, false);
    assert.strictEqual(res2023.desc, '历史积分统计范围待核实');

    // 2.4 未来赛季 (如 2030 年)：严禁标记为已验证最终官方榜
    const res2030 = determineStandingsCutoff([], [], [], undefined, undefined, '2030');
    assert.strictEqual(res2030.verified, false);
    assert.strictEqual(res2030.desc, '2030 赛季尚未开赛');

    // 2.5 空数据拦截：未取得积分榜时严禁冒充已核实
    const resEmpty = determineStandingsCutoff([], [], [], undefined, undefined, '2008');
    assert.strictEqual(resEmpty.verified, false);
    assert.strictEqual(resEmpty.desc, '2008 赛季暂无积分数据');

    // 2.6 2026 进行中赛季：在缺少场次证据时坚决保持待核实
    const res2026SprintPending = determineStandingsCutoff(
      [{ rank: 1, driverId: 'antonelli', points: 340, wins: 8, code: 'ANT', number: '12', name: 'Antonelli', nameEn: 'Antonelli', fullZh: 'Antonelli', team: 'Mercedes', teamId: 'mercedes', gap: 0, officialRound: 17 }],
      [{ rank: 1, teamId: 'mercedes', name: 'Mercedes', nameEn: 'Mercedes', points: 578, wins: 11, gap: 0, officialRound: 17 }],
      [{ round: 17, season: '2026', name: 'Singapore GP', nameZh: '新加坡大奖赛', country: 'Singapore', locality: 'Singapore', circuitId: 'marina_bay', circuitName: 'Marina Bay', raceStartUTC: '2026-10-11T12:00:00Z', isSprintWeekend: true, sessions: [] }],
      undefined,
      undefined,
      '2026'
    );
    assert.strictEqual(res2026SprintPending.verified, false);
    assert.strictEqual(res2026SprintPending.desc, '截止场次待核实');

    // 2.7 冲刺周末数学推导核对：上一站 332 分，冲刺赛 8 分，当前 340 分，数学验证成功
    const resMathReconciled = determineStandingsCutoff(
      [{ rank: 1, driverId: 'antonelli', points: 340, wins: 8, code: 'ANT', number: '12', name: 'Antonelli', nameEn: 'Antonelli', fullZh: 'Antonelli', team: 'Mercedes', teamId: 'mercedes', gap: 0, officialRound: 17 }],
      [{ rank: 1, teamId: 'mercedes', name: 'Mercedes', nameEn: 'Mercedes', points: 578, wins: 11, gap: 0, officialRound: 17 }],
      [{ round: 17, season: '2026', name: 'Singapore GP', nameZh: '新加坡大奖赛', country: 'Singapore', locality: 'Singapore', circuitId: 'marina_bay', circuitName: 'Marina Bay', raceStartUTC: '2026-10-11T12:00:00Z', isSprintWeekend: true, sessions: [] }],
      undefined,
      undefined,
      '2026',
      { previousRoundDriverPoints: { antonelli: 332 } }
    );
    assert.strictEqual(resMathReconciled.verified, false);
    assert.strictEqual(resMathReconciled.isSprintPending, false);
    assert.equal(resMathReconciled.desc, '截止场次待核实');
  });

  await t.test('3. APEX REPLAY 仿真模式降级与真实列表隔离门禁', () => {
    // 3.1 此前由公式生成的巴林与银石必须已降级为 DEMO 模式，sourceProvider 严格为 curated_demo
    const demoBahrain = DEMO_REPLAY_SESSIONS['demo-bahrain'];
    assert.ok(demoBahrain, 'demo-bahrain 必须存在于 DEMO 集合中');
    assert.strictEqual(demoBahrain.metadata.sourceProvider, 'curated_demo');
    assert.strictEqual(demoBahrain.metadata.durationSeconds, 180);
    assert.strictEqual(demoBahrain.frames.length, 900);

    const demoSilverstone = DEMO_REPLAY_SESSIONS['demo-silverstone'];
    assert.ok(demoSilverstone, 'demo-silverstone 必须存在于 DEMO 集合中');
    assert.strictEqual(demoSilverstone.metadata.sourceProvider, 'curated_demo');

    const demoSingapore = DEMO_REPLAY_SESSIONS['demo-singapore'];
    assert.ok(demoSingapore, 'demo-singapore 必须存在于 DEMO 集合中');
    assert.strictEqual(demoSingapore.metadata.sourceProvider, 'curated_demo');

    // 3.2 严禁将公式生成的巴林与银石列在真实历史比赛列表中
    assert.strictEqual(REAL_REPLAY_SESSIONS['2023-bahrain'], undefined, '公式生成的巴林数据必须移出真实列表');
    assert.strictEqual(REAL_REPLAY_SESSIONS['2023-silverstone'], undefined, '公式生成的银石数据必须移出真实列表');
  });

  await t.test('4. 非均匀时间戳平滑插值与 >3 秒缺口拦截门禁 (Gap Protection)', () => {
    const demoBahrain = DEMO_REPLAY_SESSIONS['demo-bahrain'];

    // 4.1 在正常采样区间 (如 10.1 秒)，平滑插值正常工作
    const v1 = interpolateVehiclesAtTimestamp(demoBahrain.frames, 10100, 3000);
    assert.ok(v1.length >= 10);
    const ver = v1.find(c => c.code === 'VER');
    assert.ok(ver);
    assert.ok(ver.speed > 100 && ver.speed < 360, `速度合理: ${ver.speed}`);
    assert.ok(ver.normX >= 0 && ver.normX <= 1);
    assert.ok(ver.normY >= 0 && ver.normY <= 1);

    // 4.2 构造两个帧之间存在超过 3 秒 (>3000ms) 缺口测试
    const mockFrames = [
      {
        frameIndex: 0,
        timestampMs: 1000,
        lap: 1,
        vehicles: [{ driverNumber: 1, code: 'VER', name: 'Max', team: 'RB', teamColor: '#00f', normX: 0.1, normY: 0.2, speed: 200, gear: 5, drs: false, lap: 1, position: 1 }]
      },
      {
        frameIndex: 1,
        timestampMs: 5000, // 时间跨度 4000ms > 3000ms (存在 4 秒缺口)
        lap: 1,
        vehicles: [{ driverNumber: 1, code: 'VER', name: 'Max', team: 'RB', teamColor: '#00f', normX: 0.8, normY: 0.9, speed: 300, gear: 8, drs: true, lap: 1, position: 1 }]
      }
    ];

    // 在 3000ms 时请求，由于跨度大于 3 秒，插值器必须拒绝跨缺口插值，保持前一帧位置
    const gappedVehicles = interpolateVehiclesAtTimestamp(mockFrames, 3000, 3000);
    assert.strictEqual(gappedVehicles[0].normX, 0.1, '超过 3 秒缺口必须拒绝插值，保持前一帧 normX');
    assert.strictEqual(gappedVehicles[0].normY, 0.2, '超过 3 秒缺口必须拒绝插值，保持前一帧 normY');
    assert.strictEqual(gappedVehicles[0].speed, 200, '保持前一帧 speed');
  });
});
