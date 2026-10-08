// lib/session/memory.ts
// 默认零费用、零外部依赖的高性能内存会话与幂等存储

import { AIMessage } from '../ai/types';
import { SessionStore, SessionContext } from './types';

const RESET_COMMANDS = new Set([
  '清除记忆',
  '重置会话',
  '/reset',
  '/new'
]);

export function isResetCommand(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return RESET_COMMANDS.has(trimmed) || RESET_COMMANDS.has(trimmed.toLowerCase());
}

export class MemorySessionStore implements SessionStore {
  private historyMap = new Map<string, AIMessage[]>();
  private idempotencyMap = new Map<string, number>();
  private maxHistory: number;

  constructor(maxHistory: number = 6) {
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

  async checkAndMarkHandled(actionKey: string, ttlSeconds: number = 600): Promise<boolean> {
    const now = Date.now();
    const expire = this.idempotencyMap.get(actionKey);
    if (expire && expire > now) {
      return true; // 已处理过
    }

    this.idempotencyMap.set(actionKey, now + ttlSeconds * 1000);
    return false; // 全新请求
  }
}

export const defaultSessionStore = new MemorySessionStore(8);
