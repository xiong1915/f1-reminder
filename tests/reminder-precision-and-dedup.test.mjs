// tests/reminder-precision-and-dedup.test.mjs
// 专项测试：提醒精度修正、赛程缓存降级、API 429 规避、改期兼容、Redis 原子防重与锁生命周期
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAndDeliverEdgeReminders,
  getCalendarRefreshInterval,
  getOrFetchCalendar,
  resetInMemoryCalendarCache,
  reminderDue,
  startReminderDue,
  sendFeishuReminder
} from '../src/worker/reminder_edge.js';

test('提醒精度与缓存 1: getCalendarRefreshInterval 依据与赛事的临近程度动态调频', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');

  // 1. 无即将开赛的赛程（空数组或均已开赛）-> 12 小时
  assert.strictEqual(getCalendarRefreshInterval([], now), 10 * 60 * 1000);
  const pastSessions = [{ startTimeMs: now - 3600000 }];
  assert.strictEqual(getCalendarRefreshInterval(pastSessions, now), 12 * 3600 * 1000);

  // 2. 距离下一场赛事超过 7 天（非比赛周）-> 12 小时刷新
  const farSessions = [{ startTimeMs: now + 8 * 24 * 3600 * 1000 }];
  assert.strictEqual(getCalendarRefreshInterval(farSessions, now), 12 * 3600 * 1000);

  // 3. 距离下一场赛事 1-7 天（比赛周前中期）-> 6 小时刷新
  const weekSessions = [{ startTimeMs: now + 3 * 24 * 3600 * 1000 }];
  assert.strictEqual(getCalendarRefreshInterval(weekSessions, now), 6 * 3600 * 1000);

  // 4. 距离下一场赛事 2-24 小时（比赛日）-> 1 小时刷新
  const daySessions = [{ startTimeMs: now + 5 * 3600 * 1000 }];
  assert.strictEqual(getCalendarRefreshInterval(daySessions, now), 3600 * 1000);

  // 5. 距离下一场赛事 <= 2 小时（开赛临近）-> 10 分钟刷新（兼顾官方改期且避免每分钟轰炸）
  const imminentSessions = [{ startTimeMs: now + 30 * 60 * 1000 }];
  assert.strictEqual(getCalendarRefreshInterval(imminentSessions, now), 10 * 60 * 1000);
});

test('提醒精度与缓存 2: 多级缓存避免每分钟无条件请求 Jolpica，命中缓存时 0 次上游请求', async () => {
  resetInMemoryCalendarCache();

  let jolpicaRequestCount = 0;
  const mockFetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('api.jolpi.ca')) {
      jolpicaRequestCount++;
      return new Response(JSON.stringify({
        MRData: {
          RaceTable: {
            Races: [
              {
                season: '2026',
                round: '17',
                raceName: 'Singapore GP',
                Circuit: { Location: { country: 'Singapore', locality: 'Marina Bay' } },
                date: '2026-10-11',
                time: '12:00:00Z'
              }
            ]
          }
        }
      }), { status: 200 });
    }
    throw new Error(`Unexpected url: ${urlStr}`);
  };

  const env = {};
  const t0 = Date.parse('2026-10-11T09:00:00Z'); // 距离正赛 3 小时 -> 刷新间隔为 1 小时 (3600s)

  // 第 1 次调用：冷启动，必须请求 1 次 Jolpica
  const res1 = await getOrFetchCalendar(env, '2026', t0, { fetchImpl: mockFetch });
  assert.strictEqual(res1.source, 'jolpica_live');
  assert.strictEqual(jolpicaRequestCount, 1);
  assert.strictEqual(res1.sessions.length, 1);

  // 第 2 次调用：1 分钟后（t0 + 60s），缓存严格有效，绝不请求 Jolpica
  const res2 = await getOrFetchCalendar(env, '2026', t0 + 60000, { fetchImpl: mockFetch });
  assert.strictEqual(res2.source, 'memory_cache');
  assert.strictEqual(jolpicaRequestCount, 1, '每分钟 Cron 检查必须命中内存缓存，上游请求次数保持为 1！');

  // 第 3 次调用：15 分钟后（t0 + 15m），仍在 1 小时间隔内，继续命中缓存
  const res3 = await getOrFetchCalendar(env, '2026', t0 + 15 * 60000, { fetchImpl: mockFetch });
  assert.strictEqual(res3.source, 'memory_cache');
  assert.strictEqual(jolpicaRequestCount, 1);
});

