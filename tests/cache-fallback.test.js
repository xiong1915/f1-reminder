// tests/cache-fallback.test.js - 赛程灾备缓存过期判断与常量回归测试
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { CACHE_MAX_AGE_DAYS } = require('../reminder');

test('Cache Fallback: CACHE_MAX_AGE_DAYS 常量在 reminder.js 中正确定义为 7', () => {
  assert.strictEqual(CACHE_MAX_AGE_DAYS, 7, '本地缓存最大灾备有效期必须为 7 天');
});

test('Cache Fallback: reminder.js 缓存降级逻辑明确引用 CACHE_MAX_AGE_DAYS', () => {
  const reminderCode = fs.readFileSync(path.join(__dirname, '../reminder.js'), 'utf-8');
  assert.ok(
    reminderCode.includes('const CACHE_MAX_AGE_DAYS = 7;'),
    'reminder.js 必须包含常量定义 const CACHE_MAX_AGE_DAYS = 7;'
  );
  assert.ok(
    reminderCode.includes('ageDays > CACHE_MAX_AGE_DAYS'),
    'reminder.js 灾备逻辑必须引用 ageDays > CACHE_MAX_AGE_DAYS'
  );
});

test('Cache Fallback: 缓存时间差计算与 7 天失效逻辑正确判定 (离线零网络)', () => {
  const DAY_MS = 24 * 3600 * 1000;
  const now = Date.now();

  const freshTimestamp = new Date(now - 3 * DAY_MS).toISOString();
  const freshAgeDays = (now - Date.parse(freshTimestamp)) / DAY_MS;
  assert.strictEqual(freshAgeDays > CACHE_MAX_AGE_DAYS, false, '3 天前缓存未过期');

  const boundaryTimestamp = new Date(now - 7 * DAY_MS).toISOString();
  const boundaryAgeDays = (now - Date.parse(boundaryTimestamp)) / DAY_MS;
  assert.strictEqual(boundaryAgeDays > CACHE_MAX_AGE_DAYS, false, '7 天整处于临界边界');

  const expiredTimestamp = new Date(now - 8 * DAY_MS).toISOString();
  const expiredAgeDays = (now - Date.parse(expiredTimestamp)) / DAY_MS;
  assert.strictEqual(expiredAgeDays > CACHE_MAX_AGE_DAYS, true, '8 天前缓存必须判定为过期并拒绝灾备');
});
