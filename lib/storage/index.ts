// lib/storage/index.ts
// TIKE V3 统一存储工厂与依赖注入中心 (支持 Upstash Redis Free 与内存安全降级切换)

import { Redis } from '@upstash/redis';
import {
  CacheStore,
  SessionStore,
  IdempotencyStore,
  RateLimitStore,
  StorageInfo
} from './interfaces';
import {
  MemoryCacheStore,
  MemorySessionStore,
  MemoryIdempotencyStore,
  MemoryRateLimitStore
} from './memory';
import {
  RedisCacheStore,
  RedisSessionStore,
  RedisIdempotencyStore,
  RedisRateLimitStore
} from './redis';

export * from './interfaces';
export {
  MemoryCacheStore,
  MemorySessionStore,
  MemoryIdempotencyStore,
  MemoryRateLimitStore
} from './memory';
export {
  RedisCacheStore,
  RedisSessionStore,
  RedisIdempotencyStore,
  RedisRateLimitStore
} from './redis';

let cacheInstance: CacheStore | null = null;
let sessionInstance: SessionStore | null = null;
let idempotencyInstance: IdempotencyStore | null = null;
let rateLimitInstance: RateLimitStore | null = null;
let storageInfoCached: StorageInfo | null = null;

function initStorage(): void {
  const provider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  const shouldUseRedis = provider === 'redis' || (provider !== 'memory' && Boolean(upstashUrl && upstashToken));

  if (shouldUseRedis && upstashUrl && upstashToken) {
    try {
      const redis = new Redis({
        url: upstashUrl,
        token: upstashToken
      });
      cacheInstance = new RedisCacheStore(redis);
      sessionInstance = new RedisSessionStore(redis);
      idempotencyInstance = new RedisIdempotencyStore(redis);
      rateLimitInstance = new RedisRateLimitStore(redis);
      storageInfoCached = {
        provider: 'redis',
        persistent: true,
        connected: true,
        detail: 'Upstash Redis REST Free Tier'
      };
      return;
    } catch (err) {
      console.warn('[Storage] Failed to initialize Upstash Redis, falling back to Memory:', err);
    }
  }

  cacheInstance = new MemoryCacheStore();
  sessionInstance = new MemorySessionStore();
  idempotencyInstance = new MemoryIdempotencyStore();
  rateLimitInstance = new MemoryRateLimitStore();
  storageInfoCached = {
    provider: 'memory',
    persistent: false,
    connected: true,
    detail: 'In-Memory Ephemeral Storage (Local Dev / Fallback)'
  };
}

export function getCacheStore(): CacheStore {
  if (!cacheInstance) initStorage();
  return cacheInstance!;
}

export function getSessionStore(): SessionStore {
  if (!sessionInstance) initStorage();
  return sessionInstance!;
}

export function getIdempotencyStore(): IdempotencyStore {
  if (!idempotencyInstance) initStorage();
  return idempotencyInstance!;
}

export function getRateLimitStore(): RateLimitStore {
  if (!rateLimitInstance) initStorage();
  return rateLimitInstance!;
}

export function getStorageInfo(): StorageInfo {
  if (!storageInfoCached) initStorage();
  return storageInfoCached!;
}

// 统一全局单例
export const defaultCache = getCacheStore();
export const defaultSessionStore = getSessionStore();
export const defaultIdempotencyStore = getIdempotencyStore();
export const defaultRateLimitStore = getRateLimitStore();
