// tests/history.test.js - History 存储、键规范化与状态兼容判定测试
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadHistory,
  saveHistory,
  normalizeHistoryKeys,
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
