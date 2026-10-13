// tests/cf_worker.test.js - Cloudflare Worker Edge Native 独立提醒与路由单元测试
import test from 'node:test';
import assert from 'node:assert';
import rawWorker from '../cf_worker.js';
import rawReminderWorker from '../workers/f1-reminder-worker/worker.js';
import {
  checkAndDeliverEdgeReminders,
  getReminderHealth,
  reminderDue,
  startReminderDue,
  parseErgastRaces
} from '../src/worker/reminder_edge.js';

const worker = rawWorker?.fetch ? rawWorker : (rawWorker?.default || rawWorker);
const reminderWorker = rawReminderWorker?.fetch ? rawReminderWorker : (rawReminderWorker?.default || rawReminderWorker);

test('Edge Timing: reminderDue 与 startReminderDue 精确边界验证', () => {
  const now = Date.parse('2026-10-11T12:00:00.000Z');

  // 赛前提醒窗口: (0, 35] 分钟
  assert.strictEqual(reminderDue('2026-10-11T12:35:00.000Z', now), true, 'T-35m 必须命中');
  assert.strictEqual(reminderDue('2026-10-11T12:20:00.000Z', now), true, 'T-20m 必须命中');
  assert.strictEqual(reminderDue('2026-10-11T12:01:00.000Z', now), true, 'T-1m 必须命中');
  assert.strictEqual(reminderDue('2026-10-11T12:36:00.000Z', now), false, 'T-36m 超出窗口');
  assert.strictEqual(reminderDue('2026-10-11T12:00:00.000Z', now), false, '准点开赛不属于赛前提醒');

  // 开赛提醒窗口: [0, 10) 分钟
  assert.strictEqual(startReminderDue('2026-10-11T12:00:00.000Z', now), true, '准点开赛 (T+0m) 必须命中开赛提醒');
  assert.strictEqual(startReminderDue('2026-10-11T11:55:00.000Z', now), true, '开赛 5 分钟后必须命中开赛提醒');
  assert.strictEqual(startReminderDue('2026-10-11T11:50:01.000Z', now), true, '开赛 9.9 分钟必须命中开赛提醒');
  assert.strictEqual(startReminderDue('2026-10-11T11:50:00.000Z', now), false, '开赛 10 分钟边界不再补发');
  assert.strictEqual(startReminderDue('2026-10-11T12:01:00.000Z', now), false, '尚未开赛不属于开赛提醒');
});

test('Edge Parsing: parseErgastRaces 正确解析各分站各节时间', () => {
  const sampleJson = {
    MRData: {
      RaceTable: {
        Races: [
          {
            season: '2026',
            round: '17',
            raceName: 'Singapore Grand Prix',
            Circuit: { Location: { country: 'Singapore', locality: 'Marina Bay' } },
            date: '2026-10-11',
            time: '12:00:00Z',
            Qualifying: { date: '2026-10-10', time: '13:00:00Z' },
            Sprint: { date: '2026-10-10', time: '09:00:00Z' }
          }
        ]
      }
    }
  };

  const sessions = parseErgastRaces(sampleJson);
  assert.strictEqual(sessions.length, 3, '应提取 正赛、排位赛、冲刺赛 共 3 节');
  const race = sessions.find(s => s.type === 'race');
  assert.ok(race);
  assert.strictEqual(race.round, '17');
  assert.strictEqual(race.gpName, '新加坡大奖赛');
  assert.strictEqual(race.startTimeUTC, '2026-10-11T12:00:00.000Z');
});

test('Edge Native: checkAndDeliverEdgeReminders 赛前与开赛双阶段触发、Redis分布式锁与飞书发包验证', async () => {
  const mockRedisStorage = new Map();
  const feishuCalls = [];

  const mockFetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.includes('open.feishu.cn')) {
      const body = JSON.parse(options.body);
      feishuCalls.push(body);
      return new Response(JSON.stringify({ code: 0, msg: 'success' }), { status: 200 });
    }
    if (urlStr.includes('/pipeline')) {
      const commands = JSON.parse(options.body);
      const results = [];
      for (const cmd of commands) {
        const action = cmd[0].toLowerCase();
        if (action === 'set') {
          const key = cmd[1];
          const val = cmd[2];
          const isNx = cmd.includes('nx');
          if (isNx && mockRedisStorage.has(key)) {
            results.push({ result: null }); // NX 锁争抢失败
          } else {
            mockRedisStorage.set(key, val);
            results.push({ result: 'OK' });
          }
        } else if (action === 'get') {
          const key = cmd[1];
          results.push({ result: mockRedisStorage.get(key) || null });
        } else if (action === 'del') {
          const key = cmd[1];
          results.push({ result: mockRedisStorage.delete(key) ? 1 : 0 });
        }
      }
      return new Response(JSON.stringify(results), { status: 200 });
    }
    throw new Error(`Unexpected mock URL: ${urlStr}`);
  };

  const env = {
    UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock-token',
    FEISHU_WEBHOOK_URL: 'https://open.feishu.cn/open-apis/bot/v2/hook/mock-hook'
  };

  const mockSessions = [
    {
      season: '2026',
      round: '17',
      sessionId: 'race-17',
      sessionName: '大奖赛正赛 (Main Race)',
      gpName: '新加坡大奖赛',
      locality: 'Marina Bay',
      startTimeUTC: '2026-10-11T12:00:00.000Z',
      startTimeMs: Date.parse('2026-10-11T12:00:00.000Z')
    }
  ];

  // 场景 1: T-30 分钟触发赛前提醒
  const nowBefore = Date.parse('2026-10-11T11:30:00.000Z');
  const resBefore = await checkAndDeliverEdgeReminders(env, {
    nowMs: nowBefore,
    fetchImpl: mockFetch,
    sessions: mockSessions
  });

  assert.strictEqual(feishuCalls.length, 1, '赛前提醒必须发出且仅发出 1 次');
  assert.strictEqual(resBefore.results[0].status, 'sent');
  assert.strictEqual(resBefore.results[0].phase, 'before');
  const beforeKey = 'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z';
  assert.ok(mockRedisStorage.has(beforeKey), 'Redis 中必须记录 sent 状态');

  // 场景 2: T-25 分钟重复运行 -> 必须被 Redis 去重阻断
  const nowBefore2 = Date.parse('2026-10-11T11:35:00.000Z');
  const resBefore2 = await checkAndDeliverEdgeReminders(env, {
    nowMs: nowBefore2,
    fetchImpl: mockFetch,
    sessions: mockSessions
  });
  assert.strictEqual(feishuCalls.length, 1, '重复触发时发包次数严格保持为 1，零重复！');
  assert.strictEqual(resBefore2.results[0].status, 'suppressed', '已被先前记录阻断');

  // 场景 3: T+1 分钟触发开赛提醒
  const nowStart = Date.parse('2026-10-11T12:01:00.000Z');
  const resStart = await checkAndDeliverEdgeReminders(env, {
    nowMs: nowStart,
    fetchImpl: mockFetch,
    sessions: mockSessions
  });

  assert.strictEqual(feishuCalls.length, 2, '开赛提醒必须独立发出第 2 次');
  assert.strictEqual(resStart.results[0].phase, 'start');
  assert.strictEqual(resStart.results[0].status, 'sent');
  const startKey = 'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z:start';
  assert.ok(mockRedisStorage.has(startKey), 'Redis 中必须独立记录 :start 状态');

  // 验证开赛提醒卡片样式为红色
  const startCard = feishuCalls[1].card;
  assert.strictEqual(startCard.header.template, 'red');
  assert.ok(startCard.header.title.content.includes('比赛已正式开赛'));
});

