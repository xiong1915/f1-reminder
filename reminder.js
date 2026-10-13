// reminder.js - F1 比赛云端与本地跨平台检测脚本 (Node.js 原生零依赖)
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const {
  COUNTRY_MAP,
  LOCATION_MAP,
  SESSION_MAP,
  translateCountry,
  translateLocation,
  translateSession
} = require('./src/translations');
const {
  loadHistory,
  saveHistory,
  normalizeHistoryKeys,
  findHistoryRecord,
  mergeHistory,
  isSentRecord,
  isUncertainRecord
} = require('./src/history');
const {
  WINDOW_STANDARD_MIN,
  WINDOW_STANDARD_MAX,
  WINDOW_CATCHUP_MAX,
  WINDOW_START_MAX_ELAPSED,
  isStandardWindow,
  isCatchupWindow,
  isStartWindow
} = require('./src/timing');


const CACHE_MAX_AGE_DAYS = 7; // 本地赛程缓存最大有效期（天），超过该天数的旧缓存拒绝作为灾备使用

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
      res.on('error', (err) => reject(new Error(`响应数据流传输中断: ${err.message}`)));
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

function postJson(urlStr, payload, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = u.protocol === 'https:' ? https : http;
    const body = Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf-8');
    let hasSentPayload = false;
    let hasReceivedResponse = false;

    const req = client.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'User-Agent': 'F1ReminderBot/1.0',
        ...extraHeaders
      }
    }, (res) => {
      hasReceivedResponse = true;
      res.on('error', (err) => {
        const streamErr = new Error(`响应数据流传输中断: ${err.message}`);
        // 已收到响应头，说明服务端已受理请求，但在接收完整响应体时发生中断；送达状态不确定，不可自动重试
        streamErr.deliveryStatus = 'uncertain';
        streamErr.isDeliveryUncertain = true;
        streamErr.isResponseTimeout = true;
        reject(streamErr);
      });
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const httpErr = new Error(`HTTP ${res.statusCode}: ${data}`);
          // 明确收到服务端响应，属于明确响应失败
          httpErr.deliveryStatus = 'failed_response';
          httpErr.isHttpFailure = true;
          return reject(httpErr);
        }
        resolve(data);
      });
    });

    req.on('error', (err) => {
      const netErr = new Error(`推送网络错误: ${err.message}`);
      // 关键精确识别：若在建立连接阶段即发生失败（如 DNS 解析失败 ENOTFOUND、TCP 拒绝 ECONNREFUSED、主机不可达 EHOSTUNREACH 等）
      // 此时数据在物理上绝不可能抵达服务端，100% 确定未送达，属于可安全重试故障
      const preConnectCodes = ['ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'];
      if (err.code && preConnectCodes.includes(err.code)) {
        netErr.deliveryStatus = 'not_delivered';
        netErr.isSafeToRetry = true;
      } else if (hasSentPayload || hasReceivedResponse) {
        netErr.deliveryStatus = 'uncertain';
        netErr.isDeliveryUncertain = true;
        netErr.isResponseTimeout = true;
      } else {
        netErr.deliveryStatus = 'not_delivered';
        netErr.isSafeToRetry = true;
      }
      reject(netErr);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      const err = new Error(`推送接口响应超时 (15s)`);
      if (hasSentPayload) {
        // 请求体已发出但在时限内未获完整服务端确认，保守判定为 uncertain
        err.deliveryStatus = 'uncertain';
        err.isDeliveryUncertain = true;
        err.isResponseTimeout = true;
      } else {
        err.deliveryStatus = 'not_delivered';
        err.isSafeToRetry = true;
      }
      reject(err);
    });

    req.write(body);
    hasSentPayload = true;
    req.end();
  });
}

