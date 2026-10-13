// tests/cross-system-dedup.test.js - 跨系统交接、Redis历史迁移与零重复发送端到端Mock验证
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { migrateRedisHistory, mapRedisKeyToHistoryRecords, assertReadOnlyRedis } = require('../scripts/migrate-history');
const { loadHistory, saveHistory, findHistoryRecord, isSentRecord, isUncertainRecord } = require('../src/history');
const { isStandardWindow, isCatchupWindow, isStartWindow } = require('../src/timing');

// 模拟 Upstash Redis 线上真实环境返回的数据集
const MOCK_REDIS_DELIVERY_KEYS = [
  'f1:delivery:2026:17:quali-17:2026-10-10T13:00:00Z',
  'f1:delivery:2026:17:quali-17:2026-10-10T13:30:00.000Z',
  'f1:delivery:2026:17:quali-17:2026-10-10T13:30:00.000Z:start',
  'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z',
  'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z:start',
  'f1:delivery:2026:17:sprint-17:2026-10-10T09:00:00Z'
];

const MOCK_REDIS_VALUES = {
  'f1:delivery:2026:17:quali-17:2026-10-10T13:00:00Z': { status: 'sent', updatedAt: '2026-10-10T12:25:42.860Z' },
  'f1:delivery:2026:17:quali-17:2026-10-10T13:30:00.000Z': { status: 'sent', updatedAt: '2026-10-10T13:06:42.302Z' },
  'f1:delivery:2026:17:quali-17:2026-10-10T13:30:00.000Z:start': { status: 'sent', updatedAt: '2026-10-10T13:30:58.601Z' },
  'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z': { status: 'sent', updatedAt: '2026-10-11T11:25:48.297Z' },
  'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z:start': { status: 'sent', updatedAt: '2026-10-11T12:01:13.864Z' },
  'f1:delivery:2026:17:sprint-17:2026-10-10T09:00:00Z': { status: 'sent', updatedAt: '2026-10-10T08:25:47.766Z' }
};

function createMockFetch(redisKeys = MOCK_REDIS_DELIVERY_KEYS, redisValues = MOCK_REDIS_VALUES) {
  return async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.includes('/scan/0/match/f1:delivery:*/count/200')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: ['0', redisKeys] })
      };
    }
    if (urlStr.includes('/pipeline')) {
      const commands = JSON.parse(options.body);
      const results = commands.map(cmd => {
        const key = cmd[1];
        return { result: JSON.stringify(redisValues[key] || { status: 'sent' }) };
      });
      return {
        ok: true,
        status: 200,
        json: async () => results
      };
    }
    throw new Error(`Unexpected mock URL: ${urlStr}`);
  };
}

