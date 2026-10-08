// lib/feishu/client.ts
// 飞书开放平台 OpenAPI 客户端 (Tenant Access Token 自动缓存与消息/卡片发送)

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getFeishuAccessToken(): Promise<string | null> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn('[FeishuClient] FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置');
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const data = await res.json();
    if (data.code === 0 && data.tenant_access_token) {
      cachedToken = {
        token: data.tenant_access_token,
        expiresAt: now + (data.expire * 1000)
      };
      return data.tenant_access_token;
    }
  } catch (err: any) {
    console.error('[FeishuClient] 获取 tenant_access_token 异常:', err.message);
  }
  return null;
}

export async function sendFeishuCard(params: {
  card: any;
  messageId?: string;
  chatId?: string;
  accessToken: string;
}): Promise<boolean> {
  const { card, messageId, chatId, accessToken } = params;

  if (messageId) {
    try {
      const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          content: JSON.stringify(card),
          msg_type: 'interactive'
        })
      });
      const data = await res.json();
      if (data.code === 0) return true;
    } catch (_) {}
  }

  if (chatId) {
    try {
      const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          receive_id: chatId,
          content: JSON.stringify(card),
          msg_type: 'interactive'
        })
      });
      const data = await res.json();
      if (data.code === 0) return true;
    } catch (_) {}
  }

  return false;
}
