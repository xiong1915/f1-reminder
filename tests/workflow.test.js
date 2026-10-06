// tests/workflow.test.js - GitHub Actions 工作流配置与并发组隔离测试
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Workflow: f1-reminder 与模板并发组统一为 f1-reminder-execution 且 cancel-in-progress 为 false', () => {
  const reminderYml = fs.readFileSync(path.join(__dirname, '../.github/workflows/f1-reminder.yml'), 'utf-8');
  const templateYml = fs.readFileSync(path.join(__dirname, '../reminder-workflow.template'), 'utf-8');

  for (const [name, content] of [['f1-reminder.yml', reminderYml], ['reminder-workflow.template', templateYml]]) {
    assert.strictEqual(
      content.includes('group: f1-reminder-execution'),
      true,
      `${name} 必须绑定 f1-reminder-execution 互斥组`
    );
    assert.strictEqual(
      content.includes('cancel-in-progress: false'),
      true,
      `${name} 必须保持 cancel-in-progress: false 排队执行`
    );
  }
});

test('Workflow: weekly-planner.yml 普通规划独立组，补发任务与 reminder 共享互斥组', () => {
  const plannerYml = fs.readFileSync(path.join(__dirname, '../.github/workflows/weekly-planner.yml'), 'utf-8');

  assert.strictEqual(plannerYml.includes('group: f1-weekly-planner'), true, '普通 plan 任务保持独立组零阻塞');
  assert.strictEqual(plannerYml.includes('catchup-reminder:'), true, '必须将补发拆分为独立 job');
  assert.strictEqual(plannerYml.includes('group: f1-reminder-execution'), true, 'catchup-reminder 必须与 reminder 共享单例互斥并发组');
  assert.strictEqual(plannerYml.includes('Plan next eight days'), true, '规划步骤标题更新为 8 天');
  assert.strictEqual(plannerYml.includes('PUSH_SUCCESS'), true, 'catchup 推送必须包含 PUSH_SUCCESS 检查');
});
