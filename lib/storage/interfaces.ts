// lib/storage/interfaces.ts
// TIKE V3 统一持久化与缓存抽象契约（全面解耦业务逻辑与物理存储介质）

import { AIMessage } from '../ai/types';

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear?(): Promise<void>;
}

export interface SessionContext {
  chatId?: string;
  senderId?: string;
  chatType?: string;
  rootId?: string;
}

export interface SessionStore {
  getKey(ctx: SessionContext): string;
  getHistory(key: string): Promise<AIMessage[]>;
  saveHistory(key: string, history: AIMessage[]): Promise<void>;
  reset(key: string): Promise<void>;
}

export interface IdempotencyStore {
  /**
   * 检查并原子标记事件是否已处理
   * @param key 幂等键
   * @param ttlSeconds 过期时间（秒）
   * @returns true: 已处理（重复触发）；false: 首次处理（成功锁定）
   */
  checkAndMarkHandled(key: string, ttlSeconds?: number): Promise<boolean>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitStore {
  checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export interface StorageInfo {
  provider: 'redis' | 'memory';
  persistent: boolean;
  connected: boolean;
  detail?: string;
}
