// tests/planner.test.js - 赛程规划、窗口跨度与双 cron 调度测试
const test = require('node:test');
const assert = require('node:assert');
const { cronAt, buildPlan, renderWorkflow } = require('../weekly-planner');

test('Planner: 8 天规划窗口成功覆盖跨周日晚间赛事', () => {
  const DAY = 86400000;
  const mockNow = Date.parse('2026-10-11T04:07:00.000Z'); // 周日 12:07 北京时间

  // 一场在第 7.5 天进行的下周日正赛 (北京时间下周日晚 20:00)
  const mockSessions = [
    {
      session_key: 'next_sunday_race_test',
      session_type: 'Race',
      session_name: 'Race',
      date_start: new Date(mockNow + 7.5 * DAY).toISOString()
    }
  ];

  const plan = buildPlan(mockSessions, mockNow);
  assert.strictEqual(plan.sessions.length, 1, '8天窗口必须覆盖第7.5天的下周日正赛');
  assert.strictEqual(Date.parse(plan.valid_until), mockNow + 8 * DAY, 'valid_until 必须为规划时刻 + 8天');
  assert.strictEqual(plan.sessions[0].session_key, 'next_sunday_race_test');
});

test('Planner: 每场比赛生成主备双 cron (提前 30m 与提前 15m)', () => {
  const mockNow = Date.parse('2026-10-11T04:07:00.000Z');
  const raceStartMs = Date.parse('2026-10-13T14:00:00.000Z');
  const mockSessions = [
    {
      session_key: 'dual_cron_race',
      session_type: 'Race',
      session_name: 'Race',
      date_start: new Date(raceStartMs).toISOString()
    }
  ];

  const plan = buildPlan(mockSessions, mockNow);
  const session = plan.sessions[0];
  assert.strictEqual(session.reminder_cron, '30 13 13 10 *', '主 cron 应为开赛前 30 分钟 (13:30 UTC)');
  assert.strictEqual(session.backup_cron, '45 13 13 10 *', '备用 cron 应为开赛前 15 分钟 (13:45 UTC)');

  const template = 'name: Test\non:\n__SCHEDULE__\njobs: {}';
  const workflow = renderWorkflow(template, plan);
  assert.strictEqual(workflow.includes("- cron: '30 13 13 10 *'"), true, 'workflow 必须包含主 cron');
  assert.strictEqual(workflow.includes("- cron: '45 13 13 10 *'"), true, 'workflow 必须包含备用 cron');
});

test('Planner: 即将开赛但未超时的场次标记为 catch-up 且 reminder_cron 为 null', () => {
  const mockNow = Date.parse('2026-10-11T04:07:59.000Z');
  // 一场在 23 分钟后开赛的场次 (标准提前30分钟点 04:00:59 已过)
  const mockSessions = [
    {
      session_key: 'catchup_race_test',
      session_type: 'Race',
      session_name: 'Race',
      date_start: '2026-10-11T04:30:59.000Z'
    }
  ];

  const plan = buildPlan(mockSessions, mockNow);
  assert.strictEqual(plan.sessions.length, 1);
  const catchupSession = plan.sessions[0];
  assert.strictEqual(catchupSession.is_catchup, true, '必须标记为 is_catchup');
  assert.strictEqual(catchupSession.reminder_cron, null, '已过时的主提醒 cron 为 null');
  assert.strictEqual(catchupSession.backup_cron, '15 4 11 10 *', '未来的备用 cron 仍正常保留为 04:15');

  // 若距离开赛仅剩 10 分钟（主备时间均已过）
  const imminentSessions = [
    {
      session_key: 'imminent_race_test',
      session_type: 'Race',
      session_name: 'Race',
      date_start: '2026-10-11T04:17:59.000Z'
    }
  ];
  const imminentPlan = buildPlan(imminentSessions, mockNow);
  assert.strictEqual(imminentPlan.sessions[0].reminder_cron, null);
  assert.strictEqual(imminentPlan.sessions[0].backup_cron, null);
});

test('Planner: 无比赛周生成空计划且工作流无 cron', () => {
  const mockNow = Date.parse('2026-10-11T04:07:00.000Z');
  const plan = buildPlan([], mockNow);
  assert.strictEqual(plan.sessions.length, 0);

  const template = 'name: Test\non:\n__SCHEDULE__\njobs: {}';
  const workflow = renderWorkflow(template, plan);
  assert.strictEqual(workflow.includes('cron:'), false, '无比赛周绝不生成任何 cron 任务');
});