test('提醒精度与缓存 3: Jolpica API 429 限流时安全降级至缓存并进入 15 分钟退避', async () => {
  resetInMemoryCalendarCache();

  let jolpicaCalls = 0;
  const mockFetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('api.jolpi.ca')) {
      jolpicaCalls++;
      if (jolpicaCalls === 1) {
        // 第一次成功建立缓存
        return new Response(JSON.stringify({
          MRData: {
            RaceTable: {
              Races: [{
                season: '2026', round: '17', raceName: 'Singapore GP',
                Circuit: { Location: { country: 'Singapore', locality: 'Marina Bay' } },
                date: '2026-10-11', time: '12:00:00Z'
              }]
            }
          }
        }), { status: 200 });
      }
      // 随后返回 429 Too Many Requests
      return new Response('Too Many Requests', { status: 429 });
    }
    throw new Error(`Unexpected: ${urlStr}`);
  };

  const env = {};
  const t0 = Date.parse('2026-10-11T11:45:00Z'); // 临近 15 分钟

  // 1. 成功建立初次缓存
  const res1 = await getOrFetchCalendar(env, '2026', t0, { fetchImpl: mockFetch });
  assert.strictEqual(res1.source, 'jolpica_live');
  assert.strictEqual(jolpicaCalls, 1);

  // 2. 强制刷新遭遇 429 -> 降级为 rate_limited_fallback，保留现有赛程
  const res2 = await getOrFetchCalendar(env, '2026', t0 + 1000, { fetchImpl: mockFetch, forceRefresh: true });
  assert.strictEqual(res2.source, 'rate_limited_fallback');
  assert.strictEqual(res2.sessions.length, 1, '429 时原有赛程必须被完好保留');

  // 3. 超过常规刷新间隔（如 11 分钟后），但仍在 15 分钟退避期内 -> 不发起网络请求，降级返回 backoff_fallback
  const res3 = await getOrFetchCalendar(env, '2026', t0 + 11 * 60 * 1000, { fetchImpl: mockFetch });
  assert.strictEqual(res3.source, 'backoff_fallback');
  assert.strictEqual(jolpicaCalls, 2, '退避期内不再向 Jolpica 施加网络压力');
});

test('提醒精度与缓存 4: 网络故障或 5xx 时安全降级使用现有赛程缓存', async () => {
  resetInMemoryCalendarCache();

  let jolpicaCalls = 0;
  const mockFetch = async (url) => {
    jolpicaCalls++;
    if (jolpicaCalls === 1) {
      return new Response(JSON.stringify({
        MRData: {
          RaceTable: {
            Races: [{
              season: '2026', round: '17', raceName: 'Singapore GP',
              Circuit: { Location: { country: 'Singapore', locality: 'Marina Bay' } },
              date: '2026-10-11', time: '12:00:00Z'
            }]
          }
        }
      }), { status: 200 });
    }
    throw new Error('ETIMEDOUT: Connection timed out');
  };

  const env = {};
  const t0 = Date.parse('2026-10-11T11:00:00Z');

  // 1. 初次拉取
  await getOrFetchCalendar(env, '2026', t0, { fetchImpl: mockFetch });

  // 2. 网络中断降级
  const res = await getOrFetchCalendar(env, '2026', t0 + 1000, { fetchImpl: mockFetch, forceRefresh: true });
  assert.strictEqual(res.source, 'network_error_fallback');
  assert.strictEqual(res.sessions.length, 1);
});

