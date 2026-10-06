// reminder.js - F1 比赛云端与本地跨平台检测脚本 (Node.js 原生零依赖)
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const COUNTRY_MAP = {
  "Bahrain": "巴林", "Saudi Arabia": "沙特阿拉伯", "Australia": "澳大利亚", "Japan": "日本",
  "China": "中国", "United States": "美国", "Italy": "意大利", "Monaco": "摩纳哥",
  "Canada": "加拿大", "Spain": "西班牙", "Austria": "奥地利", "Great Britain": "英国",
  "Hungary": "匈牙利", "Belgium": "比利时", "Netherlands": "荷兰", "Azerbaijan": "阿塞拜疆",
  "Singapore": "新加坡", "Mexico": "墨西哥", "Brazil": "巴西", "Qatar": "卡塔尔",
  "United Arab Emirates": "阿联酋"
};

const LOCATION_MAP = {
  "Sakhir": "萨基尔 (巴林国际赛道)", "Jeddah": "吉达 (吉达滨海赛道)",
  "Melbourne": "墨尔本 (阿尔伯特公园赛道)", "Suzuka": "铃鹿 (铃鹿赛道)",
  "Shanghai": "上海 (上海国际赛车场)", "Miami": "迈阿密 (迈阿密国际赛道)",
  "Imola": "伊莫拉 (恩佐与迪诺·法拉利赛道)", "Monaco": "蒙特卡洛 (摩纳哥赛道)",
  "Montreal": "蒙特利尔 (吉尔·维伦纽夫赛道)", "Barcelona": "巴塞罗那 (加泰罗尼亚赛道)",
  "Spielberg": "施皮尔贝格 (红牛环赛道)", "Silverstone": "银石 (银石赛道)",
  "Budapest": "布达佩斯 (亨格罗宁赛道)", "Spa": "斯帕 (斯帕-弗朗科尔尚赛道)",
  "Zandvoort": "赞德福特 (赞德福特赛道)", "Monza": "蒙扎 (蒙扎国家赛车场)",
  "Baku": "巴库 (巴库城市赛道)", "Marina Bay": "滨海湾 (滨海湾市街赛道)",
  "Austin": "奥斯汀 (美洲赛道 COTA)", "Mexico City": "墨西哥城 (罗德里格斯兄弟赛道)",
  "Sao Paulo": "圣保罗 (若泽·卡洛斯·帕塞赛道)", "Las Vegas": "拉斯维加斯 (拉斯维加斯大道赛道)",
  "Lusail": "卢塞尔 (卢塞尔国际赛车场)", "Yas Marina": "亚斯码头 (亚斯码头赛道)"
};

const SESSION_MAP = {
  "Practice 1": "第一次自由练习赛 (FP1)", "Practice 2": "第二次自由练习赛 (FP2)",
  "Practice 3": "第三次自由练习赛 (FP3)", "Qualifying": "排位赛 (Qualifying)",
  "Sprint Qualifying": "冲刺排位赛 (Sprint Quali)", "Sprint Shootout": "冲刺排位赛 (Sprint Shootout)",
  "Sprint": "冲刺赛 (Sprint Race)", "Race": "大奖赛正赛 (Main Race)"
};

