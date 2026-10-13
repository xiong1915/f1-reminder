// tests/history.test.js - History 存储、键规范化与状态兼容判定测试
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadHistory,
  saveHistory,
  normalizeHistoryKeys,
  findHistoryRecord,
  mergeHistory,
  isSentRecord,
  isUncertainRecord
} = require('../src/history');


test('History: 正常读写与安全写盘', () => {
  const tmpFile = path.join(__dirname, `tmp_history_${Date.now()}.json`);
  try {
    const data = { 'key_123_456': { status: 'sent', sent_at: '2026-10-09 16:00:00' } };
    saveHistory(tmpFile, data);
    const loaded = loadHistory(tmpFile);
    assert.deepStrictEqual(loaded, data);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test('History: 空文件或损坏 JSON 拒绝静默忽略并备份', () => {
  const emptyFile = path.join(__dirname, `empty_history_${Date.now()}.json`);
  fs.writeFileSync(emptyFile, '', 'utf-8');
  assert.throws(() => {
    loadHistory(emptyFile);
  }, /文件 .* 存在但为空文件/);
  // 清理
  try { fs.unlinkSync(emptyFile); } catch (_) {}
  const corruptFiles = fs.readdirSync(__dirname).filter(f => f.startsWith(`empty_history_`) && f.includes('.corrupt.'));
  corruptFiles.forEach(f => {
    try { fs.unlinkSync(path.join(__dirname, f)); } catch (_) {}
  });
});

test('History: 兼容旧版无 status 记录作为 legacy sent', () => {
  const legacyRecord = {
    sent_at: '2026-10-09 16:00:00',
    mode: 'standard',
    gp: '新加坡 大奖赛'
  };
  assert.strictEqual(isSentRecord(legacyRecord), true, '无 status 字段的旧记录必须被识别为已发送');
  assert.strictEqual(isUncertainRecord(legacyRecord), false, '旧记录不能被误判为 uncertain');

  const newSentRecord = { status: 'sent', sent_at: '2026-10-09 16:00:00' };
  assert.strictEqual(isSentRecord(newSentRecord), true);

  const uncertainRecord = { status: 'uncertain', attempted_at: '2026-10-09 16:00:00' };
  assert.strictEqual(isSentRecord(uncertainRecord), false, 'uncertain 记录绝不能判为已发送');
  assert.strictEqual(isUncertainRecord(uncertainRecord), true, '必须精确识别 uncertain 状态');
});

test('History: 旧版键名平滑规范化至 UTC 毫秒', () => {
  const oldHistory = {
    '11378': { stStr: '2026-10-09 16:30:00' },
    'singapore_fp1_2026-10-09T08:30:00.000Z': { sent_at: '2026-10-09 16:00:00' }
  };
  const normalized = normalizeHistoryKeys(oldHistory);
  assert.strictEqual('11378' in normalized, false, '纯数字旧键已被清理');
  assert.strictEqual('singapore_fp1_2026-10-09T08:30:00.000Z' in normalized, false, 'ISO字符串旧键已被清理');
  
  const keys = Object.keys(normalized);
  assert.strictEqual(keys.length, 2);
  assert.strictEqual(keys.every(k => /_\d{12,14}$/.test(k)), true, '所有键名均规范化为末尾毫秒时间戳');
});

test('History: 赛程改期 (date_start 改变) 生成新 key 且不受旧历史阻断', () => {
  const baseId = 'key_11378';
  const originalStartMs = Date.parse('2026-10-09T08:30:00.000Z');
  const rescheduledStartMs = Date.parse('2026-10-09T09:30:00.000Z');

  const oldKey = `${baseId}_${originalStartMs}`;
  const newKey = `${baseId}_${rescheduledStartMs}`;

  const history = {
    [oldKey]: { status: 'sent', sent_at: '2026-10-09 16:00:00' }
  };

  assert.strictEqual(isSentRecord(history[oldKey]), true, '原时间场次已发送');
  assert.strictEqual(newKey in history, false, '改期后的新 key 不在历史记录中，允许重新提醒');
});

test('History: 开赛 :start 后缀键规范化保留', () => {
  const oldHistory = {
    'singapore_fp1_2026-10-09T08:30:00.000Z:start': { status: 'sent', sent_at: '2026-10-09 16:30:00' }
  };
  const normalized = normalizeHistoryKeys(oldHistory);
  const keys = Object.keys(normalized);
  assert.strictEqual(keys.length, 1);
  assert.strictEqual(keys[0].endsWith(':start'), true, '规范化后保留 :start 后缀');
  assert.strictEqual(isSentRecord(normalized[keys[0]]), true);
});

test('History: mergeHistory 安全合并且不覆盖已确认 sent 记录', () => {
  const existing = {
    'key_1': { status: 'sent', sent_at: '2026-10-09 16:00:00', gp: '新加坡' },
    'key_2': { status: 'uncertain', attempted_at: '2026-10-09 16:05:00' }
  };
  const incoming = {
    'key_1': { status: 'uncertain', attempted_at: '2026-10-09 16:10:00' }, // 企图覆盖 sent -> 必须被拒绝
    'key_2': { status: 'sent', sent_at: '2026-10-09 16:15:00' }, // 企图将 uncertain 确认为 sent -> 允许升级
    'key_3': { status: 'sent', sent_at: '2026-10-09 16:20:00' } // 新增记录 -> 必须合并
  };
  const merged = mergeHistory(existing, incoming);
  assert.strictEqual(merged.key_1.status, 'sent', '已确认 sent 绝不能被降级覆盖为 uncertain');
  assert.strictEqual(merged.key_1.sent_at, '2026-10-09 16:00:00');
  assert.strictEqual(merged.key_2.status, 'sent', '允许从 uncertain 升级为 sent');
  assert.strictEqual(merged.key_3.status, 'sent', '新增记录成功加入');
});

test('History: findHistoryRecord 支持多别名候选键检索', () => {
  const history = {
    'key_jolpica_2026_17_Race_1791720000000': { status: 'sent', sent_at: '2026-10-11 19:25:00' }
  };
  const res1 = findHistoryRecord(history, ['f1:delivery:2026:17:race-17:2026-10-11T12:00:00.000Z', 'key_jolpica_2026_17_Race_1791720000000']);
  assert.ok(res1);
  assert.strictEqual(res1.status, 'sent');

  const res2 = findHistoryRecord(history, ['unknown_key_1', 'unknown_key_2']);
  assert.strictEqual(res2, null);
});

test('History: extractTimestampFromKey 正确解析多种键格式的时间戳', () => {
  const { extractTimestampFromKey } = require('../src/history');
  assert.strictEqual(extractTimestampFromKey('key_9632_1791637200000'), 1791637200000);
  assert.strictEqual(extractTimestampFromKey('key_9632_1791637200000:start'), 1791637200000);
  assert.strictEqual(extractTimestampFromKey('f1:delivery:2026:17:quali-17:2026-10-10T13:00:00Z'), 1791637200000);
  assert.strictEqual(extractTimestampFromKey('f1:delivery:2026:17:quali-17:2026-10-10T13:00:00.000Z:start'), 1791637200000);
});

test('History: findHistoryRecord 支持 ISO 毫秒变体容差与语义级时间戳匹配', () => {
  const history = {
    'f1:delivery:2026:17:quali-17:2026-10-10T13:00:00Z': {
      status: 'sent',
      sent_at: '2026-10-10T12:25:42.860Z',
      phase: 'before',
      start_time_utc: '2026-10-10T13:00:00Z'
    }
  };

  // 1. 查找带 .000Z 的键 -> 自动容差匹配
  const resIso = findHistoryRecord(history, ['f1:delivery:2026:17:quali-17:2026-10-10T13:00:00.000Z']);
  assert.ok(resIso, '带 .000Z 必须命中无 .000Z 的 Redis 键');
  assert.strictEqual(resIso.status, 'sent');

  // 2. 使用完全异构的 OpenF1 数字键名 -> 语义级时间戳匹配
  const resSemantic = findHistoryRecord(history, ['key_9632_1791637200000'], { startTimeMs: 1791637200000, phase: 'before' });
  assert.ok(resSemantic, '语义级时间戳匹配必须命中同一场次的记录');
  assert.strictEqual(resSemantic.status, 'sent');
});


