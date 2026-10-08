// src/state/conversation_store.js
// 会话状态持久化与多租户/群聊/话题隔离层

const memoryHistory = new Map();
const MAX_HISTORY_MESSAGES = 6; // 保留最近 3 轮对话 (6 条消息)

const RESET_COMMANDS = new Set([
  '清除记忆',
  '重置会话',
  '/reset',
  '/new'
]);

/**
 * 统一会话 Key 生成规则（私聊 / 群聊按人 / 话题隔离）
 */
export function getConversationKey({ chatId, senderId, chatType, rootId }) {
  if (rootId && typeof rootId === 'string' && rootId.trim()) {
    return `thread:${rootId.trim()}`;
  }
  if (chatType === 'group' && senderId) {
    return `chat:${chatId}:user:${senderId}`;
  }
  return `chat:${chatId || 'default'}`;
}

export function isResetCommand(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (RESET_COMMANDS.has(trimmed)) return true;
  return RESET_COMMANDS.has(trimmed.toLowerCase());
}

export async function loadConversationHistory(convKey, env) {
  if (env && env.KV_CHAT) {
    try {
      const raw = await env.KV_CHAT.get(convKey, { type: 'json' });
      if (Array.isArray(raw)) return raw;
    } catch (e) {
      console.warn('[KV 读取异常]:', e.message);
    }
  }
  return memoryHistory.get(convKey) || [];
}

export async function saveConversationHistory(convKey, history, env) {
  const cleanHistory = history.slice(-MAX_HISTORY_MESSAGES).map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : ''
  }));

  memoryHistory.set(convKey, cleanHistory);

  if (env && env.KV_CHAT) {
    try {
      await env.KV_CHAT.put(convKey, JSON.stringify(cleanHistory), { expirationTtl: 3600 });
    } catch (e) {
      console.warn('[KV 写入异常]:', e.message);
    }
  }
}

export async function resetConversation(convKey, env) {
  memoryHistory.delete(convKey);
  if (env && env.KV_CHAT) {
    try {
      await env.KV_CHAT.delete(convKey);
    } catch (e) {
      console.warn('[KV 重置删除异常]:', e.message);
    }
  }
}
