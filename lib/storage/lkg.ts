// lib/storage/lkg.ts
// Last Known Good (LKG) 权威持久化快照与陈旧度（Freshness Policy）管理
// 核心原则：严禁伪造/编造虚假比赛积分与赛历，网络不可用时仅读取验证过的真实历史快照，若无快照则真实宣告 UNAVAILABLE

import fs from 'node:fs';
import path from 'node:path';
import { CacheStore } from './interfaces';
import { getCacheStore } from './index';

export interface LkgMetadata<T> {
  data: T;
  source: 'jolpica' | 'openf1' | 'upstream';
  fetchedAt: string; // ISO-8601
  season: string;
  schemaVersion: number;
}

export interface LkgResult<T> {
  available: boolean;
  data: T | null;
  source?: string;
  fetchedAt?: string;
  isStale: boolean;
  staleReason?: string;
}

export const LKG_SCHEMA_VERSION = 1;

// 领域默认陈旧时间上限 (超过该阈值仍可用，但标记为极端陈旧)
export const FRESHNESS_THRESHOLDS = {
  calendar: 24 * 3600 * 1000,        // 24 小时
  driverStandings: 4 * 3600 * 1000,   // 4 小时
  constructorStandings: 4 * 3600 * 1000, // 4 小时
  lastResult: 12 * 3600 * 1000,      // 12 小时
  overview: 30 * 60 * 1000            // 30 分钟
};

export class LastKnownGoodStore {
  private store: CacheStore;
  private diskBackupPath: string;

  constructor(store: CacheStore = getCacheStore()) {
    this.store = store;
    this.diskBackupPath = path.resolve(process.cwd(), '.lkg_snapshot.json');
  }

  private getKey(domain: string, season: string = '2026'): string {
    return `tike:lkg:v3:${domain}:${season}`;
  }

  private readDiskBackup(): Record<string, any> {
    try {
      if (fs.existsSync(this.diskBackupPath)) {
        const raw = fs.readFileSync(this.diskBackupPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (_) {}
    return {};
  }

  private writeDiskBackup(key: string, entry: any): void {
    try {
      const all = this.readDiskBackup();
      all[key] = entry;
      fs.writeFileSync(this.diskBackupPath, JSON.stringify(all, null, 2), 'utf-8');
    } catch (_) {}
  }

  /**
   * 上游抓取成功并完成数据清洗校验后，存入 LKG 权威快照
   */
  async save<T>(domain: string, data: T, source: 'jolpica' | 'openf1' | 'upstream' = 'jolpica', season: string = '2026'): Promise<void> {
    const key = this.getKey(domain, season);
    const entry: LkgMetadata<T> = {
      data,
      source,
      fetchedAt: new Date().toISOString(),
      season,
      schemaVersion: LKG_SCHEMA_VERSION
    };
    // LKG 保存长期保留 (30 天)
    await this.store.set(key, entry, 30 * 86400);
    this.writeDiskBackup(key, entry);
  }

  /**
   * 读取 LKG 数据并评估其陈旧状态
   */
  async get<T>(domain: string, freshnessMaxAgeMs: number, season: string = '2026'): Promise<LkgResult<T>> {
    const key = this.getKey(domain, season);
    let entry = await this.store.get<LkgMetadata<T>>(key);

    // 若当前存储（如内存模式刚重启）未命中，从本地磁盘备份自愈恢复
    if (!entry) {
      const diskData = this.readDiskBackup();
      if (diskData[key]) {
        entry = diskData[key];
        await this.store.set(key, entry, 30 * 86400);
      }
    }

    if (!entry || !entry.data) {
      return {
        available: false,
        data: null,
        isStale: true,
        staleReason: 'NO_LKG_SNAPSHOT'
      };
    }

    const fetchedTime = new Date(entry.fetchedAt).getTime();
    const ageMs = Date.now() - fetchedTime;
    const isStale = freshnessMaxAgeMs === 0 || ageMs > freshnessMaxAgeMs;

    return {
      available: true,
      data: entry.data,
      source: entry.source,
      fetchedAt: entry.fetchedAt,
      isStale,
      staleReason: isStale ? `DATA_AGED_${Math.round(ageMs / 60000)}m` : undefined
    };
  }
}

export const defaultLkgStore = new LastKnownGoodStore();
