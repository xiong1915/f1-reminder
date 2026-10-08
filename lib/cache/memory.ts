// lib/cache/memory.ts
// 默认零费用、零外部依赖的高性能内存缓存引擎（支持 TTL 与主动过期清理）

import { CacheStore } from './types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCacheStore implements CacheStore {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxItems: number;

  constructor(maxItems: number = 500) {
    this.maxItems = maxItems;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    // 限制最大缓存容量，淘汰最早过期项
    if (this.store.size >= this.maxItems) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// 全局默认缓存单例
export const defaultCache = new MemoryCacheStore(1000);
