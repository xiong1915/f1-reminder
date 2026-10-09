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
  // 规划未来8天，完整覆盖跨周日边界（如晚间正赛）及规划延迟容灾
  const until = now + 8 * DAY;
  const selected = [];
  for (const s of sessions) {
    if (s.is_cancelled === true) continue;
    if (!['Practice', 'Qualifying', 'Sprint', 'Race'].some(type =>
      [s.session_type, s.session_name].some(value => typeof value === 'string' && value.toLowerCase().includes(type.toLowerCase())))) continue;
    const start = Date.parse(s.date_start);
    if (!Number.isFinite(start)) throw new Error('赛程时间无效: ' + s.session_key);
    
    // 已开赛或超出本周规划窗口则跳过
    if (start <= now || start >= until) continue;

    const remindMain = start - 30 * 60000;
    const remindBackup = start - 15 * 60000;
    let isCatchUp = false;
    let reminderCron = null;
    let backupCron = null;

    if (remindMain >= now) {
      reminderCron = cronAt(remindMain);
    }
    if (remindBackup >= now) {
      backupCron = cronAt(remindBackup);
    }

    // 若主提醒时间已过 (remindMain < now) 但尚未开赛 (start > now)，属于遗漏补发
    if (remindMain < now) {
      isCatchUp = true;
    }

    selected.push({
      ...s,
      is_catchup: isCatchUp,
      remind_at: new Date(isCatchUp ? now : remindMain).toISOString(),
      reminder_cron: reminderCron,
      backup_cron: backupCron
    });
  }
  selected.sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
  return {version: 1, generated_at: new Date(now).toISOString(), valid_until: new Date(until).toISOString(), sessions: selected};
}
function renderWorkflow(template, plan) {
  const allCrons = [];
  for (const s of plan.sessions) {
    if (s.reminder_cron) allCrons.push(s.reminder_cron);
    if (s.backup_cron) allCrons.push(s.backup_cron);
  }
  const crons = [...new Set(allCrons)];
  // The health-check cadence must survive weekly regeneration, including empty weeks.
  const schedule = '  schedule:\n' + [...new Set(['*/15 * * * 5,6,0', '0 * * * 1-4', ...crons])].map(cron => "    - cron: '" + cron + "'").join('\n');
  if (!template.includes('__SCHEDULE__')) throw new Error('缺少定时配置模板标记');
  return template.replace('__SCHEDULE__', schedule);
}
function getSessions(year) {
  return new Promise((resolve, reject) => {
    const req = https.get('https://api.jolpi.ca/ergast/f1/' + year + '.json', res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('赛程接口 HTTP ' + res.statusCode));
        try {
          const races = JSON.parse(body)?.MRData?.RaceTable?.Races;
          if (!Array.isArray(races) || !races.length) throw new Error('赛程数据为空或结构异常');
          resolve(jolpicaSessions(races, year));
        }
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
  const lastYear = new Date(now + 8 * DAY).getUTCFullYear();
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
  console.log('已规划未来8天 ' + plan.sessions.length + ' 场提醒 (含双重冗余 cron)；没有比赛时不发送消息');

  // 若存在开赛在即的遗漏补发场次，输出标记由具备推送互斥并发组的工作流任务执行，避免无锁并发推送
  const catchupSessions = plan.sessions.filter(s => s.is_catchup);
  const hasCatchup = catchupSessions.length > 0;
  if (hasCatchup) {
    console.log(`[即时补发标记] 检测到 ${catchupSessions.length} 场临近开赛遗漏场次，将交由互斥推送任务执行...`);
  }
  if (process.env.GITHUB_OUTPUT) {
    try {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_catchup=${hasCatchup ? 'true' : 'false'}\n`);
    } catch (err) {
      console.error(`[严重异常] 写入 GITHUB_OUTPUT 失败: ${err.message}`);
      throw err;
    }
  }
}
function jolpicaSessions(races, year) {
  const fields = [['FirstPractice','Practice 1','Practice'],['SecondPractice','Practice 2','Practice'],
    ['ThirdPractice','Practice 3','Practice'],['SprintQualifying','Sprint Qualifying','Qualifying'],
    ['Sprint','Sprint','Sprint'],['Qualifying','Qualifying','Qualifying'],['Race','Race','Race']];
  return races.flatMap(r => fields.flatMap(([field,name,type]) => {
    const value = field === 'Race' ? r : r[field];
    if (!value?.date || !value?.time) return [];
    const start = `${value.date}T${value.time}`;
    if (!Number.isFinite(Date.parse(start))) throw Error('无效赛程时间');
    return [{session_key:`jolpica_${year}_${r.round}_${field}`,session_type:type,session_name:name,
      date_start:new Date(start).toISOString(),country_name:r.Circuit?.Location?.country,
      location:r.Circuit?.Location?.locality,year,is_cancelled:false}];
  }));
}
module.exports = {cronAt, buildPlan, renderWorkflow, jolpicaSessions};
if (require.main === module) main().catch(err => { console.error(err.message); process.exitCode = 1; });