function translateCountry(c) { return COUNTRY_MAP[c] || c; }
function translateLocation(l) { return LOCATION_MAP[l] || l; }
function translateSession(s) { return SESSION_MAP[s] || s; }

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'F1ReminderBot/1.0', 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`请求失败 HTTP ${res.statusCode}: ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON 解析失败: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error(`请求超时: ${url}`));
    });
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
        'Content-Length': body.length,
        'User-Agent': 'F1ReminderBot/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`推送接口响应 HTTP 错误 ${res.statusCode}: ${data}`));
        }
        resolve(data);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`推送接口请求超时: ${urlStr}`));
    });
    req.write(body);
    req.end();
  });
}

function postForm(urlStr, formData) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = u.protocol === 'https:' ? https : http;
    const postData = querystring.stringify(formData);
    const body = Buffer.from(postData, 'utf-8');
    const req = client.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'Content-Length': body.length,
        'User-Agent': 'F1ReminderBot/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`推送接口响应 HTTP 错误 ${res.statusCode}: ${data}`));
        }
        resolve(data);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`推送接口请求超时: ${urlStr}`));
    });
    req.write(body);
    req.end();
  });
}

async function sendPush(pushKey, gpName, sessionName, locName, timeStr, remMin) {
  const title = `🏎️ F1 比赛开赛提醒: ${gpName}`;
  const content = `🏎️ 【F1 比赛即将开赛提醒】\n━━━━━━━━━━━━━━━━━━\n🏆 大奖赛：${gpName}\n⏱️ 环节：${sessionName}\n📍 赛道：${locName}\n⏰ 开赛时间：${timeStr} (北京时间)\n⏳ 倒计时：约 ${remMin} 分钟\n━━━━━━━━━━━━━━━━━━\n🏁 请准备好观赛！`;
  
  if (pushKey.includes('open.feishu.cn') || pushKey.includes('larksuite.com')) {
    // 飞书机器人交互式卡片
    const cardPayload = {
      msg_type: "interactive",
      card: {
        header: {
          title: { tag: "plain_text", content: "🏎️ F1 比赛即将开赛提醒 (前30分钟)" },
          template: "carmine"
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**🏆 大奖赛**：${gpName}\n**⏱️ 环节**：${sessionName}\n**📍 赛道地点**：${locName}\n**⏰ 开赛时间**：${timeStr} (北京时间)\n**⏳ 倒计时**：约 **${remMin} 分钟**`
            }
          },
          {
            tag: "note",
            elements: [
              { tag: "plain_text", content: "🏁 五盏红灯熄灭，精彩即将开战，请做好观赛准备！" }
            ]
          }
        ]
      }
    };
    const resStr = await postJson(pushKey, cardPayload);
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`飞书返回非合法JSON: ${resStr}`); }
    if (parsed.code !== 0 && parsed.StatusCode !== 0) {
      throw new Error(`飞书推送接口返回失败业务码: ${resStr}`);
    }
    console.log('[飞书推送成功]', resStr);

  } else if (pushKey.includes('qyapi.weixin.qq.com')) {
    // 企业微信机器人
    const md = `### 🏎️ F1 比赛即将开赛提醒 (前30分钟)\n> **大奖赛**：${gpName}\n> **环节**：${sessionName}\n> **赛道**：${locName}\n> **开赛时间**：${timeStr} (北京时间)\n> **距离开赛**：约 ${remMin} 分钟\n\n🏁 比赛即将打响！`;
    const resStr = await postJson(pushKey, { msgtype: 'markdown', markdown: { content: md } });
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`企微返回非合法JSON: ${resStr}`); }
    if (parsed.errcode !== 0) {
      throw new Error(`企业微信接口返回失败: ${resStr}`);
    }
    console.log('[企业微信推送成功]', resStr);

  } else if (pushKey.includes('oapi.dingtalk.com')) {
    // 钉钉机器人
    const dingPayload = {
      msgtype: "markdown",
      markdown: {
        title: title,
        text: `### 🏎️ F1 比赛即将开赛提醒 (前30分钟)\n- **大奖赛**：${gpName}\n- **环节**：${sessionName}\n- **赛道**：${locName}\n- **开赛时间**：${timeStr} (北京时间)\n- **距离开赛**：约 ${remMin} 分钟\n\n🏁 请准备好观赛！`
      }
    };
    const resStr = await postJson(pushKey, dingPayload);
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`钉钉返回非合法JSON: ${resStr}`); }
    if (parsed.errcode !== 0) {
      throw new Error(`钉钉接口返回失败: ${resStr}`);
    }
    console.log('[钉钉推送成功]', resStr);

  } else if (pushKey.includes('ftqq.com') || pushKey.startsWith('SCT')) {
    // Server酱 (Turbo版)
    const targetUrl = pushKey.startsWith('http') ? pushKey : `https://sctapi.ftqq.com/${pushKey.trim()}.send`;
    const desp = `### 🏎️ F1 比赛即将开赛提醒 (前30分钟)\n- **大奖赛**：${gpName}\n- **环节**：${sessionName}\n- **赛道**：${locName}\n- **开赛时间**：${timeStr} (北京时间)\n- **距离开赛**：约 ${remMin} 分钟`;
    const resStr = await postForm(targetUrl, { title, desp });
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`Server酱返回非合法JSON: ${resStr}`); }
    if (parsed.code !== 0 && (!parsed.data || parsed.data.error !== 'SUCCESS')) {
      throw new Error(`Server酱接口返回失败: ${resStr}`);
    }
    console.log('[Server酱推送成功]', resStr);

  } else {
    // Pushplus (支持普通微信或微信ClawBot)
    const channel = process.env.PUSHPLUS_CHANNEL || 'wechat';
    const resStr = await postJson('http://www.pushplus.plus/send', {
      token: pushKey.trim(),
      title: title,
      content: content,
      channel: channel,
      template: channel === 'clawbot' ? 'txt' : 'markdown'
    });
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`Pushplus返回非合法JSON: ${resStr}`); }
    if (parsed.code !== 200) {
      throw new Error(`Pushplus接口返回失败: ${resStr}`);
    }
    console.log('[Pushplus推送成功]', resStr);
  }
}