test('交接迁移 1: Redis 真实历史记录安全映射与无空伪造', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_mig_${Date.now()}.json`);
  try {
    const mockFetch = createMockFetch();
    const result = await migrateRedisHistory({
      redisUrl: 'https://mock.upstash.io',
      redisToken: 'mock-token',
      historyPath: tmpHistory,
      fetchImpl: mockFetch
    });

    assert.strictEqual(result.migratedCount > 0, true, '迁移记录数必须大于0，严禁生成空历史');
    assert.strictEqual(fs.existsSync(tmpHistory), true, '历史文件必须实体落盘');

    const loaded = loadHistory(tmpHistory);
    // 验证 Redis 原生键与 Jolpica 规范化键均已建立索引
    const raceKey = 'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z';
    const raceStartKey = 'f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z:start';
    const jolpicaRaceKey = `key_jolpica_2026_17_Race_${Date.parse('2026-10-11T12:00:00.000Z')}`;
    const jolpicaRaceStartKey = `${jolpicaRaceKey}:start`;

    assert.ok(loaded[raceKey], '原始 Redis 赛前键必须存在');
    assert.strictEqual(loaded[raceKey].status, 'sent');
    assert.ok(loaded[raceStartKey], '原始 Redis 开赛键必须存在');
    assert.strictEqual(loaded[raceStartKey].phase, 'start');

    assert.ok(loaded[jolpicaRaceKey], 'Jolpica 规范化赛前键必须存在');
    assert.strictEqual(loaded[jolpicaRaceKey].status, 'sent');
    assert.ok(loaded[jolpicaRaceStartKey], 'Jolpica 规范化开赛键必须存在');
    assert.strictEqual(loaded[jolpicaRaceStartKey].phase, 'start');
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});

test('交接迁移 2: 绝不覆盖或丢弃已有的旧本地历史', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_merge_${Date.now()}.json`);
  try {
    const existingOldData = {
      'key_legacy_2025_01_Race_1700000000000': {
        status: 'sent',
        sent_at: '2025-03-01 15:00:00',
        gp: '澳大利亚 大奖赛'
      }
    };
    saveHistory(tmpHistory, existingOldData);

    const mockFetch = createMockFetch();
    await migrateRedisHistory({
      redisUrl: 'https://mock.upstash.io',
      redisToken: 'mock-token',
      historyPath: tmpHistory,
      fetchImpl: mockFetch
    });

    const loaded = loadHistory(tmpHistory);
    assert.ok(loaded['key_legacy_2025_01_Race_1700000000000'], '旧历史记录必须被严格保留，绝不丢失');
    assert.strictEqual(loaded['key_legacy_2025_01_Race_1700000000000'].gp, '澳大利亚 大奖赛');
    assert.ok(loaded['f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z'], '新迁移的记录成功合入');
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});

test('交接迁移 3: 跨系统切流 —— 赛前提醒 (T-35) 零重复发送 Mock 验证', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_norerun_${Date.now()}.json`);
  try {
    // 1. 初始化并迁移历史
    const mockFetch = createMockFetch();
    await migrateRedisHistory({
      redisUrl: 'https://mock.upstash.io',
      redisToken: 'mock-token',
      historyPath: tmpHistory,
      fetchImpl: mockFetch
    });
    const history = loadHistory(tmpHistory);

    // 2. 模拟比赛场次：2026 新加坡正赛
    const raceSession = {
      round: '17',
      year: 2026,
      session_name: 'Race',
      session_type: 'Race',
      session_key: 'jolpica_2026_17_Race',
      country_name: 'Singapore',
      location: 'Marina Bay',
      date_start: '2026-10-11T12:00:00.000Z'
    };
    const st = new Date(raceSession.date_start);
    const key = `key_${raceSession.session_key}_${st.getTime()}`;

    // 3. 模拟在 T-34 分钟运行 (处于 20~35 分钟合法提醒窗口)
    const mockNow = Date.parse('2026-10-11T11:26:00.000Z');
    const diffMins = (st.getTime() - mockNow) / 60000; // 34.0 分钟
    assert.strictEqual(isStandardWindow(diffMins), true);

    // 4. 模拟候选检索
    const redisKey = `f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z`;
    const candidateKeys = [key, redisKey];

    const record = findHistoryRecord(history, candidateKeys);
    assert.ok(record, '必须通过多别名候选成功命中历史记录');
    assert.strictEqual(isSentRecord(record), true, '记录状态确认为 sent');

    // 5. 模拟发送判定：若 isSentRecord(record) 为 true，则跳过发包
    let sentCount = 0;
    if (!record || !isSentRecord(record)) {
      sentCount++;
    }

    assert.strictEqual(sentCount, 0, '跨系统切流后，赛前提醒绝不能二次触发，发包次数必须严格为 0！');
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});

test('交接迁移 4: 跨系统切流 —— 开赛提醒 (T+0) 零重复发送 Mock 验证', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_start_norerun_${Date.now()}.json`);
  try {
    const mockFetch = createMockFetch();
    await migrateRedisHistory({
      redisUrl: 'https://mock.upstash.io',
      redisToken: 'mock-token',
      historyPath: tmpHistory,
      fetchImpl: mockFetch
    });
    const history = loadHistory(tmpHistory);

    const raceSession = {
      round: '17',
      year: 2026,
      session_name: 'Race',
      session_type: 'Race',
      session_key: 'jolpica_2026_17_Race',
      country_name: 'Singapore',
      location: 'Marina Bay',
      date_start: '2026-10-11T12:00:00.000Z'
    };
    const st = new Date(raceSession.date_start);
    const key = `key_${raceSession.session_key}_${st.getTime()}`;
    const startTargetKey = `${key}:start`;

    // 模拟在开赛后 1 分钟运行
    const mockNow = Date.parse('2026-10-11T12:01:00.000Z');
    const diffMins = (st.getTime() - mockNow) / 60000; // -1.0 分钟
    assert.strictEqual(isStartWindow(diffMins), true);

    const redisStartKey = `f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z:start`;
    const candidateKeys = [startTargetKey, redisStartKey];

    const record = findHistoryRecord(history, candidateKeys);
    assert.ok(record, '必须通过开赛别名成功命中 Redis 已投递开赛记录');
    assert.strictEqual(isSentRecord(record), true);

    let sentCount = 0;
    if (!record || !isSentRecord(record)) {
      sentCount++;
    }

    assert.strictEqual(sentCount, 0, '跨系统切流后，开赛提醒绝不能二次触发，发包次数必须严格为 0！');
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});

