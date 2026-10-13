/**
 * f1-reminder-worker
 * Cloudflare Worker 独立提醒引擎 (每分钟 Cron 驱动)
 * 职责：
 * 1. 独立执行 1 分钟 Cron 定时提醒逻辑，与网站反代彻底解耦
 * 2. 具备健康检查与手动测试端点 (/health, /trigger)
 * 3. 绝不处理网站反向代理流量
 */

import { checkAndDeliverEdgeReminders, getReminderHealth } from '../../src/worker/reminder_edge.js';

export default {
  async scheduled(event, env, ctx) {
    const scheduledTime = new Date(event.scheduledTime).toISOString();
    const p = checkAndDeliverEdgeReminders(env, { scheduledTime })
      .then(data => {
        console.log('[f1-reminder-worker Cron]:', data);
        return data;
      })
      .catch(err => {
        console.error('[f1-reminder-worker Cron Error]:', err);
        throw err;
      });

    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(p);
    } else {
      await p;
    }
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 健康状态查询 (/health 或 /status)
    if (url.pathname === '/health' || url.pathname === '/status') {
      const health = await getReminderHealth(env);
      return new Response(JSON.stringify(health), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 手动鉴权触发 (/trigger)
    if (url.pathname === '/trigger') {
      const auth = request.headers.get('authorization') || '';
      const secret = env.CRON_SECRET || '';
      if (!secret || auth !== `Bearer ${secret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const scheduledTime = request.headers.get('x-scheduled-at') || new Date().toISOString();
        const result = await checkAndDeliverEdgeReminders(env, { scheduledTime });
        const hasFailures = (result.results || []).some(r => ['failed', 'uncertain', 'storage_error'].includes(r.status)) ||
          (Array.isArray(result.errors) && result.errors.length > 0);
        return new Response(JSON.stringify(result), {
          status: hasFailures ? 502 : 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      worker: 'f1-reminder-worker',
      status: 'active',
      role: 'standalone-reminder-engine',
      endpoints: ['/health', '/trigger']
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
