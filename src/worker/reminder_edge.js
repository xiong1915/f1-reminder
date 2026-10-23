// src/worker/reminder_edge.js
// Cloudflare Worker Edge Native 独立提醒引擎 (f1-reminder-worker)
// 由 1 分钟 Cron 调度，支持赛程缓存降级、API 429 规避与 Redis 原子防重

import officialSchedule from '../providers/official_schedule.js';
const {verifyOfficialSessions}=officialSchedule;
const COUNTRY_MAP = {
  "Bahrain": "巴林", "Saudi Arabia": "沙特阿拉伯", "Australia": "澳大利亚", "Japan": "日本",
  "China": "中国", "United States": "美国", "USA": "美国", "Italy": "意大利", "Monaco": "摩纳哥",
  "Canada": "加拿大", "Spain": "西班牙", "Austria": "奥地利", "Great Britain": "英国",
  "Hungary": "匈牙利", "Belgium": "比利时", "Netherlands": "荷兰", "Azerbaijan": "阿塞拜疆",
  "Singapore": "新加坡", "Mexico": "墨西哥", "Brazil": "巴西", "Qatar": "卡塔尔",
  "United Arab Emirates": "阿联酋"
};

const SESSION_MAP = {
  "FirstPractice": "第一次自由练习赛 (FP1)",
  "SecondPractice": "第二次自由练习赛 (FP2)",
  "ThirdPractice": "第三次自由练习赛 (FP3)",
  "Practice 1": "第一次自由练习赛 (FP1)",
  "Practice 2": "第二次自由练习赛 (FP2)",
  "Practice 3": "第三次自由练习赛 (FP3)",
  "SprintQualifying": "冲刺排位赛 (Sprint Quali)",
  "Sprint Shootout": "冲刺排位赛 (Sprint Shootout)",
  "Sprint": "冲刺赛 (Sprint Race)",
  "Qualifying": "大奖赛排位赛 (Quali)",
  "Race": "大奖赛正赛 (Main Race)"
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

export function translateCountry(c) { return COUNTRY_MAP[c] || c || '未知大奖赛'; }
export function translateLocation(l) { return LOCATION_MAP[l] || l || '未知地点'; }
export function translateSession(s) { return SESSION_MAP[s] || s || '未知环节'; }

export function formatBeijingDisplay(isoUtcStr) {
  const d = new Date(isoUtcStr);
  if (!Number.isFinite(d.getTime())) return isoUtcStr;
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
}

export function reminderDue(startIso, nowMs) {
  const remaining = Date.parse(startIso) - nowMs;
  return Number.isFinite(remaining) && remaining > 0 && remaining <= 35 * 60000;
}

export function startReminderDue(startIso, nowMs) {
  const elapsed = nowMs - Date.parse(startIso);
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 10 * 60000;
}

export function parseErgastRaces(json) {
  const races = json?.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) return [];
  const fields = [
    ['FirstPractice', 'Practice 1', 'fp1'],
    ['SecondPractice', 'Practice 2', 'fp2'],
    ['ThirdPractice', 'Practice 3', 'fp3'],
    ['SprintQualifying', 'Sprint Qualifying', 'sq'],
    ['SprintShootout', 'Sprint Shootout', 'sq'],
    ['Sprint', 'Sprint', 'sprint'],
    ['Qualifying', 'Qualifying', 'quali'],
    ['Race', 'Race', 'race']
  ];

  const sessions = [];
  for (const r of races) {
    const round = String(r.round || '1');
    const season = String(r.season || new Date().getUTCFullYear());
    const country = r.Circuit?.Location?.country || 'F1';
    const locality = r.Circuit?.Location?.locality || '';
    const raceName = r.raceName || `${country} Grand Prix`;

    for (const [field, name, type] of fields) {
      const obj = field === 'Race' ? r : r[field];
      if (!obj?.date || !obj?.time) continue;
      const startIso = `${obj.date}T${obj.time}`;
      const startMs = Date.parse(startIso);
      if (!Number.isFinite(startMs)) continue;

      sessions.push({
        season,
        circuitId: r.Circuit?.circuitId,
        round,
        sessionId: `${type}-${round}`,
        type,
        sessionName: name,
        sessionField: field,
        gpName: `${translateCountry(country)}大奖赛`,
        country,
        locality,
        raceName,
        startTimeUTC: new Date(startMs).toISOString(),
        startTimeMs: startMs
      });
    }
  }
  return sessions;
}