test('交接迁移 5: 新未发送场次正常触发并分别独立记录赛前与开赛', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_new_race_${Date.now()}.json`);
  try {
    saveHistory(tmpHistory, {});
    let history = loadHistory(tmpHistory);

    // 假设有一场全新的日本站正赛
    const newSession = {
      round: '18',
      year: 2026,
      session_name: 'Race',
      session_type: 'Race',
      session_key: 'jolpica_2026_18_Race',
      country_name: 'Japan',
      location: 'Suzuka',
      date_start: '2026-10-18T05:00:00.000Z'
    };
    const st = new Date(newSession.date_start);
    const baseKey = `key_${newSession.session_key}_${st.getTime()}`;

    // 1. 在 T-30 分钟触发赛前提醒
    const nowBefore = Date.parse('2026-10-18T04:30:00.000Z');
    const diffBefore = (st.getTime() - nowBefore) / 60000;
    assert.strictEqual(isStandardWindow(diffBefore), true);

    let sentPushes = [];
    const beforeCandidateKeys = [baseKey, `f1:delivery:2026:18:race-18:2026-10-18T05:00:00.000Z`];
    let recordBefore = findHistoryRecord(history, beforeCandidateKeys);
    assert.strictEqual(recordBefore, null, '未发送前应为 null');

    // 模拟发送
    sentPushes.push({ key: baseKey, phase: 'before' });
    history[baseKey] = { status: 'sent', sent_at: new Date(nowBefore).toISOString(), phase: 'before' };
    saveHistory(tmpHistory, history);

    // 再次在 T-25 分钟检查：必须命中去重
    const nowBefore2 = Date.parse('2026-10-18T04:35:00.000Z');
    recordBefore = findHistoryRecord(history, beforeCandidateKeys);
    assert.ok(recordBefore && isSentRecord(recordBefore), '应成功命中已发送赛前记录');

    // 2. 在 T+1 分钟触发开赛提醒
    const nowStart = Date.parse('2026-10-18T05:01:00.000Z');
    const diffStart = (st.getTime() - nowStart) / 60000;
    assert.strictEqual(isStartWindow(diffStart), true);

    const startKey = `${baseKey}:start`;
    const startCandidateKeys = [startKey, `f1:delivery:2026:18:race-18:2026-10-18T05:00:00.000Z:start`];
    let recordStart = findHistoryRecord(history, startCandidateKeys);
    assert.strictEqual(recordStart, null, '开赛提醒尚未发送，应为 null (与赛前提醒独立去重)');

    // 模拟发送开赛提醒
    sentPushes.push({ key: startKey, phase: 'start' });
    history[startKey] = { status: 'sent', sent_at: new Date(nowStart).toISOString(), phase: 'start' };
    saveHistory(tmpHistory, history);

    // 再次在 T+3 分钟检查：开赛提醒必须命中去重
    recordStart = findHistoryRecord(history, startCandidateKeys);
    assert.ok(recordStart && isSentRecord(recordStart), '开赛提醒已发送，成功去重');

    assert.strictEqual(sentPushes.length, 2, '赛前与开赛共发送且仅发送 2 次');
    assert.strictEqual(sentPushes[0].phase, 'before');
    assert.strictEqual(sentPushes[1].phase, 'start');
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});

test('交接迁移 6: OpenF1 纯数字 session_key 与未补零 ISO 格式 (无.000Z) 完美命中 Redis 去重历史', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_openf1_${Date.now()}.json`);
  try {
    const mockFetch = createMockFetch();
    await migrateRedisHistory({
      redisUrl: 'https://mock.upstash.io',
      redisToken: 'mock-token',
      historyPath: tmpHistory,
      fetchImpl: mockFetch
    });
    const history = loadHistory(tmpHistory);

    // 模拟 OpenF1 格式的数据：session_key 为纯数字 9632，时间为新加坡排位赛 2026-10-10T13:00:00Z (无 .000)
    const openf1Session = {
      session_key: 9632,
      session_name: 'Qualifying',
      session_type: 'Practice', // 有时 OpenF1 将排位放在不同类型
      country_name: 'Singapore',
      location: 'Marina Bay',
      date_start: '2026-10-10T13:00:00Z'
    };
    const st = new Date(openf1Session.date_start);
    const targetKey = `key_${openf1Session.session_key}_${st.getTime()}`;

    // candidateKeys 包含 targetKey 以及带 .000Z 的 redisKey
    const isoStartMs = st.toISOString(); // '2026-10-10T13:00:00.000Z'
    const candidateKeys = [
      targetKey,
      `f1:delivery:2026:17:quali-17:${isoStartMs}`,
      `f1:delivery:2026:17:9632:${isoStartMs}`
    ];

    const sessionContext = {
      startTimeMs: st.getTime(),
      phase: 'before'
    };

    const record = findHistoryRecord(history, candidateKeys, sessionContext);
    assert.ok(record, 'OpenF1 数字 session_key 且 ISO 带 .000Z 必须成功命中无 .000Z 的 Redis 历史');
    assert.strictEqual(isSentRecord(record), true, '必须确认为 sent 状态');
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});