function postForm(urlStr, formData) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = u.protocol === 'https:' ? https : http;
    const postData = querystring.stringify(formData);
    const body = Buffer.from(postData, 'utf-8');
    let hasSentPayload = false;
    let hasReceivedResponse = false;

    const req = client.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'Content-Length': body.length,
        'User-Agent': 'F1ReminderBot/1.0'
      }
    }, (res) => {
      hasReceivedResponse = true;
      res.on('error', (err) => {
        const streamErr = new Error(`表单响应数据流传输中断: ${err.message}`);
        // 已收到响应头，说明服务端已受理请求，但在接收完整响应体时发生中断；送达状态不确定，不可自动重试
        streamErr.deliveryStatus = 'uncertain';
        streamErr.isDeliveryUncertain = true;
        streamErr.isResponseTimeout = true;
        reject(streamErr);
      });
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const httpErr = new Error(`HTTP ${res.statusCode}: ${data}`);
          httpErr.deliveryStatus = 'failed_response';
          httpErr.isHttpFailure = true;
          return reject(httpErr);
        }
        resolve(data);
      });
    });

    req.on('error', (err) => {
      const netErr = new Error(`表单推送网络错误: ${err.message}`);
      const preConnectCodes = ['ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'];
      if (err.code && preConnectCodes.includes(err.code)) {
        netErr.deliveryStatus = 'not_delivered';
        netErr.isSafeToRetry = true;
      } else if (hasSentPayload || hasReceivedResponse) {
        netErr.deliveryStatus = 'uncertain';
        netErr.isDeliveryUncertain = true;
        netErr.isResponseTimeout = true;
      } else {
        netErr.deliveryStatus = 'not_delivered';
        netErr.isSafeToRetry = true;
      }
      reject(netErr);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      const err = new Error(`表单推送接口超时 (15s)`);
      if (hasSentPayload) {
        err.deliveryStatus = 'uncertain';
        err.isDeliveryUncertain = true;
        err.isResponseTimeout = true;
      } else {
        err.deliveryStatus = 'not_delivered';
        err.isSafeToRetry = true;
      }
      reject(err);
    });

    req.write(body);
    hasSentPayload = true;
    req.end();
  });
}

// 严谨校验平台响应 JSON：若已拿到 HTTP 200 响应但正文解析损坏，说明服务端大概率已受理并广播，标记为 uncertain 防止重复发送
function parseJsonResponse(channelName, resStr) {
  try {
    return JSON.parse(resStr);
  } catch (e) {
    const jsonErr = new Error(`[${channelName}] HTTP已返回200但响应非合法JSON: ${resStr}`);
    jsonErr.deliveryStatus = 'uncertain';
    jsonErr.isDeliveryUncertain = true;
    throw jsonErr;
  }
}

// 可选同步至 Upstash Redis（保持边缘 Worker 与本地/Actions 状态双向一致）
async function syncRedisDelivery(keys, payload) {
  const rUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const rToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!rUrl || !rToken || !keys || !keys.length) return;
  try {
    const jsonStr = JSON.stringify(payload);
    await Promise.allSettled(keys.map(k => {
      return postJson(`${rUrl}/set/${encodeURIComponent(k)}?ex=604800`, jsonStr, {
        Authorization: `Bearer ${rToken}`
      });
    }));
  } catch (e) {
    console.warn(`[Redis同步警告] 历史状态写入 Upstash Redis 异常: ${e.message}`);
  }
}