export async function redisCall(url, token, command, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([command]),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  if(data[0]?.error) throw Error('Redis command rejected: '+data[0].error);
  return data[0]?.result;
}

// 内存赛程缓存（Worker 全局生命周期复用）
let inMemoryCalendarCache = {
  season: null,
  fetchedAt: 0,
  sessions: [],
  backoffUntil: 0
};

export function getInMemoryCalendarCache() {
  return inMemoryCalendarCache;
}

export function resetInMemoryCalendarCache() {
  inMemoryCalendarCache = {
    season: null,
    fetchedAt: 0,
    sessions: [],
    backoffUntil: 0
  };
}

/**
 * 依据与下一场比赛的临近度计算动态赛历刷新间隔
 * 避免每分钟无条件请求 Jolpica，降低网络开销与 429 风险
 */
export function getCalendarRefreshInterval(sessions, nowMs) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return 10 * 60 * 1000; // 默认 10 分钟重试
  }
  const upcoming = sessions.filter(s => s.startTimeMs > nowMs);
  if (upcoming.length === 0) {
    return 12 * 3600 * 1000; // 赛季已结束或无赛程：12 小时刷新
  }
  const nextSession = upcoming.reduce((min, s) => s.startTimeMs < min.startTimeMs ? s : min, upcoming[0]);
  const diffMs = nextSession.startTimeMs - nowMs;

  if (diffMs > 7 * 24 * 3600 * 1000) {
    return 12 * 3600 * 1000; // > 7 天（非比赛周）：12 小时刷新
  } else if (diffMs > 24 * 3600 * 1000) {
    return 6 * 3600 * 1000; // 1-7 天（比赛周）：6 小时刷新
  } else if (diffMs > 2 * 3600 * 1000) {
    return 3600 * 1000; // 2-24 小时（比赛日）：1 小时刷新
  } else {
    return 10 * 60 * 1000; // 临近 2 小时：10 分钟刷新（捕捉临场官方改期，同时避免每分钟轰炸）
  }
}

/**
 * 多级赛程拉取策略：内存 -> Redis 持久化 -> Jolpica 上游 (支持 429 与网络故障降级)
 */
export async function getOrFetchCalendar(env, season, nowMs, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

  // 1. 如果调用方直接传入 sessions（如离线测试），直接使用
  if (options.sessions) {
    return { sessions: options.sessions, source: 'options' };
  }

  // 2. 检查内存缓存
  const currentInterval = getCalendarRefreshInterval(inMemoryCalendarCache.sessions, nowMs);
  const memFresh = inMemoryCalendarCache.season === season &&
    inMemoryCalendarCache.sessions.length > 0 &&
    (nowMs - inMemoryCalendarCache.fetchedAt) < currentInterval;

  if (memFresh && !options.forceRefresh) {
    return { sessions: inMemoryCalendarCache.sessions, source: 'memory_cache' };
  }

  // 3. 若内存冷启动或过期，且配置了 Redis，尝试读取 Redis 持久化缓存
  if (redisUrl && redisToken && !options.forceRefresh) {
    try {
      const cached = await redisCall(redisUrl, redisToken, ['get', `f1:reminder:calendar:${season}`], fetchImpl);
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
        const cachedAt = parsed.updatedAt ? Date.parse(parsed.updatedAt) : 0;
        const redisInterval = getCalendarRefreshInterval(parsed.sessions, nowMs);
        if (nowMs - cachedAt < redisInterval) {
          inMemoryCalendarCache = {
            season,
            fetchedAt: cachedAt,
            sessions: parsed.sessions,
            backoffUntil: inMemoryCalendarCache.backoffUntil
          };
          return { sessions: parsed.sessions, source: 'redis_cache' };
        }
      }
    } catch (e) {
      console.warn(`[Edge Reminder] Reading Redis calendar cache failed: ${e.message}`);
    }
  }

  // 4. 若在 429 或故障退避冷却期内，直接返回现存内存/Redis缓存
  if (nowMs < inMemoryCalendarCache.backoffUntil && inMemoryCalendarCache.sessions.length > 0) {
    return { sessions: inMemoryCalendarCache.sessions, source: 'backoff_fallback' };
  }

  // 5. 请求 Jolpica 上游赛历
  try {
    const calRes = await fetchImpl(`https://api.jolpi.ca/ergast/f1/${season}.json?limit=100`, {
      signal: AbortSignal.timeout(10000)
    });

    if (calRes.status === 429) {
      console.warn('[Edge Reminder] Jolpica API 429 Too Many Requests, entering 15m backoff.');
      inMemoryCalendarCache.backoffUntil = nowMs + 15 * 60 * 1000;
      if (inMemoryCalendarCache.sessions.length > 0) {
        return { sessions: inMemoryCalendarCache.sessions, source: 'rate_limited_fallback' };
      }
      return { sessions: [], source: 'rate_limited_empty' };
    }

    if (calRes.ok) {
      const calData = await calRes.json();
      const sessions = parseErgastRaces(calData);
      if (sessions.length > 0) {
        inMemoryCalendarCache = {
          season,
          fetchedAt: nowMs,
          sessions,
          backoffUntil: 0
        };

        // 异步写入 Redis 缓存 (TTL 1 天)
        if (redisUrl && redisToken) {
          try {
            await redisCall(redisUrl, redisToken, [
              'set', `f1:reminder:calendar:${season}`, JSON.stringify({
                updatedAt: new Date(nowMs).toISOString(),
                sessions
              }),
              'ex', 86400
            ], fetchImpl);
          } catch (_) {}
        }

        return { sessions, source: 'jolpica_live' };
      }
    }

    // 非 200 状态码
    console.warn(`[Edge Reminder] Jolpica HTTP ${calRes.status}, falling back to cache.`);
    inMemoryCalendarCache.backoffUntil = nowMs + 5 * 60 * 1000;
  } catch (e) {
    console.warn(`[Edge Reminder] Fetching Jolpica calendar network failed: ${e.message}`);
    inMemoryCalendarCache.backoffUntil = nowMs + 5 * 60 * 1000;
  }

  // 6. 网络异常或上游故障降级：使用现有缓存
  if (inMemoryCalendarCache.sessions.length > 0) {
    return { sessions: inMemoryCalendarCache.sessions, source: 'network_error_fallback' };
  }

  return { sessions: [], source: 'failed_empty' };
}

