// scripts/migrate-history.js - 生产历史只读核对与安全交接迁移工具
// 核心原则：严格只读核对生产 Redis，未经最终授权绝不向生产 Redis 发送任何写指令！
const fs = require('fs');
const path = require('path');
const { loadHistory, saveHistory, mergeHistory, normalizeHistoryKeys } = require('../src/history');

/**
 * 将单个 Redis 键与数据映射为 history.json 的记录字典（包含双格式键索引）
 * @param {string} redisKey 格式如 f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z 或 ...:start
 * @param {object} value 格式如 { status: 'sent', updatedAt: '...' }
 */
function mapRedisKeyToHistoryRecords(redisKey, value) {
  const records = {};
  if (!redisKey || !redisKey.startsWith('f1:delivery:')) return records;

  const isStart = redisKey.endsWith(':start');
  const cleanKey = isStart ? redisKey.slice(0, -6) : redisKey;
  const parts = cleanKey.split(':'); // ['f1', 'delivery', season, round, sessionId, startTimeUTC]
  
  if (parts.length >= 6) {
    const season = parts[2];
    const round = parts[3];
    const sessionId = parts[4];
    const startTimeUTC = parts.slice(5).join(':');
    const startMs = Date.parse(startTimeUTC);

    const recordPayload = {
      status: value.status || 'sent',
      sent_at: value.updatedAt || value.sent_at || new Date().toISOString(),
      source: 'redis_migration',
      redis_key: redisKey,
      season,
      round,
      session_id: sessionId,
      start_time_utc: startTimeUTC,
      phase: isStart ? 'start' : 'before'
    };

    // 1. 保留原始 Redis key 作为索引
    records[redisKey] = { ...recordPayload };

    // 2. 映射为 Jolpica / reminder.js 规范化键名
    if (Number.isFinite(startMs)) {
      let sessionType = 'Session';
      if (sessionId.includes('race')) sessionType = 'Race';
      else if (sessionId.includes('quali')) sessionType = 'Qualifying';
      else if (sessionId.includes('sprint')) sessionType = 'Sprint';
      else if (sessionId.includes('fp1') || sessionId.includes('practice-1')) sessionType = 'FirstPractice';

      const suffix = isStart ? ':start' : '';
      const jolpicaKey = `key_jolpica_${season}_${round}_${sessionType}_${startMs}${suffix}`;
      const genericKey = `key_${season}_${round}_${sessionId}_${startMs}${suffix}`;

      records[jolpicaKey] = { ...recordPayload };
      records[genericKey] = { ...recordPayload };
    }
  } else {
    records[redisKey] = {
      status: value.status || 'sent',
      sent_at: value.updatedAt || new Date().toISOString(),
      source: 'redis_migration',
      redis_key: redisKey
    };
  }

  return records;
}

const READ_ONLY_REDIS_COMMANDS = new Set([
  'get', 'mget', 'scan', 'keys', 'ttl', 'pttl', 'exists', 'type',
  'hget', 'hgetall', 'hmget', 'hlen', 'hexists', 'hkeys', 'hvals',
  'lindex', 'llen', 'lrange', 'scard', 'sismember', 'smembers', 'zcard', 'zscore', 'zrange'
]);

/**
 * 严格只读检查安全门禁：确保传入的 fetch 或请求不会对 Redis 执行任何写操作
 */
function assertReadOnlyRedis(method, urlStr, body = null) {
  const m = String(method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'HEAD'].includes(m)) {
    throw new Error(`[安全红线拦截] 严禁向生产 Redis 发送 ${m} 请求！仅允许只读操作`);
  }

  const u = new URL(urlStr, 'https://redis.internal');
  const pathParts = u.pathname.split('/').filter(Boolean);
  const firstPath = (pathParts[0] || '').toLowerCase();

  const FORBIDDEN_REST_ENDPOINTS = ['set', 'del', 'expire', 'pexpire', 'hset', 'hdel', 'flushall', 'flushdb', 'unlink', 'mset', 'incr', 'decr'];
  if (FORBIDDEN_REST_ENDPOINTS.includes(firstPath)) {
    throw new Error(`[安全红线拦截] 严禁调用写端点 /${firstPath}！`);
  }

  if (['pipeline', 'multi'].includes(firstPath) && body) {
    let commands = [];
    try {
      commands = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (_) {
      throw new Error('[安全红线拦截] 无法解析 Redis Pipeline 请求体，拒绝非白名单指令');
    }
    if (Array.isArray(commands)) {
      for (const cmd of commands) {
        const cmdName = (Array.isArray(cmd) ? cmd[0] : (typeof cmd === 'string' ? cmd.split(' ')[0] : '')).toLowerCase();
        if (!READ_ONLY_REDIS_COMMANDS.has(cmdName)) {
          throw new Error(`[安全红线拦截] 严禁在 Pipeline 中执行写入或未授权指令 '${cmdName}'！`);
        }
      }
    }
  }
}

/**
 * 执行生产历史只读核对与比对
 */
