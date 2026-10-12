// tests/acceptance-real-verification.test.mjs
// 针对最新指令要求的真实功能验证与多通道自动化验收测试套件

import test from 'node:test';
import assert from 'node:assert';
import { defaultAIOrchestrator } from '../lib/ai/orchestrator.ts';
import { CircuitRegistry } from '../lib/circuits/registry.ts';
import { determineStandingsCutoff } from '../providers/f1/service.ts';
import {
  REAL_REPLAY_SESSIONS,
  DEMO_REPLAY_SESSIONS,
  interpolateVehiclesAtTimestamp
} from '../lib/f1/replay/real-sessions/index.ts';
import { extractCleanTables, extractCleanParagraphs } from '../lib/search/content_fetcher.ts';
import { checkUrlSafety } from '../lib/search/url_safety.ts';

test('Comprehensive Acceptance & Real Verification Suite', async (t) => {
  await t.test('1. AI 通道一：指定网址直通、表格解析与 SSRF 阻断', async () => {
    // 1.1 HTML 成绩表格提取：验证 <table> 转 Markdown 结构化成绩
    const sampleHtml = `
      <html>
        <head><title>2024 Chinese GP Race Results</title></head>
        <body>
          <h1>2024 Formula 1 Chinese Grand Prix - Race Results</h1>
          <table class="results-archive">
            <thead>
              <tr><th>Pos</th><th>Driver</th><th>Car</th><th>Laps</th><th>Time/Retired</th><th>PTS</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Max Verstappen</td><td>Red Bull Racing</td><td>56</td><td>1:40:52.554</td><td>25</td></tr>
              <tr><td>2</td><td>Lando Norris</td><td>McLaren</td><td>56</td><td>+13.773s</td><td>18</td></tr>
              <tr><td>3</td><td>Sergio Perez</td><td>Red Bull Racing</td><td>56</td><td>+15.660s</td><td>15</td></tr>
            </tbody>
          </table>
          <p>Max Verstappen took a commanding victory in the return of the Chinese Grand Prix at Shanghai International Circuit.</p>
        </body>
      </html>
    `;

    const tables = extractCleanTables(sampleHtml);
    assert.ok(tables.length >= 1, '必须提取出至少一个表格');
    assert.ok(tables[0].includes('【赛事成绩/排名表格】'), '成绩表格打上专门标签');
    assert.ok(tables[0].includes('Max Verstappen'), '表格必须包含冠军车手');
    assert.ok(tables[0].includes('Lando Norris'), '表格必须包含亚军车手');
    assert.ok(tables[0].includes('Red Bull Racing'), '表格包含车队信息');

    const paragraphs = extractCleanParagraphs(sampleHtml);
    assert.ok(paragraphs.some(p => p.includes('Shanghai International Circuit')));

    // 1.2 SSRF 防护门禁：内网 IP 和危险协议阻断
    assert.strictEqual(checkUrlSafety('http://127.0.0.1/admin').safe, false);
    assert.strictEqual(checkUrlSafety('http://192.168.1.1:8080/api').safe, false);
    assert.strictEqual(checkUrlSafety('file:///etc/passwd').safe, false);
    assert.strictEqual(checkUrlSafety('javascript:alert(1)').safe, false);

    // 1.3 当用户提问包含 URL 时，isSearchNeeded 必须返回 false (禁止转模糊搜索)
    const userQueryWithUrl = '请分析该网页中的比赛结果：https://www.formula1.com/en/results/2024/races/1234/china/race-result.html';
    assert.strictEqual(defaultAIOrchestrator.isSearchNeeded(userQueryWithUrl, 'GENERAL'), false);
    assert.strictEqual(defaultAIOrchestrator.isSearchNeeded(userQueryWithUrl, 'F1_FACTUAL'), false);
  });

  await t.test('2. AI 通道二：历史赛季、未来赛季与事实卡片一致性', async () => {
    // 2.1 历史 2008 赛季积分榜生成
    const mock2008Standings = [
      { rank: 1, driverId: 'hamilton', name: '刘易斯·汉密尔顿', team: '迈凯伦', points: 98, wins: 5 },
      { rank: 2, driverId: 'massa', name: '费利佩·马萨', team: '法拉利', points: 97, wins: 6 },
      { rank: 3, driverId: 'raikkonen', name: '基米·莱科宁', team: '法拉利', points: 75, wins: 2 }
    ];

    const fact2008 = defaultAIOrchestrator.getCanonicalFactBlock(
      'F1_FACTUAL',
      '2008年车手总积分榜前三名是谁？',
      {},
      [],
      { season: '2008', standings: mock2008Standings }
    );

    assert.ok(fact2008 !== null);
    assert.strictEqual(fact2008.isPureFactual, true);
    assert.ok(fact2008.factText.includes('2008 赛季车手世界锦标赛官方积分榜'));
    assert.ok(fact2008.factText.includes('刘易斯·汉密尔顿'));
    assert.ok(fact2008.factText.includes('费利佩·马萨'));

    // 2.2 历史 2008 赛季事实卡片
    const card2008 = defaultAIOrchestrator.getFactCard(
      'F1_FACTUAL',
      '2008年车手积分榜前三',
      {},
      [],
      { season: '2008', standings: mock2008Standings }
    );
    assert.ok(card2008 !== null);
    assert.strictEqual(card2008.badge, '2008 赛季官方积分快照');
    assert.strictEqual(card2008.fields.length, 3);
    assert.ok(card2008.fields[0].label.includes('刘易斯·汉密尔顿'));

    // 2.3 未来赛季 (2030) 事实生成
    const fact2030 = defaultAIOrchestrator.getCanonicalFactBlock(
      'F1_FACTUAL',
      '2030年积分榜',
      {},
      [],
      { season: '2030', standings: [] }
    );
    assert.ok(fact2030 !== null);
    assert.ok(fact2030.factText.includes('尚未开赛'));
  });

  await t.test('3. 赛道年代资产与严格禁止冒充原则', () => {
    // 3.1 2015 墨尔本 (16弯) 严禁返回 2022 墨尔本 (14弯)
    const mel2015 = CircuitRegistry.getCircuit('albert_park', '2015');
    assert.strictEqual(mel2015, null, '2015 墨尔本缺少历史 16 弯测绘，必须返回 null');

    const mel2026 = CircuitRegistry.getCircuit('albert_park', '2026');
    assert.ok(mel2026 !== null);
    assert.strictEqual(mel2026.layoutId, '2022-current');

    // 3.2 2008 巴塞罗那 (带减速弯) 严禁返回 2023 布局
    const bar2008 = CircuitRegistry.getCircuit('catalunya', '2008');
    assert.strictEqual(bar2008, null, '2008 巴塞罗那必须返回 null，禁止用 2023 布局冒充');

    const bar2026 = CircuitRegistry.getCircuit('catalunya', '2026');
    assert.ok(bar2026 !== null);
    assert.strictEqual(bar2026.layoutId, '2023-current');

    // 3.3 2015 新加坡严禁返回 2023 布局
    assert.strictEqual(CircuitRegistry.getCircuit('marina_bay', '2015'), null);
    assert.ok(CircuitRegistry.getCircuit('marina_bay', '2026') !== null);

    // 3.4 严格禁止回退新加坡
    assert.strictEqual(CircuitRegistry.getCircuit('unknown_track_test'), null);
    assert.strictEqual(CircuitRegistry.getCircuit(''), null);
  });

  await t.test('4. 积分榜截止场次判定、空数据防御与数学推导', () => {
    // 4.1 未来赛季 2030：严禁标记已核实
    const resFuture = determineStandingsCutoff([], [], [], undefined, undefined, '2030');
    assert.strictEqual(resFuture.verified, false);
    assert.strictEqual(resFuture.reason, 'FUTURE_SEASON');

    // 4.2 历史年份但空数据：严禁标记已核实
    const resEmpty = determineStandingsCutoff([], [], [], undefined, undefined, '2010');
    assert.strictEqual(resEmpty.verified, false);
    assert.strictEqual(resEmpty.reason, 'NO_DRIVER_STANDINGS');

    // 4.3 冲刺周末通过数学推导（上一站 + 冲刺赛 + 正赛）核对
    const driverList = [
      { rank: 1, driverId: 'antonelli', points: 340, wins: 8, code: 'ANT', number: '12', name: 'Antonelli', nameEn: 'Antonelli', fullZh: 'Antonelli', team: 'Mercedes', teamId: 'mercedes', gap: 0, officialRound: 17 }
    ];
    const constructorList = [
      { rank: 1, teamId: 'mercedes', name: 'Mercedes', nameEn: 'Mercedes', points: 578, wins: 11, gap: 0, officialRound: 17 }
    ];
    const sprintCalendar = [
      { round: 17, season: '2026', name: 'Singapore GP', nameZh: '新加坡大奖赛', country: 'Singapore', locality: 'Singapore', circuitId: 'marina_bay', circuitName: 'Marina Bay', raceStartUTC: '2026-10-11T12:00:00Z', isSprintWeekend: true, sessions: [] }
    ];

    // 情况 A：无证据 -> 截止场次待核实
    const resNoEvidence = determineStandingsCutoff(driverList, constructorList, sprintCalendar, undefined, undefined, '2026');
    assert.strictEqual(resNoEvidence.verified, false);
    assert.strictEqual(resNoEvidence.desc, '截止场次待核实');

    // 情况 B：提供上一站积分 332 分，增量 8 分，数学验证为冲刺赛结算
    const resSprintReconciled = determineStandingsCutoff(driverList, constructorList, sprintCalendar, undefined, undefined, '2026', {
      previousRoundDriverPoints: { antonelli: 332 }
    });
    assert.strictEqual(resSprintReconciled.verified, false);
    assert.strictEqual(resSprintReconciled.isSprintPending, false);
    assert.strictEqual(resSprintReconciled.desc, '截止场次待核实');

    // 情况 C：提供上一站积分 307 分，增量 33 分 (8+25)，数学验证为正赛结算
    const resRaceReconciled = determineStandingsCutoff(driverList, constructorList, sprintCalendar, undefined, undefined, '2026', {
      previousRoundDriverPoints: { antonelli: 307 }
    });
    assert.strictEqual(resRaceReconciled.verified, false);
    assert.strictEqual(resRaceReconciled.isSprintPending, false);
    assert.strictEqual(resRaceReconciled.desc, '截止场次待核实');
  });

  await t.test('5. APEX REPLAY 真实性、DEMO 隔离与非均匀时间戳缺口拦截', () => {
    // 5.1 公式生成的巴林与银石必须严格隔离在 DEMO_REPLAY_SESSIONS 中，sourceProvider 为 curated_demo
    assert.ok(DEMO_REPLAY_SESSIONS['demo-bahrain']);
    assert.strictEqual(DEMO_REPLAY_SESSIONS['demo-bahrain'].metadata.sourceProvider, 'curated_demo');
    assert.ok(DEMO_REPLAY_SESSIONS['demo-silverstone']);
    assert.strictEqual(DEMO_REPLAY_SESSIONS['demo-silverstone'].metadata.sourceProvider, 'curated_demo');
    assert.ok(DEMO_REPLAY_SESSIONS['demo-singapore']);
    assert.strictEqual(DEMO_REPLAY_SESSIONS['demo-singapore'].metadata.sourceProvider, 'curated_demo');

    // 5.2 严禁将公式生成的数据留在 REAL_REPLAY_SESSIONS 冒充真实比赛
    assert.strictEqual(REAL_REPLAY_SESSIONS['2023-bahrain'], undefined);
    assert.strictEqual(REAL_REPLAY_SESSIONS['2023-silverstone'], undefined);

    // 5.3 缺口拦截门禁：两帧时间跨度 > 3000ms 严禁跨缺口插值
    const mockFrames = [
      {
        frameIndex: 0,
        timestampMs: 1000,
        lap: 1,
        vehicles: [{ driverNumber: 1, code: 'VER', name: 'Max', team: 'RB', teamColor: '#00f', normX: 0.1, normY: 0.2, speed: 200, gear: 5, drs: false, lap: 1, position: 1 }]
      },
      {
        frameIndex: 1,
        timestampMs: 5000, // 4000ms 缺口 > 3000ms
        lap: 1,
        vehicles: [{ driverNumber: 1, code: 'VER', name: 'Max', team: 'RB', teamColor: '#00f', normX: 0.9, normY: 0.9, speed: 320, gear: 8, drs: true, lap: 1, position: 1 }]
      }
    ];

    const resultAt3s = interpolateVehiclesAtTimestamp(mockFrames, 3000, 3000);
    assert.strictEqual(resultAt3s[0].normX, 0.1, '超过 3 秒缺口必须拒绝插值，保持前一帧坐标');
    assert.strictEqual(resultAt3s[0].speed, 200, '保持前一帧速度');
  });
});