export async function sendFeishuReminder({ webhookUrl, gpName, sessionName, locality, timeStr, remMin, phase, fetchImpl = globalThis.fetch }) {
  const isStart = phase === 'start';
  const headerTitle = isStart
    ? `🏎️ 【开赛时间提醒】已到官方赛程时间`
    : (remMin <= 20
      ? `🏎️ 【即将开赛紧急提醒】仅剩 ${remMin} 分钟`
      : `🏎️ F1 比赛开赛提醒 (前30分钟)`);

  const noteText = isStart
    ? `🏁 已到官方赛程开赛时间，实际是否延迟，请以现场公告为准。`
    : (remMin <= 20
      ? `⚠️ 提示：开赛在即（剩余约 ${remMin} 分钟），请立即就位观赛！🏁`
      : `🏁 五盏红灯熄灭，精彩即将开赛，请做好观赛准备！`);

  const cardPayload = {
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: headerTitle },
        template: isStart ? "red" : (remMin <= 20 ? "orange" : "carmine")
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**🏆 大奖赛**：${gpName}\n**⏱️ 环节**：${sessionName}\n**📍 赛道地点**：${locality}\n**⏰ 开赛时间**：${timeStr} (北京时间)\n${isStart ? '**🏁 状态**：**已到官方赛程开赛时间**' : `**⏳ 倒计时**：约 **${remMin} 分钟**`}`
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

  return sendFeishuPayload({webhookUrl,payload:cardPayload,fetchImpl});
}

export async function sendFeishuPayload({webhookUrl,payload,fetchImpl=globalThis.fetch}) {
  let res;
  try {
    res = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    const netErr = new Error(`Feishu network error: ${err.message}`);
    const preConnectCodes = ['ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'];
    if (err.code && preConnectCodes.includes(err.code)) {
      netErr.deliveryStatus = 'not_delivered';
      netErr.isSafeToRetry = true;
      netErr.isRejected = true;
    } else {
      netErr.deliveryStatus = 'uncertain';
      netErr.isDeliveryUncertain = true;
    }
    throw netErr;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const httpErr = new Error(`Feishu HTTP ${res.status}: ${errText}`);
    httpErr.deliveryStatus = 'failed_response';
    httpErr.isRejected = true;
    throw httpErr;
  }
  const data = await res.json().catch(() => ({}));
  if ((typeof data.code === 'number' && data.code !== 0) || (typeof data.StatusCode === 'number' && data.StatusCode !== 0)) {
    const bizErr = new Error(`Feishu business error: code ${data.code || data.StatusCode}, msg ${data.msg || data.StatusMessage}`);
    bizErr.deliveryStatus = 'failed_response';
    bizErr.isRejected = true;
    throw bizErr;
  }
  if(data.code!==0 && data.StatusCode!==0) throw Error('Feishu response missing explicit success code');
  return data;
}

export async function checkAndDeliverEdgeReminders(env, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const nowMs = options.nowMs || Date.now();
  const scheduledTime = options.scheduledTime || new Date(nowMs).toISOString();

  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  const webhookUrl = env.FEISHU_WEBHOOK_URL || env.PUSH_KEY;
  if(!redisUrl||!redisToken||!webhookUrl) throw Error('Redis and Feishu webhook are required');

  let season = String(new Date(nowMs).getUTCFullYear());
  
  // 赛程拉取与多级缓存解析
  let { sessions, source: calendarSource } = await getOrFetchCalendar(env, season, nowMs, options);

  // 跨赛季/年末保护：若当前年份无即将到来的比赛且临近年末（11-12月），尝试联合查询下一赛季赛历
  const upcomingInSeason = sessions.filter(s => s.startTimeMs > nowMs);
  if (upcomingInSeason.length === 0 && new Date(nowMs).getUTCMonth() >= 10 && !options.sessions) {
    const nextSeason = String(new Date(nowMs).getUTCFullYear() + 1);
    try {
      const nextCal = await getOrFetchCalendar(env, nextSeason, nowMs, options);
      if (nextCal.sessions && nextCal.sessions.length > 0) {
        sessions = sessions.concat(nextCal.sessions);
      }
    } catch (_) {}
  }

  if(!sessions.length) throw Error('Calendar unavailable or empty');
  const verified=options.sessions?{sessions,official:[]} : await verifyOfficialSessions(sessions,nowMs,fetchImpl);
  sessions=verified.sessions;
  const results = [];
  const errors = [];

  for (const s of sessions) {
    const diffMins = (s.startTimeMs - nowMs) / 60000;
    let phase = null;
    if (diffMins > 0 && diffMins <= 35.0) {
      phase = 'before';
    } else if (diffMins <= 0 && diffMins > -10.0) {
      phase = 'start';
    }
    if (!phase) continue;

    // 唯一防重键：强绑定赛段具体开赛时间 startTimeUTC
    // 比赛若改期，将自动生成新键，不会被旧时间的记录错误阻断
    const baseKey = `f1:delivery:${s.season}:${s.round}:${s.sessionId}:${s.startTimeUTC}`;
    const targetKey = phase === 'start' ? `${baseKey}:start` : baseKey;

    // 1. Redis 原子占用 (SET NX EX 120)
    let claimed = true;
    let claimError = null;
    if (redisUrl && redisToken) {
      try {
        const claimRes = await redisCall(redisUrl, redisToken, [
          'set', targetKey, JSON.stringify({ status: 'pending', attemptedAt: new Date(nowMs).toISOString() }),
          'nx', 'ex', 120
        ], fetchImpl);
        claimed = (claimRes === 'OK');
      } catch (e) {
        claimed = false;
        claimError = e;
        errors.push({ key: targetKey, error: `Claim error: ${e.message}`, status: 'storage_error' });
      }
    }

    // 2. 占用失败（并发、已存在或存储异常）
    if (!claimed) {
      if (claimError) {
        results.push({
          session: `${s.gpName} - ${translateSession(s.sessionName)}`,
          key: targetKey,
          phase,
          status: 'storage_error',
          remainingMinutes: diffMins,
          error: claimError.message
        });
        continue;
      }

      let previousStatus = 'suppressed';
      if (redisUrl && redisToken) {
        try {
          const prev = await redisCall(redisUrl, redisToken, ['get', targetKey], fetchImpl);
          const parsed = typeof prev === 'string' ? JSON.parse(prev) : prev;
          previousStatus = parsed?.status || 'suppressed';
        } catch (_) {}
      }
      results.push({
        session: `${s.gpName} - ${translateSession(s.sessionName)}`,
        key: targetKey,
        phase,
        status: previousStatus === 'uncertain' || previousStatus === 'pending' ? previousStatus : 'suppressed',
        remainingMinutes: diffMins
      });
      continue;
    }

    // 3. 执行推送并区分状态：sent / failed / uncertain
    let sendStatus = 'sent';
    if (webhookUrl) {
      try {
        const timeStr = formatBeijingDisplay(s.startTimeUTC);
        const remMin = phase === 'start' ? 0 : Math.max(1, Math.round(diffMins));
        await sendFeishuReminder({
          webhookUrl,
          gpName: s.gpName,
          sessionName: translateSession(s.sessionName),
          locality: translateLocation(s.locality || s.country),
          timeStr,
          remMin,
          phase,
          fetchImpl
        });
      } catch (err) {
        if (err.isRejected || err.deliveryStatus === 'failed_response' || err.deliveryStatus === 'not_delivered') {
          sendStatus = 'failed';
        } else {
          sendStatus = 'uncertain';
        }
        errors.push({ key: targetKey, error: err.message, status: sendStatus });
      }
    }

    // 4. 根据发送结果更新 Redis
    if (redisUrl && redisToken) {
      try {
        if (sendStatus === 'sent') {
          // 成功送达：设置 7 天持久去重 (604800s)
          await redisCall(redisUrl, redisToken, [
            'set', targetKey, JSON.stringify({
              status: 'sent',
              updatedAt: new Date(nowMs).toISOString(),
              phase,
              round: s.round,
              source: 'cloudflare_edge'
            }),
            'ex', 604800
          ], fetchImpl);
        } else if (sendStatus === 'failed') {
          // 明确拒绝或预先建连失败：立即释放锁 (DEL)，允许下次检查重试
          await redisCall(redisUrl, redisToken, ['del', targetKey], fetchImpl);
        } else if (sendStatus === 'uncertain') {
          // 结果不明超时：设置 60 秒短 TTL，防止立即重复，窗口过后可自动恢复重试
          await redisCall(redisUrl, redisToken, [
            'set', targetKey, JSON.stringify({
              status: 'uncertain',
              updatedAt: new Date(nowMs).toISOString(),
              phase,
              round: s.round,
              source: 'cloudflare_edge'
            }),
            'ex', 60
          ], fetchImpl);
        }
      } catch (e) {
        errors.push({ key: targetKey, error: `Redis update error: ${e.message}` });
        console.warn(`[Edge Reminder] Updating Redis status failed: ${e.message}`);
      }
    }

    results.push({
      session: `${s.gpName} - ${translateSession(s.sessionName)}`,
      key: targetKey,
      phase,
      status: sendStatus,
      remainingMinutes: diffMins
    });
  }

  const healthPayload = {
    checkedAt: new Date(nowMs).toISOString(),
    scheduledAt: scheduledTime,
    source: options.source || 'cloudflare',
    official: verified.official,
    calendarSource,
    results,
    meetingCount: sessions.length,
    activeCandidates: results.length,
    errors: errors.length > 0 ? errors : undefined
  };

  if (redisUrl && redisToken) {
    try {
      await redisCall(redisUrl, redisToken, [
        'set', `f1:reminder:health:${options.source==='github'?'github':'cloudflare'}`, JSON.stringify(healthPayload), 'ex', 604800
      ], fetchImpl);
      await redisCall(redisUrl, redisToken, [
        'set', 'f1:reminder:health', JSON.stringify(healthPayload), 'ex', 604800
      ], fetchImpl);
    } catch (_) {}
  }

  return healthPayload;
}

export async function getReminderHealth(env, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return { status: 'unconfigured', message: 'Upstash Redis not configured' };
  }

  try {
    const health = await redisCall(redisUrl, redisToken, ['get', 'f1:reminder:health'], fetchImpl);
    const cfHealth = await redisCall(redisUrl, redisToken, ['get', 'f1:reminder:health:cloudflare'], fetchImpl);
    const ghHealth = await redisCall(redisUrl, redisToken, ['get', 'f1:reminder:health:github'], fetchImpl);

    const parse = (v) => {
      if (!v) return null;
      try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (_) { return v; }
    };
    return {
      health: parse(health),
      cloudflare: parse(cfHealth),
      github: parse(ghHealth)
    };
  } catch (e) {
    return { error: 'Failed to read health from Redis', message: e.message };
  }
}