test('Worker 彻底分离: 网站网关 cf_worker.js 纯反代，不拦截 /api/cron/reminder，无 scheduled', async () => {
  const env = {
    UPSTREAM_ORIGIN: 'https://f1-race-reminder-cloud.vercel.app'
  };

  // 1. 验证网关 Worker 绝不包含 scheduled 触发器
  assert.strictEqual(worker.scheduled, undefined, '网站反代网关绝不能包含 scheduled 触发器');

  // 2. 模拟上游反向代理
  const origFetch = globalThis.fetch;
  let forwardedReq = null;
  try {
    globalThis.fetch = async (req) => {
      forwardedReq = req;
      return new Response('<html>APEX V3 Web</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    };

    // 常规页面反向代理
    const webReq = new Request('https://f1.tike69.cc.cd/races/1', {
      headers: { 'cf-connecting-ip': '1.2.3.4' }
    });
    const webRes = await worker.fetch(webReq, env, {});
    assert.strictEqual(webRes.status, 200);
    assert.strictEqual(webRes.headers.get('X-Tike-Gateway'), 'Cloudflare-Edge-Native-V3');
    assert.strictEqual(forwardedReq.headers.get('X-Real-IP'), '1.2.3.4');

    // /api/cron/reminder 直通转发至上游（不再被网关拦截接管）
    const reminderReq = new Request('https://f1.tike69.cc.cd/api/cron/reminder');
    await worker.fetch(reminderReq, env, {});
    const forwardedUrl = new URL(forwardedReq.url);
    assert.strictEqual(forwardedUrl.pathname, '/api/cron/reminder', '网关必须直通转发 /api/cron/reminder，绝不接管');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('Worker 彻底分离: 独立的 f1-reminder-worker 负责定时 Cron 与提醒健康状态', async () => {
  const env = {
    CRON_SECRET: 'test-secret',
    UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock-token',
    FEISHU_WEBHOOK_URL: 'https://open.feishu.cn/mock'
  };

  // 1. 独立提醒 Worker 必须具备 scheduled 处理器
  assert.ok(typeof reminderWorker.scheduled === 'function', 'f1-reminder-worker 必须包含 scheduled 定时处理器');

  // 2. /health 状态端点
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      return new Response(JSON.stringify([{ result: JSON.stringify({ status: 'ok' }) }]), { status: 200 });
    };

    const healthReq = new Request('https://f1-reminder-worker.internal/health');
    const healthRes = await reminderWorker.fetch(healthReq, env, {});
    assert.strictEqual(healthRes.status, 200);

    // 3. /trigger 鉴权机制：未授权 -> 401
    const unauthReq = new Request('https://f1-reminder-worker.internal/trigger', {
      headers: { 'Authorization': 'Bearer wrong-secret' }
    });
    const unauthRes = await reminderWorker.fetch(unauthReq, env, {});
    assert.strictEqual(unauthRes.status, 401);

    // 4. /trigger 鉴权机制：已授权 -> 200
    const authReq = new Request('https://f1-reminder-worker.internal/trigger', {
      headers: { 'Authorization': 'Bearer test-secret' }
    });
    const authRes = await reminderWorker.fetch(authReq, env, {});
    assert.strictEqual(authRes.status, 200);

    // 5. /trigger 安全门禁：未配置 CRON_SECRET 时必须默认拒绝 (fail-closed) -> 401
    const noSecretRes = await reminderWorker.fetch(authReq, { ...env, CRON_SECRET: '' }, {});
    assert.strictEqual(noSecretRes.status, 401, '未配置 CRON_SECRET 时必须 fail-closed 拒绝访问');
  } finally {
    globalThis.fetch = origFetch;
  }
});
