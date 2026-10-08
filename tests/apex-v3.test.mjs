// tests/apex-v3.test.mjs
// TIKE V3 核心架构单元与集成测试套件 (包含 Phase 2 生产加固专项验证)

import test from 'node:test';
import assert from 'node:assert';

test('TIKE V3 核心系统架构验证', async (t) => {
  const {
    calculateUtcDelta,
    getBeijingTime,
    formatBeijingDisplay,
    formatDate,
    formatTime,
    formatDateTime,
    formatRaceRange
  } = await import('../lib/f1/time.ts');
  const { simulateTitleScenario } = await import('../lib/f1/championship.ts');
  const { defaultF1Service } = await import('../providers/f1/service.ts');
  const { defaultRegistry } = await import('../lib/ai/registry.ts');
  const { AIService } = await import('../lib/ai/service.ts');
  const { defaultAIOrchestrator } = await import('../lib/ai/orchestrator.ts');
  const { executeTool, AI_WHITELIST_TOOLS } = await import('../lib/ai/tools.ts');
  const {
    MemoryCacheStore,
    MemoryIdempotencyStore,
    MemoryRateLimitStore,
    defaultSessionStore
  } = await import('../lib/storage/index.ts');
  const { LastKnownGoodStore } = await import('../lib/storage/lkg.ts');
  const { handleFeishuPayload } = await import('../lib/feishu/handler.ts');
  const { buildResponseCard } = await import('../lib/feishu/cards.ts');
  const { FIXTURE_2026_CALENDAR, FIXTURE_2026_DRIVERS } = await import('./fixtures/2026_season_fixture.ts');

  await t.test('1. 统一日期与时间系统 (杜绝月月/日日重复及格式漂移)', () => {
    const testDate = new Date('2026-10-09T12:00:00Z'); // 北京时间 20:00
    const endTestDate = new Date('2026-10-11T12:00:00Z');

    const dStr = formatDate(testDate);
    assert.strictEqual(dStr, '2026年10月09日');
    assert.ok(!dStr.includes('月月') && !dStr.includes('日日'), '严禁出现重复字符');

    const tStr = formatTime(testDate);
    assert.strictEqual(tStr, '20:00');

    const dtStr = formatDateTime(testDate);
    assert.strictEqual(dtStr, '2026年10月09日 20:00');

    const rangeStr = formatRaceRange(testDate, endTestDate);
    assert.strictEqual(rangeStr, '10月09日 - 11日');

    const displayStr = formatBeijingDisplay(testDate);
    assert.ok(displayStr.includes('10月09日') && displayStr.includes('20:00'));
    assert.ok(!displayStr.includes('月月'));

    const targetMs = Date.now() + 2 * 86400000 + 3 * 3600000 + 15 * 60000 + 42000;
    const delta = calculateUtcDelta(targetMs, Date.now());
    assert.strictEqual(delta.days, '02');
    assert.strictEqual(delta.hours, '03');
    assert.strictEqual(delta.mins, '15');
    assert.strictEqual(delta.secs, '42');
    assert.strictEqual(delta.isPast, false);
  });

  await t.test('2. 争冠数学推演确定性计算', () => {
    const sim = simulateTitleScenario({
      leader: { name: 'Kimi Antonelli', code: 'ANT', points: 320 },
      challenger: { name: 'George Russell', code: 'RUS', points: 236 },
      leaderSprint: 1,
      leaderRace: 1,
      challengerSprint: 2,
      challengerRace: 2
    });

    assert.strictEqual(sim.leader.projectedPts, 353);
    assert.strictEqual(sim.challenger.projectedPts, 261);
    assert.strictEqual(sim.newGap, 92);
    assert.ok(sim.narrative.includes('领先优势将扩大至 92 分'));
  });

  await t.test('3. Last Known Good (LKG) 权威快照与 Freshness Policy', async () => {
    const memCache = new MemoryCacheStore();
    const lkg = new LastKnownGoodStore(memCache);

    const testDomain = 'test_isolated_domain_' + Date.now();
    // 1. 无快照状态 (测试独立未持久化领域)
    const initRes = await lkg.get(testDomain, 3600000, '2026');
    assert.strictEqual(initRes.available, false);
    assert.strictEqual(initRes.data, null);
    assert.strictEqual(initRes.staleReason, 'NO_LKG_SNAPSHOT');

    // 2. 存入真实清洗快照
    await lkg.save(testDomain, [{ round: 17, name: 'Singapore Grand Prix' }], 'jolpica', '2026');

    // 3. 读取新鲜快照
    const freshRes = await lkg.get(testDomain, 3600000, '2026');
    assert.strictEqual(freshRes.available, true);
    assert.strictEqual(freshRes.isStale, false);
    assert.strictEqual(freshRes.data?.[0]?.name, 'Singapore Grand Prix');

    // 4. 模拟超期陈旧快照
    const staleRes = await lkg.get(testDomain, 0, '2026'); // maxAge 0ms 必定陈旧
    assert.strictEqual(staleRes.available, true);
    assert.strictEqual(staleRes.isStale, true);
    assert.ok(staleRes.staleReason?.startsWith('DATA_AGED_'));
  });

  await t.test('4. 统一持久化存储与幂等原子语义', async () => {
    const idemp = new MemoryIdempotencyStore();
    const key = 'event_msg_order_9988';

    // 首次处理，成功加锁
    const firstCheck = await idemp.checkAndMarkHandled(key, 600);
    assert.strictEqual(firstCheck, false, '首次处理应返回 false (加锁成功)');

    // 重复触发，拦截幂等
    const secondCheck = await idemp.checkAndMarkHandled(key, 600);
    assert.strictEqual(secondCheck, true, '重复调用应返回 true (已处理并拦截)');

    // 限流器滑动窗口
    const limiter = new MemoryRateLimitStore();
    const limitKey = 'ip_user_limit_1';
    const r1 = await limiter.checkRateLimit(limitKey, 2, 60);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.remaining, 1);

    const r2 = await limiter.checkRateLimit(limitKey, 2, 60);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r2.remaining, 0);

    const r3 = await limiter.checkRateLimit(limitKey, 2, 60);
    assert.strictEqual(r3.allowed, false, '超出限额应拒绝');
  });

  await t.test('5. F1Service 数据门面与 LKG 容灾降级', async () => {
    const overview = await defaultF1Service.getOverview();
    assert.ok(overview, '概览数据必须有效生成');
    assert.strictEqual(overview.season, '2026');
    assert.ok(overview.totalRounds !== undefined, '动态总场次必须存在');
    assert.ok(['live', 'cache', 'lkg', 'unavailable'].includes(overview.dataSource));
  });

  await t.test('6. AI Provider 注册表与白名单扩展 Tools', async () => {
    const providers = defaultRegistry.list();
    assert.ok(providers.length >= 3, '至少注册 DeepSeek, OpenAI-Compatible 与 Custom');

    assert.ok(AI_WHITELIST_TOOLS.length >= 6, '白名单 Tools 至少包含 6 种受控工具');
    const toolNames = AI_WHITELIST_TOOLS.map(t => t.name);
    assert.ok(toolNames.includes('get_next_race'));
    assert.ok(toolNames.includes('get_race_calendar'));
    assert.ok(toolNames.includes('explain_f1_regulation'));
    assert.ok(toolNames.includes('simulate_title_scenario'));

    // 测试规则解释 Tool
    const regRes = await executeTool('explain_f1_regulation', { topic: 'points' });
    assert.ok(regRes.explanation.includes('25, 18, 15'));
  });

  await t.test('7. 飞书 Webhook URL 握手与卡片响应', async () => {
    const res = await handleFeishuPayload({
      type: 'url_verification',
      challenge: 'tike_test_challenge_xyz'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.challenge, 'tike_test_challenge_xyz');

    const card = buildResponseCard({
      replyText: '测试回复内容',
      isF1: true,
      sources: [{ name: 'Jolpica API' }]
    });
    assert.ok(card.header.title.content.includes('TIKE F1'));
    assert.strictEqual(card.elements.length, 2);
  });
});
