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

const CACHE_MAX_AGE_DAYS = 7; // 本地赛程缓存最大有效期（天），超过该天数的旧缓存拒绝作为灾备使用

function translateCountry(c) { return COUNTRY_MAP[c] || c; }
function translateLocation(l) { return LOCATION_MAP[l] || l; }
function translateSession(s) { return SESSION_MAP[s] || s; }

// URL 日志脱敏，防止在错误日志中泄露 token 或 webhook key
function sanitizeUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.host}${u.pathname.split('/').slice(0, 4).join('/')}/***`;
  } catch {
    return '***';
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'F1ReminderBot/1.0', 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode} from ${sanitizeUrl(url)}`));
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
    req.on('error', (err) => reject(new Error(`网络请求异常: ${err.message}`)));
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error(`请求超时 (20s): ${sanitizeUrl(url)}`));
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
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        resolve(data);
      });
    });
    req.on('error', (err) => reject(new Error(`推送网络错误: ${err.message}`)));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`推送接口响应超时 (15s)`));
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
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        resolve(data);
      });
    });
    req.on('error', (err) => reject(new Error(`表单推送网络错误: ${err.message}`)));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`表单推送接口超时 (15s)`));
    });
    req.write(body);
    req.end();
  });
}

// 统一推送分发器
async function sendPush(pushKey, gpName, sessionName, locName, timeStr, remMin, isCatchUp = false) {
  const headerTitle = isCatchUp 
    ? `🏎️ 【即将开赛紧急提醒】仅剩 ${remMin} 分钟` 
    : `🏎️ F1 比赛开赛提醒 (前30分钟)`;

  const title = `🏎️ F1 开赛提醒: ${gpName} - ${sessionName}`;
  const noteText = isCatchUp 
    ? `⚠️ 提示：开赛在即（剩余约 ${remMin} 分钟），请立即就位观赛！🏁` 
    : `🏁 五盏红灯熄灭，精彩即将开赛，请做好观赛准备！`;

  const content = `${headerTitle}\n━━━━━━━━━━━━━━━━━━\n🏆 大奖赛：${gpName}\n⏱️ 环节：${sessionName}\n📍 赛道：${locName}\n⏰ 开赛时间：${timeStr} (北京时间)\n⏳ 倒计时：约 ${remMin} 分钟\n━━━━━━━━━━━━━━━━━━\n${noteText}`;

  if (pushKey.includes('open.feishu.cn') || pushKey.includes('larksuite.com')) {
    // 飞书机器人交互式卡片
    const cardPayload = {
      msg_type: "interactive",
      card: {
        header: {
          title: { tag: "plain_text", content: headerTitle },
          template: isCatchUp ? "orange" : "carmine"
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
              { tag: "plain_text", content: noteText }
            ]
          }
        ]
      }
    };
    const resStr = await postJson(pushKey, cardPayload);
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`[飞书] 返回非合法JSON: ${resStr}`); }
    if (parsed.code !== 0 && parsed.StatusCode !== 0) {
      throw new Error(`[飞书] 接口返回业务错误 (code: ${parsed.code || parsed.StatusCode}, msg: ${parsed.msg || parsed.StatusMessage})`);
    }
    console.log('[飞书推送成功]');

  } else if (pushKey.includes('qyapi.weixin.qq.com')) {
    // 企业微信机器人
    const colorTag = isCatchUp ? "warning" : "info";
    const md = `### ${headerTitle}\n> **大奖赛**：${gpName}\n> **环节**：${sessionName}\n> **赛道**：${locName}\n> **开赛时间**：${timeStr} (北京时间)\n> **距离开赛**：<font color="${colorTag}">约 ${remMin} 分钟</font>\n\n${noteText}`;
    const resStr = await postJson(pushKey, { msgtype: 'markdown', markdown: { content: md } });
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`[企业微信] 返回非合法JSON: ${resStr}`); }
    if (parsed.errcode !== 0) {
      throw new Error(`[企业微信] 接口返回业务错误 (errcode: ${parsed.errcode}, errmsg: ${parsed.errmsg})`);
    }
    console.log('[企业微信推送成功]');

  } else if (pushKey.includes('oapi.dingtalk.com')) {
    // 钉钉机器人
    const dingPayload = {
      msgtype: "markdown",
      markdown: {
        title: title,
        text: `### ${headerTitle}\n- **大奖赛**：${gpName}\n- **环节**：${sessionName}\n- **赛道**：${locName}\n- **开赛时间**：${timeStr} (北京时间)\n- **距离开赛**：约 ${remMin} 分钟\n\n${noteText}`
      }
    };
    const resStr = await postJson(pushKey, dingPayload);
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`[钉钉] 返回非合法JSON: ${resStr}`); }
    if (parsed.errcode !== 0) {
      throw new Error(`[钉钉] 接口返回业务错误 (errcode: ${parsed.errcode}, errmsg: ${parsed.errmsg})`);
    }
    console.log('[钉钉推送成功]');

  } else if (pushKey.includes('ftqq.com') || pushKey.startsWith('SCT')) {
    // Server酱 (Turbo版)
    const targetUrl = pushKey.startsWith('http') ? pushKey : `https://sctapi.ftqq.com/${pushKey.trim()}.send`;
    const desp = `### ${headerTitle}\n- **大奖赛**：${gpName}\n- **环节**：${sessionName}\n- **赛道**：${locName}\n- **开赛时间**：${timeStr} (北京时间)\n- **距离开赛**：约 ${remMin} 分钟\n\n${noteText}`;
    const resStr = await postForm(targetUrl, { title, desp });
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`[Server酱] 返回非合法JSON: ${resStr}`); }
    if (parsed.code !== 0 && (!parsed.data || parsed.data.error !== 'SUCCESS')) {
      throw new Error(`[Server酱] 接口返回业务错误 (code: ${parsed.code}, msg: ${parsed.message || parsed.info})`);
    }
    console.log('[Server酱推送成功]');

  } else {
    // Pushplus (强制使用 HTTPS)
    const channel = process.env.PUSHPLUS_CHANNEL || 'wechat';
    const resStr = await postJson('https://www.pushplus.plus/send', {
      token: pushKey.trim(),
      title: title,
      content: content,
      channel: channel,
      template: channel === 'clawbot' ? 'txt' : 'markdown'
    });
    let parsed;
    try { parsed = JSON.parse(resStr); } catch (e) { throw new Error(`[Pushplus] 返回非合法JSON: ${resStr}`); }
    if (parsed.code !== 200) {
      throw new Error(`[Pushplus] 接口返回业务错误 (code: ${parsed.code}, msg: ${parsed.msg})`);
    }
    console.log('[Pushplus推送成功]');
  }
}

// 严谨读取历史文件，损坏时拒绝静默忽略，并备份异常文件
function loadHistory(file) {
  if (!fs.existsSync(file)) return {};
  let raw = '';
  try {
    raw = fs.readFileSync(file, 'utf-8').trim();
  } catch (e) {
    throw new Error(`[历史记录读取失败] 读取 ${file} 出错: ${e.message}`);
  }

  // 若文件存在但完全为空，可能是写入被异常中断导致截断
  if (!raw) {
    const corruptBackup = `${file}.corrupt.${Date.now()}`;
    try { fs.copyFileSync(file, corruptBackup); } catch (_) {}
    throw new Error(`[历史记录损坏] 文件 ${file} 存在但为空文件。已备份至 ${corruptBackup}。为防止全量重复推送，已中止执行！`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const corruptBackup = `${file}.corrupt.${Date.now()}`;
    try { fs.copyFileSync(file, corruptBackup); } catch (_) {}
    throw new Error(`[历史记录损坏] 文件 ${file} 存在但 JSON 解析失败: ${e.message}。已备份至 ${corruptBackup}。为防止全量重复推送，已中止执行！`);
  }

  // 严格校验必须为普通对象且非数组、非null
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const corruptBackup = `${file}.corrupt.${Date.now()}`;
    try { fs.copyFileSync(file, corruptBackup); } catch (_) {}
    throw new Error(`[历史记录损坏] 文件 ${file} 内容不是有效的字典对象 (得到 ${Array.isArray(parsed) ? '数组' : typeof parsed})。已备份至 ${corruptBackup}。为防止全量重复推送，已中止执行！`);
  }

  return parsed;
}

// 立即安全写盘
function saveHistory(file, historyObj) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(historyObj, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
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

  // 测试模式入口：验证真实收件通路
  const isTestMode = process.env.TEST_MODE === 'true' || process.argv.includes('--test');
  if (isTestMode) {
    console.log('>>> [测试模式] 正在触发通路测试通知...');
    if (!pushKey) {
      throw new Error('未配置 PUSH_KEY，无法发送测试通知！请先在 GitHub Secrets 或 config.json 中配置。');
    }
    const nowTest = new Date();
    const testTimeStr = new Date(nowTest.getTime() + 8 * 3600 * 1000 + 30 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    await sendPush(pushKey, '新加坡大奖赛 (测试样张)', '大奖赛正赛 (Main Race)', '滨海湾市街赛道', testTimeStr, 30, false);
    console.log('🎉 测试通知已成功发出并获远端接口确认！');
    return;
  }

  // 启动时立即校验 PUSH_KEY 是否存在
  if (!pushKey) {
    throw new Error('[启动失败] 未配置 PUSH_KEY 密钥！请在 GitHub Secrets (PUSH_KEY) 或 config.json (webhook_url) 中配置接收地址。');
  }

  const now = new Date();
  const beijingTimeStr = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  console.log('=============================================');
  console.log(`当前时间 (北京时间): ${beijingTimeStr}`);

  // 拉取赛程数据，带 3 次退避重试与本地灾备降级缓存
  let sessions = [];
  const year = now.getFullYear();
  const cacheFile = path.join(__dirname, `cache_${year}.json`);

  const maxRetries = 3;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      sessions = await fetchJson(`https://api.openf1.org/v1/sessions?year=${year}`);
      if (Array.isArray(sessions) && sessions.length > 0) {
        // 成功获取，写入带时间戳元数据的本地灾备缓存
        try {
          const cachePayload = {
            version: 2,
            year: year,
            updated_at: new Date().toISOString(),
            session_count: sessions.length,
            sessions: sessions
          };
          fs.writeFileSync(cacheFile, JSON.stringify(cachePayload, null, 2), 'utf-8');
        } catch (e) {
          console.warn(`[缓存写入告警] 写入本地缓存失败: ${e.message}`);
        }
        break;
      }
    } catch (e) {
      lastErr = e;
      console.warn(`[网络重试 ${attempt}/${maxRetries}] 拉取 ${year} 赛季数据异常: ${e.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // 若 3 次重试全失败，尝试灾备降级读取本地缓存（严格校验有效期）
  if (!Array.isArray(sessions) || sessions.length === 0) {
    if (fs.existsSync(cacheFile)) {
      try {
        const rawCache = fs.readFileSync(cacheFile, 'utf-8');
        const parsedCache = JSON.parse(rawCache);
        let cachedSessions = null;
        let updatedAt = null;

        if (Array.isArray(parsedCache)) {
          // 兼容旧格式纯数组
          cachedSessions = parsedCache;
        } else if (parsedCache && typeof parsedCache === 'object' && Array.isArray(parsedCache.sessions)) {
          cachedSessions = parsedCache.sessions;
          if (parsedCache.updated_at) updatedAt = new Date(parsedCache.updated_at);
        }

        if (Array.isArray(cachedSessions) && cachedSessions.length > 0) {
          if (updatedAt && !isNaN(updatedAt.getTime())) {
            const ageDays = (Date.now() - updatedAt.getTime()) / (24 * 3600 * 1000);
            if (ageDays > CACHE_MAX_AGE_DAYS) {
              console.error(`[缓存已过期] 本地缓存生成于 ${parsedCache.updated_at} (已过去 ${ageDays.toFixed(1)} 天，超出最大有效期 ${CACHE_MAX_AGE_DAYS} 天)。为防止依据过期赛程产生误报，拒绝启用该缓存！`);
            } else {
              sessions = cachedSessions;
              console.warn(`[降级警告] 网络连接受阻，已启用本地赛程缓存 (更新于: ${parsedCache.updated_at}，缓存赛程数: ${sessions.length})`);
            }
          } else {
            sessions = cachedSessions;
            console.warn(`[降级警告] 网络连接受阻，已启用无有效时间戳的旧版赛程缓存 (缓存赛程数: ${sessions.length})`);
          }
        }
      } catch (e) {
        console.warn(`[缓存读取异常] 本地缓存文件存在但读取解析失败: ${e.message}`);
      }
    }
  }

  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new Error(`[致命错误] 获取 F1 赛程数据连续 ${maxRetries} 次失败且无有效备份: ${lastErr ? lastErr.message : '空数据'}`);
  }

  const monitoredTypes = ['Practice', 'Qualifying', 'Sprint', 'Race'];
  const upcoming = [];
  const activeNow = [];

  for (const s of sessions) {
    if (!s.date_start) continue;
    // 1. 严格过滤已被官方宣布取消的赛事，防止误发
    if (s.is_cancelled === true) {
      console.log(`[已取消赛事，跳过] ${translateCountry(s.country_name)} - ${translateSession(s.session_name)} (原定: ${s.date_start})`);
      continue;
    }

    const st = new Date(s.date_start);
    if (!Number.isFinite(st.getTime())) {
      throw new Error(`无效开赛时间: ${s.session_key || s.session_name}`);
    }
    const diffMins = (st.getTime() - now.getTime()) / (60 * 1000);
    // 2. 防重唯一键必须绑定具体开赛时间，同一场比赛一旦改期 (date_start 改变) 允许在新时间重新提醒，绝不漏发
    const baseId = s.session_key ? `key_${s.session_key}` : `${s.year}_${s.country_name}_${s.session_name}`;
    const key = `${baseId}_${st.getTime()}`;

    // 进行中赛程（开赛后 3 小时内）
    if (diffMins <= 0 && diffMins >= -180) {
      activeNow.push({ session: s, startTime: st, diff: diffMins, key });
    }
    // 未开赛赛程（严格 diff > 0）
    if (diffMins > 0) {
      upcoming.push({ session: s, startTime: st, diff: diffMins, key });
    }
  }

  upcoming.sort((a, b) => a.startTime - b.startTime);

  // 打印当前正在进行的赛事（如果有）
  if (activeNow.length > 0) {
    for (const a of activeNow) {
      const c = translateCountry(a.session.country_name);
      const sess = translateSession(a.session.session_name);
      console.log(`[进行中赛事] ${c} 大奖赛 - ${sess} (已开赛 ${Math.abs(Math.round(a.diff))} 分钟)`);
    }
    console.log('---------------------------------------------');
  }

  if (upcoming.length === 0) {
    console.log('本赛季无后续未开赛赛程。');
    return;
  }

  // 严格选择尚未开赛的真正“下一场”
  const nextS = upcoming[0];
  const nextCn = translateCountry(nextS.session.country_name);
  const nextSess = translateSession(nextS.session.session_name);
  const nextLoc = translateLocation(nextS.session.location);
  const nextTimeStr = new Date(nextS.startTime.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  const diffH = Math.floor(nextS.diff / 60);
  const diffM = Math.floor(nextS.diff % 60);

  console.log(`即将到来的下一场赛事: ${nextCn} 大奖赛 - ${nextSess}`);
  console.log(`赛道地点: ${nextLoc}`);
  console.log(`开赛时间: ${nextTimeStr} (北京时间)`);
  console.log(`距开赛还剩: ${diffH} 小时 ${diffM} 分钟 (${nextS.diff.toFixed(1)} 分钟)`);
  console.log('---------------------------------------------');

  const historyFile = path.join(__dirname, 'history.json');
  const history = loadHistory(historyFile);
  // 兼容已上线的日期字符串键和最早的场次 ID 键，统一到 UTC 毫秒
  for (const [oldKey, record] of Object.entries(history)) {
    const match = oldKey.match(/^(.*)_(\d{4}-\d{2}-\d{2}T.*)$/);
    let baseId, startMs;
    if (match) {
      baseId = match[1];
      startMs = Date.parse(match[2]);
    } else if (/^\d+$/.test(oldKey) && record && typeof record.stStr === 'string') {
      baseId = `key_${oldKey}`;
      startMs = Date.parse(record.stStr.replace(' ', 'T') + '+08:00');
    }
    if (baseId && Number.isFinite(startMs)) {
      const normalizedKey = `${baseId}_${startMs}`;
      if (!history[normalizedKey]) history[normalizedKey] = record;
      delete history[oldKey];
    }
  }

  // 双层提醒窗口设计：
  // 1. 标准 30 分钟窗口：[20.0, 35.0] 分钟
  // 2. 紧急补发窗口 (Catch-up Window)：(0, 20.0) 分钟（防止 GitHub 调度偶尔排队延迟导致错过窗口）
  const WINDOW_STANDARD_MIN = 20.0;
  const WINDOW_STANDARD_MAX = 35.0;
  const WINDOW_CATCHUP_MAX   = 20.0;

  let triggeredCount = 0;
  const errors = [];

  for (const item of upcoming) {
    const s = item.session;
    const isMatch = monitoredTypes.some(m => 
      (s.session_type && s.session_type.toLowerCase().includes(m.toLowerCase())) || 
      (s.session_name && s.session_name.toLowerCase().includes(m.toLowerCase()))
    );
    if (!isMatch) continue;

    // 关键校准：每次进入判定重新获取当前实际时间，消除网络重试与耗时带来的时延漂移
    const currentNow = Date.now();
    const currentDiff = (item.startTime.getTime() - currentNow) / (60 * 1000);

    // 严格防线：若当前已开赛 (currentDiff <= 0)，坚决放弃发送开赛前提醒
    if (currentDiff <= 0) {
      console.log(`[已开赛/已过期，放弃提醒] ${translateCountry(s.country_name)} - ${translateSession(s.session_name)} (已开赛 ${Math.abs(currentDiff).toFixed(1)} 分钟)`);
      continue;
    }

    const inStandard = currentDiff >= WINDOW_STANDARD_MIN && currentDiff <= WINDOW_STANDARD_MAX;
    const inCatchUp = currentDiff > 0 && currentDiff < WINDOW_CATCHUP_MAX;

    if (inStandard || inCatchUp) {
      if (history[item.key]) {
        console.log(`[已提醒过，跳过重复] ${translateCountry(s.country_name)} - ${translateSession(s.session_name)}`);
        continue;
      }

      const gp = `${translateCountry(s.country_name)} 大奖赛`;
      const sn = translateSession(s.session_name);
      const loc = translateLocation(s.location);
      const stStr = new Date(item.startTime.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      const rem = Math.max(1, Math.round(currentDiff));

      const logType = inCatchUp ? '紧急补发' : '标准开赛前30分钟';
      console.log(`>>> [${logType}] 正在向机器人发送通知: ${gp} - ${sn} (实时倒计时: ${rem} 分钟)`);

      try {
        await sendPush(pushKey, gp, sn, loc, stStr, rem, inCatchUp);
        // 发送成功后立即更新并写入历史磁盘，避免后续意外导致丢失！
        const currentBeijingTime = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
        history[item.key] = {
          sent_at: currentBeijingTime,
          mode: inCatchUp ? 'catch-up' : 'standard',
          gp, sn, stStr,
          rem_minutes: rem
        };
        saveHistory(historyFile, history);
        triggeredCount++;
      } catch (err) {
        console.error(`[推送失败] 场次 ${item.key} 错误: ${err.message}`);
        errors.push(err);
      }
    }
  }

  if (triggeredCount > 0) {
    console.log(`本次运行共成功推送并记录 ${triggeredCount} 场赛事提醒。`);
  } else {
    console.log(`当前无处于开赛前提醒区间 [0~35 分钟] 内的待通知环节。`);
  }

  // 关键：若有待通知场次但发送失败，必须抛错以使 GitHub Actions 报红告警
  if (errors.length > 0) {
    throw new Error(`本次检查中有 ${errors.length} 条推送发送失败: ${errors.map(e => e.message).join('; ')}`);
  }

  console.log('=============================================');
}

main().catch((err) => {
  console.error('[执行致命失败]', err.message);
  process.exit(1);
});