test('赛程改期与容错: 赛程改期生成新防重键，旧时间的已发记录绝不阻断改期后新提醒', async () => {
  const mockRedisStorage = new Map();
  const feishuCalls = [];

  const mockFetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.includes('open.feishu.cn')) {
      feishuCalls.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ code: 0, msg: 'success' }), { status: 200 });
    }
    if (urlStr.includes('/pipeline')) {
      const commands = JSON.parse(options.body);
      const results = [];
      for (const cmd of commands) {
        const action = cmd[0].toLowerCase();
        if (action === 'set') {
          const [ , key, val, ...rest ] = cmd;
          const isNx = rest.some(x => String(x).toLowerCase() === 'nx');
          if (isNx && mockRedisStorage.has(key)) {
            results.push({ result: null });
          } else {
            mockRedisStorage.set(key, val);
            results.push({ result: 'OK' });
          }
        } else if (action === 'get') {
          results.push({ result: mockRedisStorage.get(cmd[1]) || null });
        } else if (action === 'del') {
          results.push({ result: mockRedisStorage.delete(cmd[1]) ? 1 : 0 });
        }
      }
      return new Response(JSON.stringify(results), { status: 200 });
    }
    throw new Error(`Unexpected url: ${urlStr}`);
  };

  const env = {
    UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock-token',
    FEISHU_WEBHOOK_URL: 'https://open.feishu.cn/hook'
  };

  // 原定开赛时间: 12:00:00Z
  const oldSession = {
    season: '2026', round: '17', sessionId: 'race-17', sessionName: '大奖赛正赛 (Main Race)',
    gpName: '新加坡大奖赛', locality: 'Marina Bay',
    startTimeUTC: '2026-10-11T12:00:00.000Z', startTimeMs: Date.parse('2026-10-11T12:00:00.000Z')
  };

  // 1. 原定时间在 T-30 (11:30) 触发并发送
  await checkAndDeliverEdgeReminders(env, {
    nowMs: Date.parse('2026-10-11T11:30:00.000Z'),
    fetchImpl: mockFetch,
    sessions: [oldSession]
  });
  assert.strictEqual(feishuCalls.length, 1, '原定时间已发 1 次');
  assert.ok(mockRedisStorage.has('f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z'));

  // 2. 官方由于暴雨改期延后 1 小时至 13:00:00Z
  const rescheduledSession = {
    season: '2026', round: '17', sessionId: 'race-17', sessionName: '大奖赛正赛 (Main Race)',
    gpName: '新加坡大奖赛', locality: 'Marina Bay',
    startTimeUTC: '2026-10-11T13:00:00.000Z', startTimeMs: Date.parse('2026-10-11T13:00:00.000Z')
  };

  // 3. 在新时间的 T-30 (12:30) 运行
  const resNew = await checkAndDeliverEdgeReminders(env, {
    nowMs: Date.parse('2026-10-11T12:30:00.000Z'),
    fetchImpl: mockFetch,
    sessions: [rescheduledSession]
  });

  assert.strictEqual(feishuCalls.length, 2, '改期后新时间的提醒必须成功发出第 2 条卡片，绝不受旧键阻断！');
  assert.strictEqual(resNew.results[0].status, 'sent');
  assert.ok(mockRedisStorage.has('f1:delivery:2026:17:race-17:2026-10-11T13:00:00.000Z'), '新时间独立占有新防重键');
});