// 统一推送分发器
async function sendPush(pushKey, gpName, sessionName, locName, timeStr, remMin, isCatchUp = false, phase = 'before') {
  const isStart = phase === 'start';
  const headerTitle = isStart
    ? `🏎️ 【比赛已正式开赛】五盏红灯熄灭`
    : (isCatchUp 
      ? `🏎️ 【即将开赛紧急提醒】仅剩 ${remMin} 分钟` 
      : `🏎️ F1 比赛开赛提醒 (前30分钟)`);

  const title = isStart
    ? `🏎️ F1 开赛提醒: ${gpName} - ${sessionName} 已开跑`
    : `🏎️ F1 开赛提醒: ${gpName} - ${sessionName}`;

  const noteText = isStart
    ? `🏁 五盏红灯熄灭，比赛现已开跑！实际是否延迟，请以现场公告为准。`
    : (isCatchUp 
      ? `⚠️ 提示：开赛在即（剩余约 ${remMin} 分钟），请立即就位观赛！🏁` 
      : `🏁 五盏红灯熄灭，精彩即将开赛，请做好观赛准备！`);

  const timeDesc = isStart
    ? `⏰ 开赛时间：${timeStr} (北京时间)\n🏁 状态：已到官方赛程开赛时间`
    : `⏰ 开赛时间：${timeStr} (北京时间)\n⏳ 倒计时：约 ${remMin} 分钟`;

  const content = `${headerTitle}\n━━━━━━━━━━━━━━━━━━\n🏆 大奖赛：${gpName}\n⏱️ 环节：${sessionName}\n📍 赛道：${locName}\n${timeDesc}\n━━━━━━━━━━━━━━━━━━\n${noteText}`;

  if (pushKey.includes('open.feishu.cn') || pushKey.includes('larksuite.com')) {
    // 飞书机器人交互式卡片
    const cardPayload = {
      msg_type: "interactive",
      card: {
        header: {
          title: { tag: "plain_text", content: headerTitle },
          template: isStart ? "red" : (isCatchUp ? "orange" : "carmine")
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**🏆 大奖赛**：${gpName}\n**⏱️ 环节**：${sessionName}\n**📍 赛道地点**：${locName}\n**⏰ 开赛时间**：${timeStr} (北京时间)\n${isStart ? '**🏁 状态**：**已到官方赛程开赛时间**' : `**⏳ 倒计时**：约 **${remMin} 分钟**`}`
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
    const parsed = parseJsonResponse('飞书', resStr);
    if (parsed.code !== 0 && parsed.StatusCode !== 0) {
      throw new Error(`[飞书] 接口返回业务错误 (code: ${parsed.code || parsed.StatusCode}, msg: ${parsed.msg || parsed.StatusMessage})`);
    }
    console.log('[飞书推送成功]');


  } else if (pushKey.includes('qyapi.weixin.qq.com')) {
    // 企业微信机器人
    const colorTag = isCatchUp ? "warning" : "info";
    const md = `### ${headerTitle}\n> **大奖赛**：${gpName}\n> **环节**：${sessionName}\n> **赛道**：${locName}\n> **开赛时间**：${timeStr} (北京时间)\n> **距离开赛**：<font color="${colorTag}">约 ${remMin} 分钟</font>\n\n${noteText}`;
    const resStr = await postJson(pushKey, { msgtype: 'markdown', markdown: { content: md } });
    const parsed = parseJsonResponse('企业微信', resStr);
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
    const parsed = parseJsonResponse('钉钉', resStr);
    if (parsed.errcode !== 0) {
      throw new Error(`[钉钉] 接口返回业务错误 (errcode: ${parsed.errcode}, errmsg: ${parsed.errmsg})`);
    }
    console.log('[钉钉推送成功]');

  } else if (pushKey.includes('ftqq.com') || pushKey.startsWith('SCT')) {
    // Server酱 (Turbo版)
    const targetUrl = pushKey.startsWith('http') ? pushKey : `https://sctapi.ftqq.com/${pushKey.trim()}.send`;
    const desp = `### ${headerTitle}\n- **大奖赛**：${gpName}\n- **环节**：${sessionName}\n- **赛道**：${locName}\n- **开赛时间**：${timeStr} (北京时间)\n- **距离开赛**：约 ${remMin} 分钟\n\n${noteText}`;
    const resStr = await postForm(targetUrl, { title, desp });
    const parsed = parseJsonResponse('Server酱', resStr);
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
    const parsed = parseJsonResponse('Pushplus', resStr);
    if (parsed.code !== 200) {
      throw new Error(`[Pushplus] 接口返回业务错误 (code: ${parsed.code}, msg: ${parsed.msg})`);
    }
    console.log('[Pushplus推送成功]');
  }
}



async function main() {
  let pushKey = (process.env.PUSH_KEY || process.env.FEISHU_WEBHOOK_URL || '').trim();
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
  if (process.env.WEEKLY_PLAN === 'true') {
    const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'weekly-plan.json'), 'utf8'));
    if (plan.version !== 1 || !Array.isArray(plan.sessions) ||
        !Number.isFinite(Date.parse(plan.valid_until)) || Date.now() >= Date.parse(plan.valid_until)) {
      throw new Error('每周提醒计划缺失、损坏或已过期，请运行 F1 Weekly Planner');
    }
    const triggerCron = process.env.SCHEDULE_CRON || '';
    sessions = plan.sessions.filter(s => 
      !triggerCron ||
      s.reminder_cron === triggerCron ||
      s.backup_cron === triggerCron ||
      s.start_cron === triggerCron ||
      s.start_backup_cron === triggerCron
    );
    if (!sessions.length) {
      console.log('当前计划无待提醒比赛，不发送消息');
      return;
    }

  } else {
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
    // 2. 防重唯一键绑定具体开赛时间，同一场比赛一旦改期 (date_start 改变) 允许在新时间按新窗口计算提醒
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

  const candidatesToCheck = [
    ...upcoming,
    ...activeNow.filter(a => isStartWindow(a.diff))
  ];

  if (candidatesToCheck.length === 0) {
    console.log('本赛季当前无待提醒赛程 (无处于赛前或开赛窗口的比赛)。');
    return;
  }

  // 严格选择尚未开赛的真正“下一场”
  if (upcoming.length > 0) {
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
  }

  const historyFile = path.join(__dirname, 'history.json');
  const history = normalizeHistoryKeys(loadHistory(historyFile));

  let triggeredCount = 0;
  let uncertainSkippedCount = 0;
  const errors = [];

  for (const item of candidatesToCheck) {
    const s = item.session;
    const isMatch = monitoredTypes.some(m => 
      (s.session_type && s.session_type.toLowerCase().includes(m.toLowerCase())) || 
      (s.session_name && s.session_name.toLowerCase().includes(m.toLowerCase()))
    );
    if (!isMatch) continue;

    // 关键校准：每次进入判定重新获取当前实际时间，消除网络重试与耗时带来的时延漂移
    const currentNow = Date.now();
    const currentDiff = (item.startTime.getTime() - currentNow) / (60 * 1000);

    let phase = null;
    let inStandard = false;
    let inCatchUp = false;

    if (currentDiff > 0) {
      inStandard = isStandardWindow(currentDiff);
      inCatchUp = isCatchupWindow(currentDiff);
      if (inStandard || inCatchUp) {
        phase = 'before';
      }
    } else if (isStartWindow(currentDiff)) {
      phase = 'start';
    }

    // 若未处于赛前提醒或开赛提醒有效窗口内，跳过
    if (!phase) {
      if (currentDiff <= -WINDOW_START_MAX_ELAPSED) {
        console.log(`[已开赛/已过期，放弃提醒] ${translateCountry(s.country_name)} - ${translateSession(s.session_name)} (已开赛 ${Math.abs(currentDiff).toFixed(1)} 分钟)`);
      }
      continue;
    }

    const targetKey = phase === 'start' ? `${item.key}:start` : item.key;

    // 构造 Redis 格式的备选别名键，确保跨系统平滑去重
    const roundMatch = s.session_key && String(s.session_key).match(/jolpica_\d+_(\d+)_/);
    const roundStr = s.round ? String(s.round) : (roundMatch ? roundMatch[1] : null);
    const seasonStr = String(s.year || now.getFullYear());
    let sessionType = 'session';
    const sName = (s.session_name || '').toLowerCase();
    if (sName.includes('race') || (s.session_type || '').toLowerCase().includes('race')) sessionType = 'race';
    else if (sName.includes('quali') || (s.session_type || '').toLowerCase().includes('quali')) sessionType = 'quali';
    else if (sName.includes('sprint') || (s.session_type || '').toLowerCase().includes('sprint')) sessionType = 'sprint';
    else if (sName.includes('practice 1') || sName.includes('fp1')) sessionType = 'fp1';
    else if (sName.includes('practice 2') || sName.includes('fp2')) sessionType = 'fp2';
    else if (sName.includes('practice 3') || sName.includes('fp3')) sessionType = 'fp3';

    const isoStartMs = item.startTime.toISOString(); // e.g. 2026-10-10T13:00:00.000Z
    const isoStartNoMs = isoStartMs.replace('.000Z', 'Z'); // e.g. 2026-10-10T13:00:00Z
    const suffix = phase === 'start' ? ':start' : '';

    const candidateKeys = [targetKey];
    if (roundStr) {
      candidateKeys.push(`f1:delivery:${seasonStr}:${roundStr}:${sessionType}-${roundStr}:${isoStartMs}${suffix}`);
      candidateKeys.push(`f1:delivery:${seasonStr}:${roundStr}:${sessionType}-${roundStr}:${isoStartNoMs}${suffix}`);
      candidateKeys.push(`f1:delivery:${seasonStr}:${roundStr}:${sessionType}:${isoStartMs}${suffix}`);
      candidateKeys.push(`f1:delivery:${seasonStr}:${roundStr}:${sessionType}:${isoStartNoMs}${suffix}`);
      if (s.session_key) {
        candidateKeys.push(`f1:delivery:${seasonStr}:${roundStr}:${s.session_key}:${isoStartMs}${suffix}`);
        candidateKeys.push(`f1:delivery:${seasonStr}:${roundStr}:${s.session_key}:${isoStartNoMs}${suffix}`);
      }
    }

    const sessionContext = {
      startTimeMs: item.startTime.getTime(),
      phase
    };
    const existing = findHistoryRecord(history, candidateKeys, sessionContext);

    if (existing) {
      if (isUncertainRecord(existing)) {
        console.warn(`::warning file=reminder.js::[待人工确认告警] 场次 ${targetKey} (${translateCountry(s.country_name)} - ${translateSession(s.session_name)}) 先前推送状态不确定 (uncertain，尝试于 ${existing.attempted_at || '未知'})。为防重复发送，本次触发已跳过自动推送。`);
        uncertainSkippedCount++;
        continue;
      } else if (isSentRecord(existing)) {
        console.log(`[已提醒过，跳过重复] ${translateCountry(s.country_name)} - ${translateSession(s.session_name)} (${phase === 'start' ? '开赛提醒' : '赛前提醒'})`);
        continue;
      }
    }

    const gp = `${translateCountry(s.country_name)} 大奖赛`;
    const sn = translateSession(s.session_name);
    const loc = translateLocation(s.location);
    const stStr = new Date(item.startTime.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const rem = phase === 'start' ? 0 : Math.max(1, Math.round(currentDiff));

    const logType = phase === 'start' ? '开赛提醒' : (inCatchUp ? '紧急补发' : '标准开赛前30分钟');
    console.log(`>>> [${logType}] 正在向机器人发送通知: ${gp} - ${sn} (实时时间差: ${currentDiff.toFixed(1)} 分钟)`);

    let pushSuccess = false;
    let uncertainErr = null;
    const MAX_PUSH_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_PUSH_RETRIES; attempt++) {
      try {
        await sendPush(pushKey, gp, sn, loc, stStr, rem, inCatchUp, phase);
        pushSuccess = true;
        break;
      } catch (err) {
        if (err.deliveryStatus === 'uncertain' || err.isDeliveryUncertain === true || err.isResponseTimeout === true) {
          console.error(`[推送状态不确定 (Uncertain)] 场次 ${targetKey} 请求体已写出，但在获取完整响应前发生异常: ${err.message}。Node.js HTTP 层无法确认服务端是否已接收或已发送消息。为防群内重复轰炸，放弃自动重试；严禁记为发送成功，该场次已转交 Actions 异常告警。`);
          uncertainErr = err;
          errors.push(err);
          break;
        }

        if (attempt < MAX_PUSH_RETRIES) {
          const delayMs = attempt * 2000;
          const retryDesc = err.deliveryStatus === 'not_delivered' ? '明确未送达，执行安全重试' : '收到明确服务失败响应，执行受控重试';
          console.warn(`[推送重试 ${attempt}/${MAX_PUSH_RETRIES}] 场次 ${targetKey} (${retryDesc}): ${err.message}，将在 ${delayMs / 1000}s 后重试...`);
          await new Promise(r => setTimeout(r, delayMs));
        } else {
          console.error(`[推送彻底失败] 场次 ${targetKey} 连续 ${MAX_PUSH_RETRIES} 次尝试均失败: ${err.message}`);
          errors.push(err);
        }
      }
    }

    if (pushSuccess) {
      const currentBeijingTime = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      const triggerType = phase === 'start' ? 'start' : (inCatchUp ? 'catch-up' : (inStandard ? 'primary' : 'backup'));
      history[targetKey] = {
        status: 'sent',
        sent_at: currentBeijingTime,
        trigger: triggerType,
        phase: phase,
        mode: inCatchUp ? 'catch-up' : (phase === 'start' ? 'start' : 'standard'),
        gp, sn, stStr,
        rem_minutes: rem
      };
      saveHistory(historyFile, history);
      triggeredCount++;
      await syncRedisDelivery(candidateKeys, {
        status: 'sent',
        sent_at: currentBeijingTime,
        updatedAt: new Date().toISOString(),
        source: 'reminder_script',
        phase: phase
      });
    } else if (uncertainErr) {
      const currentBeijingTime = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      const triggerType = phase === 'start' ? 'start' : (inCatchUp ? 'catch-up' : (inStandard ? 'primary' : 'backup'));
      history[targetKey] = {
        status: 'uncertain',
        attempted_at: currentBeijingTime,
        trigger: triggerType,
        phase: phase,
        mode: inCatchUp ? 'catch-up' : (phase === 'start' ? 'start' : 'standard'),
        gp, sn, stStr,
        rem_minutes: rem,
        error: uncertainErr.message
      };
      saveHistory(historyFile, history);
      await syncRedisDelivery(candidateKeys, {
        status: 'uncertain',
        attempted_at: currentBeijingTime,
        updatedAt: new Date().toISOString(),
        source: 'reminder_script',
        phase: phase,
        error: uncertainErr.message
      });
    }
  }

  if (triggeredCount > 0) {
    console.log(`本次运行共成功推送并记录 ${triggeredCount} 场赛事提醒。`);
  } else {
    console.log(`当前无处于开赛前或开赛提醒区间内的待通知环节。`);
  }


  if (uncertainSkippedCount > 0) {
    console.warn(`::warning::本次检查发现 ${uncertainSkippedCount} 场赛事先前推送状态为 uncertain，为防重复已跳过自动补发，请人工确认！`);
  }

  // 关键：若有待通知场次但发送失败，必须抛错以使 GitHub Actions 报红告警
  if (errors.length > 0) {
    throw new Error(`本次检查中有 ${errors.length} 条推送发送失败: ${errors.map(e => e.message).join('; ')}`);
  }

  console.log('=============================================');
}

module.exports = {
  CACHE_MAX_AGE_DAYS,
  COUNTRY_MAP,
  LOCATION_MAP,
  SESSION_MAP,
  translateCountry,
  translateLocation,
  translateSession,
  loadHistory,
  saveHistory,
  normalizeHistoryKeys,
  isSentRecord,
  isUncertainRecord,
  WINDOW_STANDARD_MIN,
  WINDOW_STANDARD_MAX,
  WINDOW_CATCHUP_MAX,
  isStandardWindow,
  isCatchupWindow,
  postJson,
  postForm,
  parseJsonResponse,
  sendPush,
  main
};

if (require.main === module) {
  main().catch((err) => {
    console.error('[执行致命失败]', err.message);
    process.exit(1);
  });
}
