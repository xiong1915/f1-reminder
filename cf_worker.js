/**
 * TIKE V3 Cloudflare Edge Gateway
 * Routes https://f1.tike69.cc.cd directly to Vercel Production (f1-race-reminder-cloud.vercel.app)
 * Native support for SSE streaming (DeepSeek AI), Feishu webhooks, and full Next.js V3 assets.
 */

const UPSTREAM_ORIGIN = 'https://f1-race-reminder-cloud.vercel.app';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, UPSTREAM_ORIGIN);

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('X-Forwarded-Host', url.host);
    reqHeaders.set('X-Forwarded-Proto', 'https');
    const clientIp = request.headers.get('cf-connecting-ip');
    if (clientIp) {
      reqHeaders.set('X-Real-IP', clientIp);
    }

    const hasBody = !['GET', 'HEAD'].includes(request.method);

    const upstreamReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers: reqHeaders,
      body: hasBody ? request.body : undefined,
      redirect: 'manual'
    });

    try {
      const upstreamRes = await fetch(upstreamReq);

      const resHeaders = new Headers(upstreamRes.headers);
      resHeaders.set('X-Tike-Gateway', 'Cloudflare-Vercel-Edge-V3');

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: resHeaders
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Gateway Error', message: err.message }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch(new URL('/api/cron/reminder', UPSTREAM_ORIGIN), {
        headers: {
          'User-Agent': 'Cloudflare-Worker-Edge-Cron/1.0',
          'Authorization': `Bearer ${env.CRON_SECRET || ''}`,
          'X-Reminder-Source': 'cloudflare',
          'X-Scheduled-At': new Date(event.scheduledTime).toISOString()
        },
        signal: AbortSignal.timeout(25000)
      }).then(async res => {
        if (!res.ok) throw new Error(`Reminder HTTP ${res.status}`);
        return res.json();
      }).then(data => {
        console.log('[CF Cron Scheduled Reminder]:', data);
      }).catch(err => {
        console.error('[CF Cron Error]:', err);
        throw err;
      })
    );
  }
};

