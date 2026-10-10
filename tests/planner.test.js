// tests/planner.test.js - 赛程规划、窗口跨度与双 cron 调度测试
const test = require('node:test');
const assert = require('node:assert');
const { cronAt, buildPlan, renderWorkflow, jolpicaSessions } = require('../weekly-planner');

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

test('Planner: 每场比赛生成主备双 cron (提前 35m 与提前 30m)', () => {
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
  assert.strictEqual(session.start_cron, '0 14 13 10 *');
  assert.strictEqual(session.start_backup_cron, '2 14 13 10 *');
  assert.strictEqual(session.reminder_cron, '25 13 13 10 *', '主 cron 应为开赛前 35 分钟 (13:25 UTC)');
  assert.strictEqual(session.backup_cron, '30 13 13 10 *', '备用 cron 应为开赛前 30 分钟 (13:30 UTC)');

  const template = 'name: Test\non:\n__SCHEDULE__\njobs: {}';
  const workflow = renderWorkflow(template, plan);
  assert.strictEqual(workflow.includes("- cron: '0 14 13 10 *'"),true);
  assert.strictEqual(workflow.includes("- cron: '2 14 13 10 *'"),true);
  assert.strictEqual(workflow.includes("- cron: '25 13 13 10 *'"), true, 'workflow 必须包含主 cron');
  assert.strictEqual(workflow.includes("- cron: '30 13 13 10 *'"), true, 'workflow 必须包含备用 cron');
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
  assert.strictEqual(catchupSession.backup_cron, null, '已过时的备用提醒 cron 为 null');

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

test('Planner: 无比赛周保留云端健康检查，不产生赛事提醒', () => {
  const mockNow = Date.parse('2026-10-11T04:07:00.000Z');
  const plan = buildPlan([], mockNow);
  assert.strictEqual(plan.sessions.length, 0);

  const template = 'name: Test\non:\n__SCHEDULE__\njobs: {}';
  const workflow = renderWorkflow(template, plan);
  assert.strictEqual(workflow.includes("cron: '*/15 * * * 5,6,0'"), true, '无比赛周仍检查数据与定时器健康');
});

test('Jolpica: sprint qualifying, UTC conversion and missing times', () => {
  const sessions = jolpicaSessions([{round:'17',date:'2026-10-11',time:'12:00:00Z',
    FirstPractice:{date:'2026-10-09'},SprintQualifying:{date:'2026-10-09',time:'12:30:00Z'},
    Circuit:{Location:{country:'Singapore',locality:'Marina Bay'}}}],2026);
  assert.deepEqual(sessions.map(s=>s.session_name),['Sprint Qualifying','Race']);
  assert.equal(sessions[0].date_start,'2026-10-09T12:30:00.000Z');
});

test('Planner excludes cancelled and expired sessions, rejects invalid dates', () => {
  const now=Date.parse('2026-12-31T23:00:00Z');
  const base={session_type:'Race',session_name:'Race'};
  assert.equal(buildPlan([{...base,date_start:'2027-01-01T01:00:00Z',is_cancelled:true},{...base,date_start:'2026-12-30T01:00:00Z'}],now).sessions.length,0);
  assert.equal(buildPlan([{...base,date_start:'2027-01-01T01:00:00Z'}],now).sessions.length,1);
  assert.throws(()=>buildPlan([{...base,date_start:'invalid'}],now));
});