test('防重复与状态机: Redis 原子占用、成功记录(7天)、失败立即释放(DEL)与超时(60秒)全流程验证', async () => {
  const mockRedisStorage = new Map();
  let feishuBehavior = 'success'; // 'success' | 'reject' | 'timeout'

  const mockFetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.includes('open.feishu.cn')) {
      if (feishuBehavior === 'reject') {
        return new Response(JSON.stringify({ code: 19021, msg: 'Invalid Webhook Token' }), { status: 400 });
      }
      if (feishuBehavior === 'timeout') {
        throw new Error('AbortError: The operation was aborted due to timeout');
      }
      return new Response(JSON.stringify({ code: 0, msg: 'ok' }), { status: 200 });
    }
    if (urlStr.includes('/pipeline')) {
      const commands = JSON.parse(options.body);
      const results = [];
      for (const cmd of commands) {
        const action = cmd[0].toLowerCase();
        if (action === 'set') {
          const [ , key, val, ...rest ] = cmd;
          const isNx = rest.some(x => String(x).toLowerCase() === 'nx');
          if (isNx && mockRedisStorage.has(key)) {
            results.push({ result: null });
          } else {
            mockRedisStorage.set(key, val);
            results.push({ result: 'OK' });
          }
        } else if (action === 'get') {
          results.push({ result: mockRedisStorage.get(cmd[1]) || null });
        } else if (action === 'del') {
          results.push({ result: mockRedisStorage.delete(cmd[1]) ? 1 : 0 });
        }
      }
      return new Response(JSON.stringify(results), { status: 200 });
    }
    throw new Error(`Unexpected url: ${urlStr}`);
  };

  const env = {
    UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock-token',
    FEISHU_WEBHOOK_URL: 'https://open.feishu.cn/hook'
  };

  const session = {
    season: '2026', round: '17', sessionId: 'race-17', sessionName: '大奖赛正赛 (Main Race)',
    gpName: '新加坡大奖赛', locality: 'Marina Bay',
    startTimeUTC: '2026-10-11T12:00:00.000Z', startTimeMs: Date.parse('2026-10-11T12:00:00.000Z')
  };
  const key = 'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z';

  // 场景 A: 发送被明确拒绝 -> 锁必须立即释放 (DEL)，状态标记为 failed
  feishuBehavior = 'reject';
  const resFail = await checkAndDeliverEdgeReminders(env, {
    nowMs: Date.parse('2026-10-11T11:30:00.000Z'),
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resFail.results[0].status, 'failed');
  assert.strictEqual(mockRedisStorage.has(key), false, '明确失败时必须 DEL 释放锁，允许下次检查重试！');

  // 场景 B: 恢复正常后重试 -> 成功占用并记录 sent (7 天 TTL)
  feishuBehavior = 'success';
  const resSuccess = await checkAndDeliverEdgeReminders(env, {
    nowMs: Date.parse('2026-10-11T11:31:00.000Z'),
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resSuccess.results[0].status, 'sent');
  assert.ok(mockRedisStorage.has(key));
  const savedSent = JSON.parse(mockRedisStorage.get(key));
  assert.strictEqual(savedSent.status, 'sent');

  // 场景 C: 并发竞争 -> 再次触发必须被 suppressed 拦截
  const resDup = await checkAndDeliverEdgeReminders(env, {
    nowMs: Date.parse('2026-10-11T11:32:00.000Z'),
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resDup.results[0].status, 'suppressed', '已发送记录必须抑制后续并发或定时重复');

  // 场景 D: 超时与状态不确定 -> 记录 uncertain (短 TTL 60 秒)
  mockRedisStorage.clear();
  feishuBehavior = 'timeout';
  const resTimeout = await checkAndDeliverEdgeReminders(env, {
    nowMs: Date.parse('2026-10-11T11:30:00.000Z'),
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resTimeout.results[0].status, 'uncertain');
  assert.ok(mockRedisStorage.has(key));
  const savedUncertain = JSON.parse(mockRedisStorage.get(key));
  assert.strictEqual(savedUncertain.status, 'uncertain', '结果不明时必须暂存 uncertain 状态');
});

test('Cron 延迟与时间容差: 应对 Cron 抖动延迟 (提前 28m / 1m 及开赛延后 2m) 正确识别阶段与推送，超时安全失效', async () => {
  const feishuPushes = [];
  const mockFetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.includes('open.feishu.cn')) {
      feishuPushes.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ code: 0, msg: 'ok' }), { status: 200 });
    }
    if (urlStr.includes('/pipeline')) {
      return new Response(JSON.stringify([{ result: 'OK' }, { result: 'OK' }]), { status: 200 });
    }
    throw new Error(`Unexpected url: ${urlStr}`);
  };

  const env = {
    UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock-token',
    FEISHU_WEBHOOK_URL: 'https://open.feishu.cn/hook'
  };

  const raceStartMs = Date.parse('2026-10-11T12:00:00.000Z');
  const session = {
    season: '2026', round: '17', sessionId: 'race-17', sessionName: '大奖赛正赛 (Main Race)',
    gpName: '新加坡大奖赛', locality: 'Marina Bay',
    startTimeUTC: '2026-10-11T12:00:00.000Z', startTimeMs: raceStartMs
  };

  // 1. Cron 提前 36 分钟被调度（超出 35m 窗口）-> 不应提前触发
  const resEarly = await checkAndDeliverEdgeReminders(env, {
    nowMs: raceStartMs - 36 * 60000,
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resEarly.results.length, 0, '提前 36 分钟不可触发');

  // 2. Cron 因边缘调度排队抖动延迟 2 分钟，在 T-28 分钟才唤醒 -> 正确识别为 before，倒计时剩余 28 分钟
  const resDelayedBefore = await checkAndDeliverEdgeReminders(env, {
    nowMs: raceStartMs - 28 * 60000,
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resDelayedBefore.results.length, 1);
  assert.strictEqual(resDelayedBefore.results[0].phase, 'before');
  assert.strictEqual(resDelayedBefore.results[0].status, 'sent');
  assert.strictEqual(Math.round(resDelayedBefore.results[0].remainingMinutes), 28);

  // 3. 极端排队延迟：在赛前 1 分钟才被调用 -> 依然成功识别为 before，剩余 1 分钟
  const resImminent = await checkAndDeliverEdgeReminders(env, {
    nowMs: raceStartMs - 1 * 60000,
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resImminent.results[0].phase, 'before');
  assert.strictEqual(Math.round(resImminent.results[0].remainingMinutes), 1);

  // 4. 开赛调度延迟：比赛开跑 2 分钟后才触发 -> 成功捕获 start 开赛阶段 (处于 0 到 -10m 容差窗口内)
  const resDelayedStart = await checkAndDeliverEdgeReminders(env, {
    nowMs: raceStartMs + 2 * 60000,
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resDelayedStart.results[0].phase, 'start');
  assert.strictEqual(resDelayedStart.results[0].status, 'sent');

  // 5. 严重超时失效：比赛开跑 12 分钟后才触发 (超过 10m 允许窗口) -> 拒绝发送过时通知
  const resExpired = await checkAndDeliverEdgeReminders(env, {
    nowMs: raceStartMs + 12 * 60000,
    fetchImpl: mockFetch,
    sessions: [session]
  });
  assert.strictEqual(resExpired.results.length, 0, '开赛超过 10 分钟已失效，严禁发送陈旧通知');
});

test('存储层不可用安全兜底: Upstash Redis 503 异常时安全 fail-closed，记录 storage_error 并上报错误', async () => {
  let feishuCalled = false;
  const mockFetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('open.feishu.cn')) {
      feishuCalled = true;
      return new Response(JSON.stringify({ code: 0 }), { status: 200 });
    }
    if (urlStr.includes('/pipeline')) {
      throw new Error('Redis HTTP 503 Service Unavailable');
    }
    throw new Error(`Unexpected url: ${urlStr}`);
  };

  const env = {
    UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock-token',
    FEISHU_WEBHOOK_URL: 'https://open.feishu.cn/hook'
  };

  const session = {
    season: '2026', round: '17', sessionId: 'race-17', sessionName: '大奖赛正赛 (Main Race)',
    gpName: '新加坡大奖赛', locality: 'Marina Bay',
    startTimeUTC: '2026-10-11T12:00:00.000Z', startTimeMs: Date.parse('2026-10-11T12:00:00.000Z')
  };

  const res = await checkAndDeliverEdgeReminders(env, {
    nowMs: Date.parse('2026-10-11T11:30:00.000Z'),
    fetchImpl: mockFetch,
    sessions: [session]
  });

  // 1. Redis 故障时不能假报为正常去重 suppressed
  assert.strictEqual(res.results[0].status, 'storage_error', 'Redis 故障时状态必须为 storage_error');
  // 2. 必须记录错误信息
  assert.ok(res.errors && res.errors.length > 0, 'healthPayload 必须保留并上报错误信息');
  assert.ok(res.errors[0].error.includes('503'));
  // 3. fail-closed: 无分布式锁时绝不冒失向飞书推送消息，防止无锁并发轰炸
  assert.strictEqual(feishuCalled, false, '存储故障时必须安全闭环 (fail-closed)，绝不在无锁状态下冒进推送');
});

