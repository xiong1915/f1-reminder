// tests/apex-architecture.test.js
// TIKE F1 新架构体系全面集成与端点验证测试套件

const test = require('node:test');
const assert = require('node:assert');

test('TIKE F1 模块化系统与数据层回归验证', async (t) => {
  const workerMod = await import('../cf_worker.legacy.js');
  const worker = workerMod.default?.fetch ? workerMod.default : (workerMod.fetch ? workerMod : workerMod.default?.default || workerMod.default);
  const { F1Service } = await import('../src/services/f1_service.js');
  const { calculateUtcDelta, getBeijingTime } = await import('../src/domain/f1/time.js');
  const { simulateTitleScenario } = await import('../src/domain/f1/championship.js');

  await t.test('1. F1Service 数据层离线降级与结构完整性', async () => {
    const f1 = new F1Service({});
    const overview = await f1.getOverview();

    assert.ok(overview, '概览数据必须有效生成');
    assert.strictEqual(overview.season, '2026', '赛季年份必须为 2026');
    assert.ok(overview.currentMeeting, '当前分站对象必须存在');
    assert.strictEqual(overview.currentMeeting.round, 17, '新加坡必须为第 17 站');
    assert.ok(overview.driverStandings.length >= 8, '车手榜至少提供前 8 名');
    assert.strictEqual(overview.driverStandings[0].code, 'ANT', '当前榜首应为 Kimi Antonelli');
    assert.strictEqual(overview.driverStandings[0].points, 320, '榜首积分应为 320');
    assert.strictEqual(overview.previousRace.winner.code, 'VER', '上一站雪邦冠军为维斯塔潘');
  });

  await t.test('2. 争冠数学推演确定性计算', async () => {
    // 安东内利 (320) vs 拉塞尔 (236)
    // 假设新加坡站 Antonelli 正赛获胜(25) + 冲刺获胜(8) = +33 -> 353
    // Russell 正赛 P2(18) + 冲刺 P2(7) = +25 -> 261
    // 分差变为 353 - 261 = 92
    const sim = simulateTitleScenario({
      leader: { name: 'Kimi Antonelli', code: 'ANT', points: 320 },
      challenger: { name: 'George Russell', code: 'RUS', points: 236 },
      leaderSprint: 1,
      leaderRace: 1,
      challengerSprint: 2,
      challengerRace: 2,
      remainingRounds: 6
    });

    assert.strictEqual(sim.leader.projectedPts, 353);
    assert.strictEqual(sim.challenger.projectedPts, 261);
    assert.strictEqual(sim.newGap, 92);
    assert.ok(sim.narrative.length > 0);
  });

  await t.test('3. 无漂移 UTC 倒计时计算', async () => {
    const targetMs = Date.now() + 2 * 86400000 + 3 * 3600000 + 15 * 60000 + 42000;
    const delta = calculateUtcDelta(targetMs, Date.now());

    assert.strictEqual(delta.days, '02');
    assert.strictEqual(delta.hours, '03');
    assert.strictEqual(delta.mins, '15');
    assert.strictEqual(delta.secs, '42');
    assert.strictEqual(delta.isPast, false);
  });

  await t.test('4. Worker CORS OPTIONS 预检请求', async () => {
    const req = new Request('https://f1.tike69.cc.cd/api/f1/overview', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com' }
    });
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.test('5. Worker REST API 路由 (/api/f1/overview)', async () => {
    const req = new Request('https://f1.tike69.cc.cd/api/f1/overview');
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.season, '2026');
    assert.ok(data.driverStandings.length > 0);
  });

  await t.test('6. Worker Web 首页 SSR (/ 路由)', async () => {
    const req = new Request('https://f1.tike69.cc.cd/');
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('TIKE · F1 Race Intelligence'), '首页标题必须存在');
    assert.ok(html.includes('id="tike-bootstrap"'), 'Bootstrap 数据脚本必须直出');
    assert.ok(html.includes('滨海湾市街赛道'), '当前分站赛道名必须包含');
    assert.ok(html.includes('320'), '当前榜首积分 320 必须渲染');
    assert.ok(!html.includes('NaN'), '页面严禁出现 NaN');
  });

  await t.test('7. Worker 独立 AI 专页 (/ai 路由)', async () => {
    const req = new Request('https://f1.tike69.cc.cd/ai');
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Dedicated Intelligence Console'), 'AI 专页小标题必须存在');
    assert.ok(html.includes('TIKE AI'), 'AI 专页主标题必须存在');
  });

  await t.test('8. Worker 独立系统遥测页 (/system 路由)', async () => {
    const req = new Request('https://f1.tike69.cc.cd/system');
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('系统与遥测监控'), '系统专页必须存在');
    assert.ok(html.includes('f1.tike69.cc.cd'), '回调地址必须包含');
  });

  await t.test('9. 飞书 Webhook URL 握手校验', async () => {
    const req = new Request('https://f1.tike69.cc.cd/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'url_verification', challenge: 'tike_challenge_token_888' })
    });
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.challenge, 'tike_challenge_token_888');
  });
});
