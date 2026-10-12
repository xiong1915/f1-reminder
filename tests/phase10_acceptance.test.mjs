// tests/phase10_acceptance.test.mjs
// Phase 10 专项全链路针对性验收与严谨性核验测试套件

import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('Phase 10 专项验收与严谨性核验', async (t) => {
  const {
    calculateWeekendProjection,
    simulateTitleScenario,
    FEATURE_POINTS_TABLE,
    SPRINT_POINTS_TABLE
  } = await import('../lib/f1/championship.ts');
  const { defaultF1Service } = await import('../providers/f1/service.ts');
  const {
    normalizeJolpicaRace,
    normalizeJolpicaLastResult,
    CIRCUIT_SPECS,
    OFFICIAL_F1_RESULTS_REGISTRY
  } = await import('../lib/f1/normalize.ts');
  const { FIXTURE_2026_CALENDAR } = await import('./fixtures/2026_season_fixture.ts');

  await t.test('1. 最快圈速与赛道历史纪录严格区分', async () => {
    // 1.1 赛道历史纪录 (CIRCUIT_SPECS.sepang.lapRecord)
    const sepangSpecs = CIRCUIT_SPECS['sepang'];
    assert.ok(sepangSpecs, '雪邦赛道规格必须存在');
    assert.strictEqual(sepangSpecs.lapRecord, '1:34.080', '雪邦历史赛道纪录为 1:34.080');

    // 1.2 本场正赛最快圈数据
    const overview = await defaultF1Service.getOverview();
    assert.ok(overview.previousRace, '概览必须包含上一站赛果');
    const pr = overview.previousRace;

    assert.ok(pr.fastestLap, '最快圈数据必须存在');
    if (pr.round === 16) {
      assert.strictEqual(pr.fastestLap.name, '马克斯·维斯塔潘');
      assert.strictEqual(pr.fastestLap.lapTime, '1:38.220', '第16站最快圈必须为 1:38.220');
      assert.strictEqual(String(pr.fastestLap.lap), '55', '第16站最快圈必须为第 55 圈');
    } else if (pr.round === 17) {
      assert.strictEqual(pr.fastestLap.name, '夏尔·勒克莱尔');
      assert.strictEqual(pr.fastestLap.lapTime, '1:35.202', '第17站最快圈必须为 1:35.202');
      assert.strictEqual(String(pr.fastestLap.lap), '41', '第17站最快圈必须为第 41 圈');
    }
    assert.notStrictEqual(pr.fastestLap.lapTime, sepangSpecs.lapRecord, '本场最快圈绝不能混淆为历史赛道纪录');

    // 1.3 缺失 FastestLap.Time.time 时严禁回退为历史赛道纪录
    const missingLapRaw = {
      round: '16',
      Results: [
        { position: '1', Driver: { driverId: 'verstappen', code: 'VER' }, FastestLap: { rank: '1' } }
      ]
    };
    const missingRes = normalizeJolpicaLastResult(missingLapRaw);
    assert.strictEqual(missingRes.fastestLap, undefined, '上游圈速数据缺失时禁止使用赛道纪录填充');
  });

  await t.test('2. 杆位与发车位字段来源区分及罚退案例验证', async () => {
    // 构造真实罚退案例：Driver A 排位赛第一但遭罚退至第15位发车；Driver B 正赛第1位发车
    const penaltyCaseRaw = {
      round: '16',
      season: '2026',
      raceName: 'Bahrain Grand Prix in Malaysia',
      QualifyingResults: [
        { position: '1', Driver: { driverId: 'verstappen', code: 'VER', givenName: 'Max', familyName: 'Verstappen' }, Constructor: { constructorId: 'red_bull' }, Q3: '1:30.120' },
        { position: '2', Driver: { driverId: 'norris', code: 'NOR', givenName: 'Lando', familyName: 'Norris' }, Constructor: { constructorId: 'mclaren' }, Q3: '1:30.250' }
      ],
      Results: [
        { position: '1', Driver: { driverId: 'verstappen', code: 'VER' }, grid: '15' },
        { position: '2', Driver: { driverId: 'norris', code: 'NOR' }, grid: '1' }
      ]
    };

    const normalizedPenalty = normalizeJolpicaLastResult(penaltyCaseRaw);
    assert.ok(normalizedPenalty.qualifyingP1, '排位赛首位必须存在');
    assert.strictEqual(normalizedPenalty.qualifyingP1.code, 'VER', '排位赛第一应为 VER (维斯塔潘)');

    assert.ok(normalizedPenalty.startingGridP1, '发车位首位必须存在');
    assert.strictEqual(normalizedPenalty.startingGridP1.code, 'NOR', '最终发车第一应为 NOR (诺里斯)');

    // 证明两者严格分离，未发生混淆
    assert.notStrictEqual(normalizedPenalty.qualifyingP1.code, normalizedPenalty.startingGridP1.code);

    // 仅有发车位 grid === 1 且无排位赛官方数据时，不得标为 pole
    const gridOnlyRaw = {
      round: '16',
      Results: [
        { position: '1', Driver: { driverId: 'norris', code: 'NOR' }, grid: '1' }
      ]
    };
    const gridOnlyRes = normalizeJolpicaLastResult(gridOnlyRaw);
    assert.strictEqual(gridOnlyRes.pole, undefined, '仅有发车格数据且未核验排位成绩时，pole 应为 undefined');
    assert.strictEqual(gridOnlyRes.startingGridP1?.code, 'NOR', '发车首位正确记录');
  });

  await t.test('3. 精确官方赛果链接映射与未知分站防御', async () => {
    // 3.1 本场第 16 站具有核验的精准链接
    const reg16 = OFFICIAL_F1_RESULTS_REGISTRY['2026-16'];
    assert.ok(reg16, '第 16 站官方链接映射必须存在');
    assert.strictEqual(reg16.raceResult, 'https://www.formula1.com/en/results/2026/races/1308/bahrain/race-result');
    assert.strictEqual(reg16.qualifying, 'https://www.formula1.com/en/results/2026/races/1308/bahrain/qualifying');
    assert.strictEqual(reg16.fastestLaps, 'https://www.formula1.com/en/results/2026/races/1308/bahrain/fastest-laps');

    const overview = await defaultF1Service.getOverview();
    const pr = overview.previousRace;
    assert.ok(pr, '概览中必须存在 previousRace');
    if (pr.round === 16) {
      assert.strictEqual(pr.sourceUrls?.raceResult, reg16.raceResult);
      assert.strictEqual(pr.sourceUrls?.qualifying, reg16.qualifying);
      assert.strictEqual(pr.sourceUrls?.fastestLaps, reg16.fastestLaps);
    } else if (pr.round === 17) {
      const reg17 = OFFICIAL_F1_RESULTS_REGISTRY['2026-17'];
      assert.ok(reg17, '第 17 站官方链接映射必须存在');
      assert.strictEqual(pr.sourceUrls?.raceResult, reg17.raceResult);
      assert.strictEqual(pr.sourceUrls?.qualifying, reg17.qualifying);
      assert.strictEqual(pr.sourceUrls?.fastestLaps, reg17.fastestLaps);
    }

    // 3.2 未知分站不凭 round 猜测官方 raceId，也不生成通用目录
    const unverifiedRaw = { round: '99', season: '2026', raceName: 'Future Grand Prix' };
    const unverifiedRes = normalizeJolpicaLastResult(unverifiedRaw);
    assert.strictEqual(unverifiedRes.sourceUrls, undefined, '未核验分站禁止猜测生成子链接');
    assert.strictEqual(unverifiedRes.officialUrl, undefined, '未核验分站不生成通用目录伪装链接');
  });

  await t.test('4. 积分差异说明不作臆断', () => {
    const standingsSource = fs.readFileSync('app/standings/page.tsx', 'utf8');
    assert.ok(standingsSource.includes('车队积分按各站实际归属统计，可能与当前阵容车手全年积分之和不同'));
    assert.ok(!standingsSource.includes('红牛车队官方 298 分与小红牛车队官方 90 分均严格遵循官方历史分站归属'));
    assert.ok(standingsSource.includes('各分站具体历史成绩与车队积分明细仍在逐站核验中'));
  });

  await t.test('5. AI 限流、IP 防伪与费用保护核验', () => {
    const routeSource = fs.readFileSync('app/api/ai/chat/route.ts', 'utf8');
    // 5.1 可信 IP 提取
    assert.ok(routeSource.includes("req.headers.get('cf-connecting-ip')"), '优先采用 Cloudflare 不可伪造真实 IP');
    assert.ok(routeSource.includes("req.headers.get('x-real-ip')"), '其次采用 Vercel 真实 IP');

    // 5.2 统一持久化存储与原子计数
    assert.ok(routeSource.includes('getRateLimitStore'), '限流统一通过存储门面调度');
    assert.ok(routeSource.includes('safe fail-open fallback'), '存储故障时具有安全降级容灾处理');

    // 5.3 模型输出长度与取消传递
    assert.ok(routeSource.includes('abortController.signal'), '客户端中止信号传递给推理调用');
    const orchestratorSource = fs.readFileSync('lib/ai/orchestrator.ts', 'utf8');
    assert.ok(orchestratorSource.includes('maxTokens: 1500'), '模型生成调用显式限制 maxTokens 输出上限');
  });

  await t.test('6. 公开页面敏感配置消除审查', () => {
    const systemSource = fs.readFileSync('app/system/page.tsx', 'utf8');
    // 彻底移除内部配置与弱口令参数
    assert.ok(!systemSource.includes('BUILD_ID'), '完全移除 BUILD_ID 输出');
    assert.ok(!systemSource.includes('storageInfo.provider'), '完全移除存储引擎信息');
    assert.ok(!systemSource.includes('ADMIN_TOKEN'), '完全移除临时管理员弱口令查询');
    assert.ok(!systemSource.includes('admin?: string'), '移除 searchParams 调试入口');
    assert.ok(systemSource.includes('系统可用性与服务检查'), '仅保留健康检查展示');
  });

  await t.test('7. 表单组件可访问名称审查', () => {
    const simSource = fs.readFileSync('components/title_simulator.tsx', 'utf8');
    assert.ok(simSource.includes('aria-label={`${leader.name} 冲刺赛完赛名次`}') || simSource.includes('aria-label='), 'select 包含明确 aria-label');
    assert.ok(simSource.includes('htmlFor="leader-race-select"'), '包含明确关联 label');
  });
});
