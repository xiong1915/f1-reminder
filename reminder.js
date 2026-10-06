// reminder.js - F1 比赛云端与本地跨平台检测脚本 (Node.js 原生零依赖)
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const COUNTRY_MAP = {
  "Bahrain": "巴林", "Saudi Arabia": "沙特阿拉伯", "Australia": "澳大利亚", "Japan": "日本",
  "China": "中国", "United States": "美国", "Italy": "意大利", "Monaco": "摩纳哥",
  "Canada": "加拿大", "Spain": "西班牙", "Austria": "奥地利", "Great Britain": "英国",
  "Hungary": "匈牙利", "Belgium": "比利时", "Netherlands": "荷兰", "Azerbaijan": "阿塞拜疆",
  "Singapore": "新加坡", "Mexico": "墨西哥", "Brazil": "巴西", "Qatar": "卡塔尔",
  "United Arab Emirates": "阿联酋"
};

const SESSION_MAP = {
  "Practice 1": "第一次自由练习赛 (FP1)", "Practice 2": "第二次自由练习赛 (FP2)",
  "Practice 3": "第三次自由练习赛 (FP3)", "Qualifying": "排位赛 (Qualifying)",
  "Sprint Qualifying": "冲刺排位赛 (Sprint Quali)", "Sprint Shootout": "冲刺排位赛 (Sprint Shootout)",
  "Sprint": "冲刺赛 (Sprint Race)", "Race": "大奖赛正赛 (Main Race)"
};

function translateCountry(c) { return COUNTRY_MAP[c] || c; }
function translateSession(s) { return SESSION_MAP[s] || s; }

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'F1ReminderBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postJson(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = u.protocol === 'https:' ? https : http;
    const body = Buffer.from(JSON.stringify(payload), 'utf-8');
    const req = client.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendPush(pushKey, gpName, sessionName, locName, timeStr, remMin) {
  const title = `🏎️ F1 比赛开赛提醒: ${gpName}`;
  const content = `🏎️ 【F1 比赛即将开赛提醒】\n━━━━━━━━━━━━━━━━━━\n🏆 大奖赛：${gpName}\n⏱️ 环节：${sessionName}\n📍 赛道：${locName}\n⏰ 开赛时间：${timeStr} (北京时间)\n⏳ 倒计时：约 ${remMin} 分钟\n━━━━━━━━━━━━━━━━━━\n🏁 请准备好观赛！`;
  
  if (pushKey.includes('qyapi.weixin.qq.com')) {
    const md = `### 🏎️ F1 比赛即将开赛提醒\n> **大奖赛**：${gpName}\n> **环节**：${sessionName}\n> **开赛时间**：${timeStr} (北京时间)\n> **距离开赛**：约 ${remMin} 分钟\n\n🏁 比赛即将打响！`;
    const res = await postJson(pushKey, { msgtype: 'markdown', markdown: { content: md } });
    console.log('[企业微信响应]', res);
  } else {
    // Pushplus
    const channel = process.env.PUSHPLUS_CHANNEL || 'wechat';
    const res = await postJson('http://www.pushplus.plus/send', {
      token: pushKey.trim(),
      title: title,
      content: content,
      channel: channel,
      template: channel === 'clawbot' ? 'txt' : 'markdown'
    });
    console.log('[Pushplus响应]', res);
  }
}

async function main() {
  let pushKey = process.env.PUSH_KEY || '';
  const configFile = path.join(__dirname, 'config.json');
  if (!pushKey && fs.existsSync(configFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      pushKey = cfg.webhook_url || '';
    } catch (e) {}
  }

  const now = new Date();
  const beijingTimeStr = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  console.log('=============================================');
  console.log(`当前时间 (北京时间): ${beijingTimeStr}`);

  let sessions = [];
  try {
    const year = now.getFullYear();
    sessions = await fetchJson(`https://api.openf1.org/v1/sessions?year=${year}`);
  } catch (e) {
    console.warn('[警告] 获取赛程失败:', e.message);
  }

  if (!sessions || sessions.length === 0) {
    console.log('未获取到赛程数据。');
    return;
  }

  const monitoredTypes = ['Practice', 'Qualifying', 'Sprint', 'Race'];
  const upcoming = [];

  for (const s of sessions) {
    if (!s.date_start) continue;
    const st = new Date(s.date_start);
    // 过滤超过 3 小时前已完赛的
    if (st.getTime() >= now.getTime() - 3 * 3600 * 1000) {
      const diffMins = (st.getTime() - now.getTime()) / (60 * 1000);
      const key = String(s.session_key || `${s.year}_${s.country_name}_${s.session_name}_${s.date_start}`);
      upcoming.push({ session: s, startTime: st, diff: diffMins, key: key });
    }
  }

  upcoming.sort((a, b) => a.startTime - b.startTime);
  if (upcoming.length === 0) {
    console.log('本赛季无后续赛程。');
    return;
  }

  const nextS = upcoming[0];
  const nextCn = translateCountry(nextS.session.country_name);
  const nextSess = translateSession(nextS.session.session_name);
  const nextTimeStr = new Date(nextS.startTime.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  const diffH = Math.floor(nextS.diff / 60);
  const diffM = Math.floor(nextS.diff % 60);

  console.log(`最近下一场赛事: ${nextCn} 大奖赛 - ${nextSess}`);
  console.log(`开赛时间: ${nextTimeStr} (北京时间)`);
  if (nextS.diff > 0) {
    console.log(`距开赛还剩: ${diffH} 小时 ${diffM} 分钟 (${nextS.diff.toFixed(1)} 分钟)`);
  } else {
    console.log(`赛事正在进行中或刚开赛！`);
  }
  console.log('---------------------------------------------');

  const historyFile = path.join(__dirname, 'history.json');
  let history = {};
  if (fs.existsSync(historyFile)) {
    try { history = JSON.parse(fs.readFileSync(historyFile, 'utf-8')); } catch (e) {}
  }

  let triggered = 0;
  for (const item of upcoming) {
    const s = item.session;
    const isMatch = monitoredTypes.some(m => (s.session_type && s.session_type.includes(m)) || (s.session_name && s.session_name.includes(m)));
    if (!isMatch) continue;

    // 提醒窗口：开赛前 -2 到 45 分钟
    if (item.diff >= -2 && item.diff <= 45) {
      if (history[item.key]) {
        console.log(`[已提醒过] ${nextCn} - ${nextSess}`);
        continue;
      }
      if (!pushKey) {
        console.log('[提示] 满足开赛提醒条件，但未配置 PUSH_KEY，跳过发送。');
        continue;
      }

      const gp = `${translateCountry(s.country_name)} 大奖赛`;
      const sn = translateSession(s.session_name);
      const stStr = new Date(item.startTime.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      const rem = Math.max(1, Math.round(item.diff));

      console.log(`>>> 满足开赛前30分钟条件，正在发送提醒: ${gp} - ${sn}`);
      try {
        await sendPush(pushKey, gp, sn, s.location, stStr, rem);
        history[item.key] = { sent_at: beijingTimeStr, gp, sn, stStr };
        triggered++;
      } catch (e) {
        console.error('[发送失败]', e.message);
      }
    }
  }

  if (triggered > 0) {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8');
    console.log('已更新已提醒历史文件。');
  } else {
    console.log('当前没有处于开赛前 30 分钟窗口内的比赛环节。');
  }
  console.log('=============================================');
}

main().catch(console.error);
