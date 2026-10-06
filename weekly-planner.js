const fs = require('fs');
const path = require('path');
const https = require('https');
const DAY = 86400000;
function cronAt(ms) {
  const d = new Date(ms);
  return [d.getUTCMinutes(), d.getUTCHours(), d.getUTCDate(), d.getUTCMonth() + 1, '*'].join(' ');
}
function buildPlan(sessions, now = Date.now()) {
  if (!Array.isArray(sessions)) throw new Error('赛程接口未返回数组');
  const until = now + 7 * DAY;
  const selected = [];
  for (const s of sessions) {
    if (s.is_cancelled === true) continue;
    if (!['Practice', 'Qualifying', 'Sprint', 'Race'].some(type =>
      [s.session_type, s.session_name].some(value => typeof value === 'string' && value.toLowerCase().includes(type.toLowerCase())))) continue;
    const start = Date.parse(s.date_start);
    if (!Number.isFinite(start)) throw new Error('赛程时间无效: ' + s.session_key);
    const remind = start - 30 * 60000;
    if (remind < now || remind >= until) continue;
    selected.push({...s, remind_at: new Date(remind).toISOString(), reminder_cron: cronAt(remind)});
  }
  selected.sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
  return {version: 1, generated_at: new Date(now).toISOString(), valid_until: new Date(until).toISOString(), sessions: selected};
}
function renderWorkflow(template, plan) {
  const crons = [...new Set(plan.sessions.map(s => s.reminder_cron))];
  const schedule = crons.length ? '  schedule:\n' + crons.map(cron => "    - cron: '" + cron + "'").join('\n') : '';
  if (!template.includes('__SCHEDULE__')) throw new Error('缺少定时配置模板标记');
  return template.replace('__SCHEDULE__', schedule);
}
function getSessions(year) {
  return new Promise((resolve, reject) => {
    const req = https.get('https://api.openf1.org/v1/sessions?year=' + year, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('赛程接口 HTTP ' + res.statusCode));
        try { const data = JSON.parse(body); if (!Array.isArray(data) || !data.length) throw new Error('赛程数据为空或结构异常'); resolve(data); }
        catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('赛程接口超时')));
  });
}
async function main() {
  const now = Date.now();
  const firstYear = new Date(now).getUTCFullYear();
  const lastYear = new Date(now + 7 * DAY).getUTCFullYear();
  const sessions = [];
  for (const year of new Set([firstYear, lastYear])) {
    let data;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try { data = await getSessions(year); break; }
      catch (err) { if (attempt === 3) throw err; await new Promise(resolve => setTimeout(resolve, 2000)); }
    }
    sessions.push(...data);
  }
  const plan = buildPlan(sessions, now);
  const template = fs.readFileSync(path.join(__dirname, 'reminder-workflow.template'), 'utf8');
  const workflow = renderWorkflow(template, plan);
  fs.writeFileSync(path.join(__dirname, 'weekly-plan.json'), JSON.stringify(plan, null, 2) + '\n');
  fs.writeFileSync(path.join(__dirname, '.github/workflows/f1-reminder.yml'), workflow);
  console.log('已规划未来7天 ' + plan.sessions.length + ' 场提醒；没有比赛时不发送消息');
}
module.exports = {cronAt, buildPlan, renderWorkflow};
if (require.main === module) main().catch(err => { console.error(err.message); process.exitCode = 1; });
