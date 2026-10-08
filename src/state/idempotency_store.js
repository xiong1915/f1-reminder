// src/state/idempotency_store.js
// 统一事件与卡片点击防重幂等层

const memoryIdempotency = new Map();

/**
 * 检查并标记操作是否已被处理
 * @param {string} actionKey 
 * @param {object} [env] 
 * @param {number} [ttlSeconds=600] 
 * @returns {Promise<boolean>} 如果已处理返回 true，如果为全新操作返回 false
 */
export async function checkAndMarkHandled(actionKey, env, ttlSeconds = 600) {
  const now = Date.now();
  const localVal = memoryIdempotency.get(actionKey);
  if (localVal && localVal > now) {
    return true; // 已处理
  }

  if (env && env.KV_CHAT) {
    try {
      const exists = await env.KV_CHAT.get(`idempotency:${actionKey}`);
      if (exists) return true;
      await env.KV_CHAT.put(`idempotency:${actionKey}`, '1', { expirationTtl: ttlSeconds });
    } catch (e) {
      // 降级使用本地内存
    }
  }

  memoryIdempotency.set(actionKey, now + ttlSeconds * 1000);
  return false;
}
