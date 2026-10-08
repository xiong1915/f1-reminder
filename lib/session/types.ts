// lib/session/types.ts
// 会话存储抽象接口，支持 Web AI 多轮对话与飞书多租户/群聊/话题隔离

import { AIMessage } from '../ai/types';

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
