// lib/storage/redis/index.ts
// Upstash Redis Free 适配器（基于轻量 HTTP/REST API，零服务器维持长连接，100% 契合 Serverless/Edge 运行时）

import { Redis } from '@upstash/redis';
import { AIMessage } from '../../ai/types';
import {
  CacheStore,
  SessionStore,
  SessionContext,
  IdempotencyStore,
  RateLimitStore,
  RateLimitResult
} from '../interfaces';

export class RedisCacheStore implements CacheStore {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const res = await this.redis.get<T>(key);
      return res ?? null;
    } catch (err) {
      console.warn(`[RedisCacheStore] get(${key}) error:`, err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.set(key, value, { ex: ttlSeconds });
      } else {
        await this.redis.set(key, value);
      }
    } catch (err) {
      console.warn(`[RedisCacheStore] set(${key}) error:`, err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      console.warn(`[RedisCacheStore] delete(${key}) error:`, err);
    }
  }

  async clear(): Promise<void> {
    // 保护性设计：不在共享 Redis 实例上执行清空
  }
}

export class RedisSessionStore implements SessionStore {
  private maxHistory: number;

  constructor(private redis: Redis, maxHistory: number = 8) {
    this.maxHistory = maxHistory;
  }

  getKey(ctx: SessionContext): string {
    if (ctx.rootId && ctx.rootId.trim()) {
      return `tike:session:thread:${ctx.rootId.trim()}`;
    }
    if (ctx.chatType === 'group' && ctx.senderId) {
      return `tike:session:chat:${ctx.chatId}:user:${ctx.senderId}`;
    }
    return `tike:session:chat:${ctx.chatId || 'default'}`;
  }

  async getHistory(key: string): Promise<AIMessage[]> {
    try {
      const history = await this.redis.get<AIMessage[]>(key);
      return Array.isArray(history) ? history : [];
    } catch (err) {
      console.warn(`[RedisSessionStore] getHistory(${key}) error:`, err);
      return [];
    }
  }

  async saveHistory(key: string, history: AIMessage[]): Promise<void> {
    try {
      const clean = history.slice(-this.maxHistory).map(m => ({
        role: m.role,
        content: String(m.content || '')
      }));
      // 会话数据默认保留 7 天
      await this.redis.set(key, clean, { ex: 86400 * 7 });
    } catch (err) {
      console.warn(`[RedisSessionStore] saveHistory(${key}) error:`, err);
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      console.warn(`[RedisSessionStore] reset(${key}) error:`, err);
    }
  }
}

export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private redis: Redis) {}

  /**
   * 使用原子 SET key "1" EX ttl NX 语义防止并发与重放攻击
   * 返回 true 表示已存在（重复请求）
   * 返回 false 表示加锁成功（全新请求）
   */
  async checkAndMarkHandled(key: string, ttlSeconds: number = 600): Promise<boolean> {
    const fullKey = key.startsWith('tike:idemp:') ? key : `tike:idemp:${key}`;
    try {
      const res = await this.redis.set(fullKey, '1', { ex: ttlSeconds, nx: true });
      // 如果返回值是 'OK'，说明是首次设置成功；如果为 null 则说明已被消费
      return res !== 'OK';
    } catch (err) {
      console.warn(`[RedisIdempotencyStore] checkAndMarkHandled(${key}) error:`, err);
      return false; // 降级放行
    }
  }
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: Redis) {}

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const fullKey = key.startsWith('tike:ratelimit:') ? key : `tike:ratelimit:${key}`;
    const now = Date.now();
    try {
      const current = await this.redis.incr(fullKey);
      if (current === 1) {
        await this.redis.expire(fullKey, windowSeconds);
      }
      const ttl = await this.redis.ttl(fullKey);
      const resetAt = now + Math.max(ttl, 1) * 1000;

      if (current <= limit) {
        return { allowed: true, remaining: limit - current, resetAt };
      }
      return { allowed: false, remaining: 0, resetAt };
    } catch (err) {
      console.warn(`[RedisRateLimitStore] checkRateLimit(${key}) error:`, err);
      return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
    }
  }
}