async function auditRedisHistory(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const redisUrl = options.redisUrl || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = options.redisToken || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const historyPath = options.historyPath || path.join(__dirname, '..', 'history.json');

  if (!redisUrl || !redisToken) {
    throw new Error('缺少 Redis 连接凭据 (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)，无法核对历史！');
  }

  console.log(`🔍 [只读核对] 正在连接 Upstash Redis (${redisUrl}) 执行只读比对...`);

  // 1. 只读扫描 f1:delivery:* 键 (支持游标分页遍历)
  let cursor = '0';
  const keys = [];
  do {
    const scanUrl = `${redisUrl}/scan/${cursor}/match/f1:delivery:*/count/200`;
    assertReadOnlyRedis('GET', scanUrl);
    const scanRes = await fetchImpl(scanUrl, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
    if (!scanRes.ok) {
      throw new Error(`Redis SCAN 失败 HTTP ${scanRes.status}`);
    }
    const scanData = await scanRes.json();
    cursor = scanData.result ? String(scanData.result[0]) : '0';
    const batch = (scanData.result && scanData.result[1]) || [];
    keys.push(...batch);
  } while (cursor !== '0' && cursor !== '');

  console.log(`📊 [只读扫描] 发现 ${keys.length} 条已投递/去重 Redis 键。`);

  // 2. 只读 Pipeline 批量读取键值 (只读 GET 操作)
  let redisRecords = {};
  if (keys.length > 0) {
    const readCommands = keys.map(k => ['get', k]);
    assertReadOnlyRedis('POST', `${redisUrl}/pipeline`, readCommands);
    const pipeRes = await fetchImpl(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(readCommands)
    });
    if (!pipeRes.ok) {
      throw new Error(`Redis Pipeline 读取失败 HTTP ${pipeRes.status}`);
    }
    const pipeData = await pipeRes.json();

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      let val = pipeData[i]?.result;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch (_) { val = { status: val }; }
      }
      if (!val || typeof val !== 'object') {
        val = { status: 'sent', updatedAt: new Date().toISOString() };
      }
      const mapped = mapRedisKeyToHistoryRecords(k, val);
      Object.assign(redisRecords, mapped);
    }
  }

  // 3. 读取本地现有 history.json
  let localRecords = {};
  if (fs.existsSync(historyPath)) {
    try {
      localRecords = normalizeHistoryKeys(loadHistory(historyPath));
    } catch (e) {
      console.warn(`[核对警告] 本地 history.json 读取异常: ${e.message}`);
    }
  }

  const localKeys = Object.keys(localRecords);
  const redisMappedKeys = Object.keys(redisRecords);

  // 4. 比对分析
  const overlapKeys = redisMappedKeys.filter(k => Boolean(localRecords[k]));
  const redisOnlyKeys = redisMappedKeys.filter(k => !localRecords[k]);
  const localOnlyKeys = localKeys.filter(k => !redisRecords[k]);

  const auditReport = {
    mode: 'READ_ONLY_AUDIT',
    redisKeyCount: keys.length,
    redisMappedCount: redisMappedKeys.length,
    localRecordCount: localKeys.length,
    overlapCount: overlapKeys.length,
    redisOnlyCount: redisOnlyKeys.length,
    localOnlyCount: localOnlyKeys.length,
    redisWritesAttempted: 0,
    isAligned: redisOnlyKeys.length === 0
  };

  console.log(`--------------------------------------------------`);
  console.log(`📋 [历史只读核对报告]`);
  console.log(`- 生产 Redis 投递键总数: ${keys.length}`);
  console.log(`- 映射后记录条数: ${redisMappedKeys.length}`);
  console.log(`- 本地 history.json 记录数: ${localKeys.length}`);
  console.log(`- 两端完全一致/重合键数: ${overlapKeys.length}`);
  console.log(`- 仅在 Redis 中存在 (待同步): ${redisOnlyKeys.length}`);
  console.log(`- 仅在本地存在 (本地独有): ${localOnlyKeys.length}`);
  console.log(`- 生产 Redis 写操作次数: 0 (严格只读，零写入)`);
  console.log(`--------------------------------------------------`);

  return {
    ...auditReport,
    redisRecords,
    localRecords,
    redisOnlyKeys,
    localOnlyKeys
  };
}

/**
 * 安全同步迁移（仅在明确指示下写入本地文件，绝不写入生产 Redis）
 */
async function migrateRedisHistory(options = {}) {
  const audit = await auditRedisHistory(options);
  const historyPath = options.historyPath || path.join(__dirname, '..', 'history.json');
  const writeLocal = options.writeLocal !== undefined ? options.writeLocal : true;

  if (writeLocal) {
    const merged = mergeHistory(audit.localRecords, audit.redisRecords);
    saveHistory(historyPath, merged);
    const totalCount = Object.keys(merged).length;
    console.log(`💾 [本地同步] 已安全保存至 ${historyPath}，共计 ${totalCount} 条去重记录（未向生产 Redis 执行任何写入）。`);
    return {
      migratedCount: audit.redisMappedCount,
      totalRecords: totalCount,
      audit
    };
  } else {
    console.log(`ℹ️ [只读模式] 未启用本地写盘 (--write-local 未指定)，保持本地文件未变动。`);
    return {
      migratedCount: audit.redisMappedCount,
      totalRecords: audit.localRecordCount,
      audit
    };
  }
}

module.exports = {
  mapRedisKeyToHistoryRecords,
  auditRedisHistory,
  migrateRedisHistory,
  assertReadOnlyRedis
};

if (require.main === module) {
  const envLocal = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envLocal)) {
    const lines = fs.readFileSync(envLocal, 'utf-8').split('\n');
    for (const l of lines) {
      const match = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  }

  const args = process.argv.slice(2);
  const writeLocal = args.includes('--write-local');

  if (writeLocal) {
    console.log('[执行模式] 授权写入本地 history.json (对生产 Redis 仍严格只读)');
    migrateRedisHistory({ writeLocal: true })
      .then(res => console.log('完成:', { migrated: res.migratedCount, total: res.totalRecords }))
      .catch(err => {
        console.error('[迁移错误]', err);
        process.exit(1);
      });
  } else {
    console.log('[默认模式] 执行只读核对 (不写入本地文件，不写入生产 Redis)');
    auditRedisHistory()
      .then(report => console.log('核对完成:', { redis: report.redisKeyCount, local: report.localRecordCount, aligned: report.isAligned }))
      .catch(err => {
        console.error('[核对错误]', err);
        process.exit(1);
      });
  }
}
