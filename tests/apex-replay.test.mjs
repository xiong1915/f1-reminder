// tests/apex-replay.test.mjs
// APEX REPLAY 比赛动态回放与 APEX LIVE 接口架构回归测试套件

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SINGAPORE_REPLAY, buildSingaporeReplayDataset } from '../lib/f1/replay/sample-sessions.ts';

test('APEX REPLAY 数据结构与回放动力学完整性', async (t) => {
  const { metadata, frames } = DEFAULT_SINGAPORE_REPLAY;

  await t.test('1. 赛道元数据与 DRS 区域完整性', () => {
    assert.ok(metadata.id, '会话 ID 必须存在');
    assert.strictEqual(metadata.circuitId, 'marina_bay');
    assert.strictEqual(metadata.round, 17);
    assert.ok(metadata.trackPath.length >= 20, '赛道点列必须覆盖足够几何分辨率');
    assert.ok(metadata.corners.length >= 8, '关键弯角标记必须存在');
    assert.ok(metadata.drsZones.length >= 2, '必须定义至少 2 个 DRS 区域');

    // 坐标必须位于 0..1 归一化视口内部
    metadata.trackPath.forEach(([x, y]) => {
      assert.ok(x >= 0 && x <= 1, `X 坐标越界: ${x}`);
      assert.ok(y >= 0 && y <= 1, `Y 坐标越界: ${y}`);
    });
  });

  await t.test('2. 帧序列与时序单调性', () => {
    assert.ok(frames.length > 0, '回放帧必须非空');
    assert.strictEqual(frames.length, metadata.totalFrames, '帧数必须等于元数据声明的总帧数');

    // 时序递增单调性检查
    let lastTime = -1;
    frames.forEach((f, idx) => {
      assert.strictEqual(f.frameIndex, idx);
      assert.ok(f.timestampMs >= lastTime, `时间戳未单调递增 at frame ${idx}`);
      lastTime = f.timestampMs;
      assert.ok(f.vehicles.length >= 10, '每帧至少包含 10 辆赛车遥测');
    });
  });

  await t.test('3. 车辆遥测物理约束 (速度、挡位与 DRS)', () => {
    const firstFrame = frames[0];
    firstFrame.vehicles.forEach(car => {
      assert.ok(car.driverNumber > 0, '车号必须为正整数');
      assert.ok(car.code.length === 3, '车手代号必须为 3 字母');
      assert.ok(car.speed >= 80 && car.speed <= 360, `速度超出合理 F1 赛车范围: ${car.speed} km/h`);
      assert.ok(car.gear >= 1 && car.gear <= 8, `挡位必须在 1-8 之间: G${car.gear}`);
      assert.strictEqual(typeof car.drs, 'boolean', 'DRS 状态必须为布尔值');
      assert.ok(car.normX >= 0 && car.normX <= 1, '归一化横坐标在 [0, 1]');
      assert.ok(car.normY >= 0 && car.normY <= 1, '归一化纵坐标在 [0, 1]');
    });
  });

  await t.test('4. 自定义时长生成器扩展性', () => {
    const custom = buildSingaporeReplayDataset(10, 5);
    assert.strictEqual(custom.metadata.durationSeconds, 10);
    assert.strictEqual(custom.metadata.fps, 5);
    assert.strictEqual(custom.frames.length, 50);
  });
});
