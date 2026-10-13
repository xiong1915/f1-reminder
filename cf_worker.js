/**
 * TIKE V3 Cloudflare Edge Gateway
 * Pure reverse proxy routing website traffic to Vercel (apex-v3-web).
 * Responsibilities:
 * - Transparent reverse proxy forwarding to upstream Vercel
 * - Forward client IP and host headers
 * - NO scheduled cron triggers (handled by independent f1-reminder-worker)
 * - NO Feishu reminder execution
 * - NO /api/cron/reminder interception
 */

const UPSTREAM_ORIGIN = 'https://f1-race-reminder-cloud.vercel.app';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 纯反向代理：所有路径（包括 /api/cron/reminder、/races、/ 等）直通转发至上游前端 (apex-v3-web / Vercel)
    const targetUrl = new URL(url.pathname + url.search, env.UPSTREAM_ORIGIN || UPSTREAM_ORIGIN);

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
      resHeaders.set('X-Tike-Gateway', 'Cloudflare-Edge-Native-V3');

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
  }
};
