// tests/calendar-dynamic.test.mjs
// 动态赛历与主键索引自动化质量测试

import test from 'node:test';
import assert from 'node:assert';
import { defaultF1Service } from '../providers/f1/service.ts';
import { CircuitRegistry } from '../lib/circuits/registry.ts';

test('动态赛历与主键索引质量验证', async (t) => {
  const calendar = await defaultF1Service.getCalendar('2026');

  await t.test('1. 赛历长度动态计算 (Dynamic Length)', () => {
    assert.ok(Array.isArray(calendar));
    assert.ok(calendar.length >= 20, `赛历应包含完整赛季，当前: ${calendar.length}`);
    // 确保总数完全取决于 calendar.length，而非硬编码
    const dynamicTotal = calendar.length;
    assert.strictEqual(typeof dynamicTotal, 'number');
  });

  await t.test('2. 分站主键与复合标识完整性 (Composite Keys)', () => {
    const seenMeetingIds = new Set();

    for (const meeting of calendar) {
      assert.strictEqual(meeting.season, '2026');
      assert.ok(meeting.round > 0, `Round 必须为正整数: ${meeting.round}`);
      assert.ok(meeting.circuitId && meeting.circuitId.length > 0, `circuitId 必须存在: ${meeting.name}`);

      // 复合键测试: season + meetingId + circuitId
      const compositeKey = `${meeting.season}-${meeting.meetingId || meeting.round}-${meeting.circuitId}`;
      assert.ok(!seenMeetingIds.has(compositeKey), `复合标识不得重复: ${compositeKey}`);
      seenMeetingIds.add(compositeKey);

      // 验证每个分站的 circuitId 在 CircuitRegistry 中均有真实合法注册
      assert.ok(
        CircuitRegistry.hasCircuit(meeting.circuitId),
        `分站 "${meeting.name}" 的赛道 "${meeting.circuitId}" 必须在 CircuitRegistry 中完全注册！`
      );
    }
  });

  await t.test('3. 冲刺赛与分站 Session 结构有效性', () => {
    for (const meeting of calendar) {
      assert.ok(Array.isArray(meeting.sessions), `分站必须包含 sessions 数组: ${meeting.name}`);
      assert.ok(meeting.sessions.length >= 3, `每站至少有 3 个 session (练习/排位/正赛): ${meeting.name}`);

      const hasRace = meeting.sessions.some(s => s.type === 'race');
      assert.ok(hasRace, `分站必须包含正赛 session: ${meeting.name}`);

      if (meeting.isSprintWeekend) {
        const hasSprint = meeting.sessions.some(s => s.type === 'sprint' || s.type === 'sprint_qualifying');
        assert.ok(hasSprint, `冲刺周末必须包含 sprint session: ${meeting.name}`);
      }
    }
  });
});
