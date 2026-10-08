// src/cache/kv_cache.js
// 边缘缓存层：细粒度 TTL、Stale-While-Revalidate 与 Last-Known-Good 模式

export const TTL_CONFIG = {
  CALENDAR: 7200,      // 赛历：2 小时
  STANDINGS: 1800,     // 积分榜：30 分钟
  LAST_RESULT: 3600,   // 上站赛果：1 小时
  OVERVIEW: 900,       // 首页 Overview：15 分钟
  LIVE: 60,            // 实时状态：1 分钟
  NEWS: 900            // 实时新闻：15 分钟
};

// 内存二级缓存（应对未绑定 KV 时的单元测试及边缘 Isolate 本地命中）
const memoryCache = new Map();

/**
 * 读取缓存，支持 Stale-While-Revalidate 标记
 * @param {string} key 
 * @param {object} [env] 
 * @returns {Promise<{ found: boolean, data: any, updatedAt: string|null, isStale: boolean }>}
 */
export async function getCache(key, env) {
  let cachedPayload = null;

  if (env && env.KV_CHAT) {
    try {
      cachedPayload = await env.KV_CHAT.get(key, { type: 'json' });
    } catch (e) {
      console.warn(`[KV Cache Get Error]: key=${key}`, e.message);
    }
  }

  if (!cachedPayload) {
    cachedPayload = memoryCache.get(key) || null;
  }

  if (!cachedPayload || typeof cachedPayload !== 'object') {
    return { found: false, data: null, updatedAt: null, isStale: false };
  }

  const { data, timestamp, ttl } = cachedPayload;
  const ageSeconds = (Date.now() - timestamp) / 1000;
  const isStale = ttl ? ageSeconds > ttl : false;

  return {
    found: true,
    data,
    updatedAt: new Date(timestamp).toISOString(),
    isStale
  };
}

/**
 * 写入缓存
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttlSeconds 
 * @param {object} [env] 
 */
export async function setCache(key, data, ttlSeconds = 1800, env) {
  const payload = {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds
  };

  memoryCache.set(key, payload);

  if (env && env.KV_CHAT) {
    try {
      // KV expirationTtl 给予宽限期（例如 2 倍 TTL，以便在 Provider 挂掉时允许获取 stale 数据）
      const kvExpiration = Math.max(ttlSeconds * 2, 3600);
      await env.KV_CHAT.put(key, JSON.stringify(payload), { expirationTtl: kvExpiration });
    } catch (e) {
      console.warn(`[KV Cache Put Error]: key=${key}`, e.message);
    }
  }
}
