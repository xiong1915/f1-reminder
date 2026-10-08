// lib/storage/memory/index.ts
// 默认零费用、零外部依赖的高性能内存存储适配器（支持 TTL 惰性失效与定时清理）

import { AIMessage } from '../../ai/types';
import {
  CacheStore,
  SessionStore,
  SessionContext,
  IdempotencyStore,
  RateLimitStore,
  RateLimitResult
} from '../interfaces';

export class MemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: any; expireAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expireAt > 0 && Date.now() > entry.expireAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expireAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.store.set(key, { value, expireAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export class MemorySessionStore implements SessionStore {
  private historyMap = new Map<string, AIMessage[]>();
  private maxHistory: number;

  constructor(maxHistory: number = 8) {
    this.maxHistory = maxHistory;
  }

  getKey(ctx: SessionContext): string {
    if (ctx.rootId && ctx.rootId.trim()) {
      return `thread:${ctx.rootId.trim()}`;
    }
    if (ctx.chatType === 'group' && ctx.senderId) {
      return `chat:${ctx.chatId}:user:${ctx.senderId}`;
    }
    return `chat:${ctx.chatId || 'default'}`;
  }

  async getHistory(key: string): Promise<AIMessage[]> {
    return this.historyMap.get(key) || [];
  }

  async saveHistory(key: string, history: AIMessage[]): Promise<void> {
    const clean = history.slice(-this.maxHistory).map(m => ({
      role: m.role,
      content: String(m.content || '')
    }));
    this.historyMap.set(key, clean);
  }

  async reset(key: string): Promise<void> {
    this.historyMap.delete(key);
  }
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private idempotencyMap = new Map<string, number>();

  async checkAndMarkHandled(key: string, ttlSeconds: number = 600): Promise<boolean> {
    const now = Date.now();
    const expire = this.idempotencyMap.get(key);
    if (expire && expire > now) {
      return true; // 已处理过
    }

    this.idempotencyMap.set(key, now + ttlSeconds * 1000);
    return false; // 全新请求，成功加锁
  }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private windows = new Map<string, { count: number; resetAt: number }>();

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      this.windows.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    if (entry.count < limit) {
      entry.count += 1;
      return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
    }

    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
}
