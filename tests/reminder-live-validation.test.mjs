import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {checkAndDeliverEdgeReminders,sendFeishuReminder} from '../src/worker/reminder_edge.js';
import rawWorker from '../workers/f1-reminder-worker/worker.js';
const worker=rawWorker?.fetch?rawWorker:rawWorker.default;
const require=createRequire(import.meta.url);
const session={season:'2026',round:'18',circuitId:'americas',sessionId:'fp1-18',sessionName:'Practice 1',gpName:'美国大奖赛',locality:'Austin',startTimeUTC:'2026-10-23T17:30:00.000Z',startTimeMs:Date.parse('2026-10-23T17:30:00Z')};
function official(time) {return `<script type="application/ld+json">${JSON.stringify({subEvent:[{'@type':'SportsEvent',name:'Practice 1 - United States Grand Prix',startDate:time},{'@type':'SportsEvent',name:'Qualifying - United States Grand Prix',startDate:'2026-10-24T21:00:00Z'},{'@type':'SportsEvent',name:'Race - United States Grand Prix',startDate:'2026-10-25T20:00:00Z'}]})}</script>`;}
test('live official time replaces cached practice time before delivery selection',async()=>{
  const {verifyOfficialSessions}=require('../src/providers/official_schedule');
  const result=await verifyOfficialSessions([session],Date.parse('2026-10-23T17:00:00Z'),async(url,options)=>{assert.equal('cache' in options,false);assert.equal(options.headers['Cache-Control'],'no-cache');return new Response(official('2026-10-23T18:00:00Z'));});
  assert.equal(result.sessions[0].startTimeUTC,'2026-10-23T18:00:00.000Z');
  assert.equal(result.official[0].changes.length,1);
});
test('official unavailable or malformed cannot fall back to unchecked dates',async()=>{
  const {verifyOfficialSessions}=require('../src/providers/official_schedule');
  await assert.rejects(verifyOfficialSessions([session],session.startTimeMs,async()=>new Response('offline',{status:503})));
  await assert.rejects(verifyOfficialSessions([session],session.startTimeMs,async()=>new Response('<html>captcha</html>')));
});
test('missing webhook or Redis stops delivery without writing sent',async()=>{
  let calls=0;
  await assert.rejects(checkAndDeliverEdgeReminders({}, {sessions:[session],nowMs:session.startTimeMs-30*60000,fetchImpl:async()=>{calls++;throw Error('unexpected network');}}));
  assert.equal(calls,0);
});
test('Feishu missing explicit success code is uncertain rather than sent',async()=>{
  await assert.rejects(sendFeishuReminder({webhookUrl:'https://open.feishu.cn/hook',phase:'before',fetchImpl:async()=>Response.json({})}));
});
test('cloud-only test endpoint is authenticated, POST-only, labelled and checks success code',async()=>{
  const env={CRON_SECRET:'test-only',FEISHU_WEBHOOK_URL:'https://open.feishu.cn/test-only'};
  assert.equal((await worker.fetch(new Request('https://worker.invalid/test'),env,{})).status,401);
  assert.equal((await worker.fetch(new Request('https://worker.invalid/test',{headers:{Authorization:'Bearer test-only'}}),env,{})).status,405);
  const original=globalThis.fetch;
  let body;
  try {
    globalThis.fetch=async(url,options)=>{assert.equal(url,env.FEISHU_WEBHOOK_URL);body=JSON.parse(options.body);return Response.json({code:0});};
    const request=()=>new Request('https://worker.invalid/test',{method:'POST',headers:{Authorization:'Bearer test-only'}});
    assert.equal((await worker.fetch(request(),env,{})).status,200);
    assert.match(body.content.text,/【测试】/);
    globalThis.fetch=async()=>Response.json({});
    assert.equal((await worker.fetch(request(),env,{})).status,502);
  } finally {globalThis.fetch=original;}
});
