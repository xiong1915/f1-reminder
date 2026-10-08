// tests/date-rules.test.mjs
// 日期与时间规则自动化防退化测试套件：永久防止 "月月"、"日日"、"Invalid Date"、"NaN"、"undefined"

import test from 'node:test';
import assert from 'node:assert';
import {
  extractBeijingParts,
  formatDate,
  formatTime,
  formatDateTime,
  formatRaceRange,
  formatBeijingDisplay,
  getBeijingTime,
  calculateUtcDelta
} from '../lib/f1/time.ts';

test('日期时间格式化与异常字符防退化验证', async (t) => {
  const sampleUtc = '2026-10-09T08:30:00Z'; // 北京时间 16:30
  const sampleDate = new Date(sampleUtc);
  const sampleTimestamp = sampleDate.getTime();

  await t.test('1. extractBeijingParts 提取准确性与去重验证', () => {
    const parts = extractBeijingParts(sampleUtc);
    assert.ok(parts !== null);
    assert.strictEqual(parts.year, '2026');
    assert.strictEqual(parts.month, '10');
    assert.strictEqual(parts.day, '09');
    assert.strictEqual(parts.hour, '16');
    assert.strictEqual(parts.minute, '30');
    assert.ok(parts.weekdayShort.includes('周') || parts.weekdayShort.includes('五'));
  });

  await t.test('2. 杜绝 "月月" / "日日" / "Invalid Date" / "NaN" / "undefined"', () => {
    const testCases = [
      sampleUtc,
      sampleDate,
      sampleTimestamp,
      '2026-03-01T00:00:00Z',
      '2026-12-31T23:59:59Z'
    ];

    for (const input of testCases) {
      const d1 = formatDate(input, true);
      const d2 = formatDate(input, false);
      const t1 = formatTime(input);
      const dt = formatDateTime(input, true);
      const bd = formatBeijingDisplay(input);
      const bt = getBeijingTime(input);

      const allFormatted = [d1, d2, t1, dt, bd, bt];
      for (const str of allFormatted) {
        assert.ok(!str.includes('月月'), `字符串 "${str}" 不得包含 "月月"`);
        assert.ok(!str.includes('日日'), `字符串 "${str}" 不得包含 "日日"`);
        assert.ok(!str.includes('Invalid Date'), `字符串 "${str}" 不得包含 "Invalid Date"`);
        assert.ok(!str.includes('NaN'), `字符串 "${str}" 不得包含 "NaN"`);
        assert.ok(!str.includes('undefined'), `字符串 "${str}" 不得包含 "undefined"`);
      }
    }
  });

  await t.test('3. formatRaceRange 跨度格式化', () => {
    // 同月跨度
    const sameMonth = formatRaceRange('2026-10-09T08:00:00Z', '2026-10-11T12:00:00Z');
    assert.strictEqual(sameMonth, '10月09日 - 11日');
    assert.ok(!sameMonth.includes('月月') && !sameMonth.includes('日日'));

    // 跨月跨度
    const crossMonth = formatRaceRange('2026-04-30T08:00:00Z', '2026-05-02T12:00:00Z');
    assert.strictEqual(crossMonth, '04月30日 - 05月02日');
    assert.ok(!crossMonth.includes('月月') && !crossMonth.includes('日日'));
  });

  await t.test('4. 非法输入的安全兜底能力', () => {
    const invalidInputs = [null, '', 'not-a-date', NaN];
    for (const inv of invalidInputs) {
      assert.strictEqual(formatDate(inv), '待定');
      assert.strictEqual(formatTime(inv), '待定');
      assert.strictEqual(formatDateTime(inv), '时间待定');
      assert.strictEqual(formatBeijingDisplay(inv), '待定');
      assert.strictEqual(getBeijingTime(inv), '待定');
    }
    assert.strictEqual(formatDate(undefined), '待定');
    assert.strictEqual(formatTime(undefined), '待定');
    assert.strictEqual(formatDateTime(undefined), '时间待定');
    assert.strictEqual(formatBeijingDisplay(undefined), '待定');
    // getBeijingTime() 无参数或 undefined 时默认返回当前北京时间
    const currentBt = getBeijingTime();
    assert.ok(currentBt.includes('年') && currentBt.includes('月') && currentBt.includes('日'));
    assert.ok(!currentBt.includes('月月') && !currentBt.includes('日日'));
    assert.strictEqual(formatRaceRange('invalid', 'also-invalid'), '日期待定');
  });

  await t.test('5. calculateUtcDelta 倒计时无漂移与负数边界', () => {
    const now = 1000000000000;
    // 过去时间
    const past = calculateUtcDelta(now - 5000, now);
    assert.strictEqual(past.isPast, true);
    assert.strictEqual(past.totalMs, 0);
    assert.strictEqual(past.secs, '00');

    // 精确倒计时
    const future = calculateUtcDelta(now + (2 * 86400000 + 3 * 3600000 + 15 * 60000 + 42000), now);
    assert.strictEqual(future.isPast, false);
    assert.strictEqual(future.days, '02');
    assert.strictEqual(future.hours, '03');
    assert.strictEqual(future.mins, '15');
    assert.strictEqual(future.secs, '42');
  });
});
