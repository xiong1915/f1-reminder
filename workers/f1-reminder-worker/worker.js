/**
 * f1-reminder-worker
 * Cloudflare Worker 独立提醒引擎 (每分钟 Cron 驱动)
 * 职责：
 * 1. 独立执行 1 分钟 Cron 定时提醒逻辑，与网站反代彻底解耦
 * 2. 具备健康检查与手动测试端点 (/health, /trigger)
 * 3. 绝不处理网站反向代理流量
 */

import { checkAndDeliverEdgeReminders, getReminderHealth, redisCall } from '../../src/worker/reminder_edge.js';

export default {
  async scheduled(event, env, ctx) {
    const scheduledTime = new Date(event.scheduledTime).toISOString();
    const p = checkAndDeliverEdgeReminders(env, { scheduledTime })
      .then(data => {
        console.log('[f1-reminder-worker Cron]:', data);
        if(data.errors?.length || data.results.some(r=>['failed','uncertain','storage_error'].includes(r.status))) throw Error('Reminder delivery needs retry');
        return data;
      })
      .catch(async err => {
        console.error('[f1-reminder-worker Cron Error]:', err.message);
        const failure=JSON.stringify({checkedAt:new Date().toISOString(),scheduledAt:scheduledTime,source:'cloudflare',status:'error',error:err.message});
        try {await redisCall(env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN,['set','f1:reminder:health:cloudflare',failure,'ex',604800]);} catch {}
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
    if(['/health','/status','/trigger','/test'].includes(url.pathname) && (!env.CRON_SECRET || request.headers.get('authorization')!==`Bearer ${env.CRON_SECRET}`)) return Response.json({error:'Unauthorized'},{status:401});
    if(url.pathname==='/test') {
      if(request.method!=='POST') return Response.json({error:'Use POST'},{status:405});
      if(!env.FEISHU_WEBHOOK_URL) return Response.json({error:'Webhook missing'},{status:503});
      try {
        const response=await fetch(env.FEISHU_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msg_type:'text',content:{text:'【测试】F1 云端提醒恢复验证\n这是一条云端发送通路测试，不是真实赛事提醒\n北京时间：'+new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}}),signal:AbortSignal.timeout(10000)});
        const data=await response.json();
        return Response.json({status:response.ok&&(data.code===0||data.StatusCode===0)?'accepted':'failed'},{status:response.ok&&(data.code===0||data.StatusCode===0)?200:502});
      } catch {return Response.json({status:'uncertain'},{status:502});}
    }

    // 1. 健康状态查询 (/health 或 /status)
    if (url.pathname === '/health' || url.pathname === '/status') {
      const health = await getReminderHealth(env);
      const cf=health.cloudflare;
      const stale=!cf?.checkedAt || Date.now()-Date.parse(cf.checkedAt)>180000;
      return new Response(JSON.stringify(health), {
        status: stale||cf?.status==='error'||cf?.errors?.length?503:200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 手动鉴权触发 (/trigger)
    if (url.pathname === '/trigger') {
      if(request.method!=='POST') return Response.json({error:'Use POST'},{status:405});
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
