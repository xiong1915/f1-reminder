// lib/cache/types.ts
// 统一缓存存储接口抽象，解耦业务与具体底层 KV/Redis/内存实现

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear?(): Promise<void>;
}