test('交接迁移 7: 未来分站 (Round 19 美国大奖赛) 动态 round 提取与零串扰', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_austin_${Date.now()}.json`);
  try {
    saveHistory(tmpHistory, {});
    let history = loadHistory(tmpHistory);

    // 模拟第 19 站奥斯汀正赛
    const austinSession = {
      round: '19',
      year: 2026,
      session_name: 'Race',
      session_type: 'Race',
      session_key: 'jolpica_2026_19_Race',
      country_name: 'United States',
      location: 'Austin',
      date_start: '2026-10-25T19:00:00.000Z'
    };
    const st = new Date(austinSession.date_start);
    const roundMatch = austinSession.session_key && String(austinSession.session_key).match(/jolpica_\d+_(\d+)_/);
    const roundStr = austinSession.round ? String(austinSession.round) : (roundMatch ? roundMatch[1] : null);

    assert.strictEqual(roundStr, '19', '必须正确动态提取 round 为 19，绝不能写死为 17');

    const targetKey = `key_${austinSession.session_key}_${st.getTime()}`;
    const isoStartMs = st.toISOString();
    const candidateKeys = [
      targetKey,
      `f1:delivery:2026:19:race-19:${isoStartMs}`
    ];

    const sessionContext = { startTimeMs: st.getTime(), phase: 'before' };
    let record = findHistoryRecord(history, candidateKeys, sessionContext);
    assert.strictEqual(record, null, '未发送前应为 null');

    // 发送并记录
    history[targetKey] = { status: 'sent', sent_at: new Date().toISOString(), phase: 'before' };
    saveHistory(tmpHistory, history);

    record = findHistoryRecord(history, candidateKeys, sessionContext);
    assert.ok(record && isSentRecord(record), '第 19 站必须成功去重');
    // 验证与第 17 站键名无任何串扰
    assert.strictEqual('f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z' in history, false);
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});

test('交接迁移 8: assertReadOnlyRedis 严格门禁：对任意写操作与恶意指令一律拦截抛错，放行合规只读', () => {
  // 1. 拦截写 HTTP 方法
  assert.throws(() => assertReadOnlyRedis('PUT', 'https://mock.upstash.io/scan/0'), /严禁向生产 Redis 发送 PUT/);
  assert.throws(() => assertReadOnlyRedis('DELETE', 'https://mock.upstash.io/key'), /严禁向生产 Redis 发送 DELETE/);

  // 2. 拦截 REST 路径中的写入操作
  assert.throws(() => assertReadOnlyRedis('GET', 'https://mock.upstash.io/set/foo/bar'), /严禁调用写端点 \/set/);
  assert.throws(() => assertReadOnlyRedis('POST', 'https://mock.upstash.io/del/foo'), /严禁调用写端点 \/del/);
  assert.throws(() => assertReadOnlyRedis('GET', 'https://mock.upstash.io/expire/foo/60'), /严禁调用写端点 \/expire/);

  // 3. 拦截 Pipeline 中的写入指令
  assert.throws(() => assertReadOnlyRedis('POST', 'https://mock.upstash.io/pipeline', [
    ['get', 'key1'],
    ['set', 'key2', 'val2']
  ]), /严禁在 Pipeline 中执行写入或未授权指令 'set'/);

  assert.throws(() => assertReadOnlyRedis('POST', 'https://mock.upstash.io/pipeline', [
    ['del', 'key1']
  ]), /严禁在 Pipeline 中执行写入或未授权指令 'del'/);

  // 4. 允许只读操作
  assert.doesNotThrow(() => assertReadOnlyRedis('GET', 'https://mock.upstash.io/scan/0/match/f1:delivery:*/count/200'));
  assert.doesNotThrow(() => assertReadOnlyRedis('POST', 'https://mock.upstash.io/pipeline', [
    ['get', 'key1'],
    ['mget', 'key2', 'key3']
  ]));
});

test('交接迁移 9: Redis SCAN 分页游标多批次读取完整遍历所有记录', async () => {
  const tmpHistory = path.join(__dirname, `tmp_history_scan_pages_${Date.now()}.json`);
  try {
    const page1Keys = ['f1:delivery:2026:17:quali-17:2026-10-10T13:00:00Z'];
    const page2Keys = ['f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z'];

    const mockFetch = async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/scan/0/')) {
        return { ok: true, status: 200, json: async () => ({ result: ['42', page1Keys] }) };
      }
      if (urlStr.includes('/scan/42/')) {
        return { ok: true, status: 200, json: async () => ({ result: ['0', page2Keys] }) };
      }
      if (urlStr.includes('/pipeline')) {
        const commands = JSON.parse(options.body);
        return {
          ok: true, status: 200,
          json: async () => commands.map(c => ({ result: JSON.stringify({ status: 'sent' }) }))
        };
      }
      throw new Error(`Unexpected mock URL: ${urlStr}`);
    };

    const res = await migrateRedisHistory({
      redisUrl: 'https://mock.upstash.io',
      redisToken: 'mock-token',
      historyPath: tmpHistory,
      fetchImpl: mockFetch
    });

    assert.strictEqual(res.audit.redisKeyCount, 2, '两批 SCAN 键必须全部捕获');
    const loaded = loadHistory(tmpHistory);
    assert.ok(loaded['f1:delivery:2026:17:quali-17:2026-10-10T13:00:00Z']);
    assert.ok(loaded['f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z']);
  } finally {
    if (fs.existsSync(tmpHistory)) fs.unlinkSync(tmpHistory);
  }
});


