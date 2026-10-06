// tests/timing.test.js - 提醒时间窗口边界与判定逻辑测试
const test = require('node:test');
const assert = require('node:assert');
const {
  WINDOW_STANDARD_MIN,
  WINDOW_STANDARD_MAX,
  WINDOW_CATCHUP_MAX,
  isStandardWindow,
  isCatchupWindow,
  isTimingMatched
} = require('../src/timing');

test('Timing: 常量定义保持完全一致', () => {
  assert.strictEqual(WINDOW_STANDARD_MIN, 20.0);
  assert.strictEqual(WINDOW_STANDARD_MAX, 35.0);
  assert.strictEqual(WINDOW_CATCHUP_MAX, 20.0);
});

test('Timing: 标准 30 分钟窗口边界 [20.0, 35.0] 精确匹配', () => {
  assert.strictEqual(isStandardWindow(19.9), false, '19.9m 低于标准下限');
  assert.strictEqual(isStandardWindow(20.0), true, '20.0m 命中标准下限（闭区间）');
  assert.strictEqual(isStandardWindow(30.0), true, '30.0m 命中标准窗口');
  assert.strictEqual(isStandardWindow(35.0), true, '35.0m 命中标准上限（闭区间）');
  assert.strictEqual(isStandardWindow(35.1), false, '35.1m 超过标准上限');
});

test('Timing: 补发/备用窗口边界 (0, 20.0) 精确匹配', () => {
  assert.strictEqual(isCatchupWindow(0.0), false, '0.0m 已开赛，拒绝补发');
  assert.strictEqual(isCatchupWindow(-1.0), false, '已开赛场次坚决不补发');
  assert.strictEqual(isCatchupWindow(0.1), true, '0.1m 开赛在即，允许紧急补发');
  assert.strictEqual(isCatchupWindow(15.0), true, '15.0m 备用触发窗口，允许补发');
  assert.strictEqual(isCatchupWindow(19.9), true, '19.9m 命中补发窗口上限');
  assert.strictEqual(isCatchupWindow(20.0), false, '20.0m 为开区间边界，不属于 catch-up (转入 standard)');
});

test('Timing: 综合匹配器 isTimingMatched 覆盖合法提醒区间 (0, 35.0]', () => {
  assert.strictEqual(isTimingMatched(-5), false);
  assert.strictEqual(isTimingMatched(0), false);
  assert.strictEqual(isTimingMatched(10), true);
  assert.strictEqual(isTimingMatched(20), true);
  assert.strictEqual(isTimingMatched(30), true);
  assert.strictEqual(isTimingMatched(35), true);
  assert.strictEqual(isTimingMatched(36), false);
});