async function main() {
  let pushKey = (process.env.PUSH_KEY || '').trim();
  const configFile = path.join(__dirname, 'config.json');
  if (!pushKey && fs.existsSync(configFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      pushKey = (cfg.webhook_url || '').trim();
    } catch (e) {}
  }

  const now = new Date();
  const beijingTimeStr = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  console.log('=============================================');
  console.log(`当前时间 (北京时间): ${beijingTimeStr}`);

  // 拉取赛程数据
  let sessions = [];
  const year = now.getFullYear();
  try {
    sessions = await fetchJson(`https://api.openf1.org/v1/sessions?year=${year}`);
  } catch (e) {
    console.warn(`[重试] 第一次拉取 ${year} 赛季赛程失败: ${e.message}，正在重试...`);
    try {
      sessions = await fetchJson(`https://api.openf1.org/v1/sessions?year=${year}`);
    } catch (retryErr) {
      throw new Error(`[致命错误] 获取 F1 赛程数据失败: ${retryErr.message}`);
    }
  }

  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new Error(`[致命错误] 获取到的 F1 赛程列表为空 (年份: ${year})`);
  }

  const monitoredTypes = ['Practice', 'Qualifying', 'Sprint', 'Race'];
  const upcoming = [];

  for (const s of sessions) {
    if (!s.date_start) continue;
    const st = new Date(s.date_start);
    // 只保留尚未开赛超过 3 小时的环节
    if (st.getTime() >= now.getTime() - 3 * 3600 * 1000) {
      const diffMins = (st.getTime() - now.getTime()) / (60 * 1000);
      const key = String(s.session_key || `${s.year}_${s.country_name}_${s.session_name}_${s.date_start}`);
      upcoming.push({ session: s, startTime: st, diff: diffMins, key: key });
    }
  }

  upcoming.sort((a, b) => a.startTime - b.startTime);
  if (upcoming.length === 0) {
    console.log('本赛季无后续未完赛赛程。');
    return;
  }

  const nextS = upcoming[0];
  const nextCn = translateCountry(nextS.session.country_name);
  const nextSess = translateSession(nextS.session.session_name);
  const nextLoc = translateLocation(nextS.session.location);
  const nextTimeStr = new Date(nextS.startTime.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  const diffH = Math.floor(nextS.diff / 60);
  const diffM = Math.floor(nextS.diff % 60);

  console.log(`最近下一场赛事: ${nextCn} 大奖赛 - ${nextSess}`);
  console.log(`赛道地点: ${nextLoc}`);
  console.log(`开赛时间: ${nextTimeStr} (北京时间)`);
  if (nextS.diff > 0) {
    console.log(`距开赛还剩: ${diffH} 小时 ${diffM} 分钟 (${nextS.diff.toFixed(1)} 分钟)`);
  } else {
    console.log(`赛事正在进行中或刚刚开赛！`);
  }
  console.log('---------------------------------------------');

  const historyFile = path.join(__dirname, 'history.json');
  let history = {};
  if (fs.existsSync(historyFile)) {
    try { history = JSON.parse(fs.readFileSync(historyFile, 'utf-8')); } catch (e) {}
  }

  // 严格定义提前 30 分钟触发窗口：
  // 1. 比赛尚未开赛: item.diff > 0
  // 2. 距离开赛时间在 20 到 35 分钟之间 (配合每 10 分钟运行一次的定时任务，必有且仅有一次落在该区间)
  const MIN_WINDOW = 20.0;
  const MAX_WINDOW = 35.0;

  let triggered = 0;
  let sendErrors = [];

  for (const item of upcoming) {
    const s = item.session;
    const isMatch = monitoredTypes.some(m => 
      (s.session_type && s.session_type.toLowerCase().includes(m.toLowerCase())) || 
      (s.session_name && s.session_name.toLowerCase().includes(m.toLowerCase()))
    );
    if (!isMatch) continue;

    const diff = item.diff;
    if (diff > 0 && diff >= MIN_WINDOW && diff <= MAX_WINDOW) {
      if (history[item.key]) {
        console.log(`[已提醒过，跳过重复推送] ${nextCn} - ${nextSess}`);
        continue;
      }
      if (!pushKey) {
        throw new Error(`[错误] 比赛即将开赛 (剩余约 ${Math.round(diff)} 分钟)，但未配置 PUSH_KEY 无法推送！`);
      }

      const gp = `${translateCountry(s.country_name)} 大奖赛`;
      const sn = translateSession(s.session_name);
      const loc = translateLocation(s.location);
      const stStr = new Date(item.startTime.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      const rem = Math.max(1, Math.round(diff));

      console.log(`>>> 满足开赛前 30 分钟提醒条件！正在发送: ${gp} - ${sn} (剩余约 ${rem} 分钟)`);
      try {
        await sendPush(pushKey, gp, sn, loc, stStr, rem);
        // 关键修复：只有在确实成功推送后，才记录历史！避免失败时被错误标记为已发送
        history[item.key] = { sent_at: beijingTimeStr, gp, sn, stStr, rem_minutes: rem };
        triggered++;
      } catch (err) {
        console.error(`[推送失败] 场次 ${item.key} 错误: ${err.message}`);
        sendErrors.push(err);
      }
    }
  }

  // 若成功触发，更新并保存历史记录
  if (triggered > 0) {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`已更新已发送历史记录文件: ${historyFile}`);
  } else {
    console.log(`当前无处于开赛前 30 分钟窗口 [${MIN_WINDOW}~${MAX_WINDOW} 分钟] 内的待通知环节。`);
  }

  // 关键修复：如果有待推送场次但发送全部或部分失败，必须抛出错误并退出非0状态码
  if (sendErrors.length > 0) {
    throw new Error(`本次检查中有 ${sendErrors.length} 条推送发送失败: ${sendErrors.map(e => e.message).join('; ')}`);
  }

  console.log('=============================================');
}

main().catch((err) => {
  console.error('[执行失败]', err.message);
  process.exit(1);
});
