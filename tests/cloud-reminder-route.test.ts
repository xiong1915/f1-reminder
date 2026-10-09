import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/cron/reminder/route';

async function harness(run: (h: {advance:(ms:number)=>void; sent:()=>number; states:Map<string,any>; failStorage:()=>void; rejectSend:(value:boolean)=>void; timeoutSend:()=>void; failCalendar:()=>void})=>Promise<void>) {
  const saved={...process.env};
  let now=Date.parse('2026-10-10T00:00:00Z'), messages=0, failStorage=false, rejected=false, timedOut=false, calendarFailed=false;
  const states=new Map<string,any>();
  process.env.CRON_SECRET='test-only';
  process.env.KV_REST_API_URL='https://unused.invalid';
  process.env.KV_REST_API_TOKEN='test-only';
  process.env.FEISHU_WEBHOOK_URL='https://open.feishu.cn/open-apis/bot/v2/hook/test-only';
  mock.method(Date,'now',()=>now);
  mock.method(globalThis,'fetch',async(input:any,init:any)=>{
    if(String(input).includes('unused.invalid')) {
      if(failStorage) throw Error('Redis unavailable');
      const commands=JSON.parse(init.body);
      const execute=(command:any[])=>{
        const [op,key,value,...options]=command;
        if(String(op).toLowerCase()==='get') return {result:states.has(key)?JSON.stringify(states.get(key)):null};
        if(String(op).toLowerCase()==='set') {
          if(options.some((x:any)=>String(x).toLowerCase()==='nx')&&states.has(key)) return {result:null};
          states.set(key,JSON.parse(value));return {result:'OK'};
        }
        if(String(op).toLowerCase()==='del') return {result:states.delete(key)?1:0};
        throw Error('Unexpected Redis operation');
      };
      return Response.json(Array.isArray(commands[0])?commands.map(execute):execute(commands));
    }
    if(String(input).includes('open.feishu.cn')) {messages++;if(timedOut)throw Error('timeout');return Response.json({code:rejected?19021:0});}
    if(String(input).includes('api.jolpi.ca') && calendarFailed) throw Error('calendar offline');
    if(String(input).includes('api.jolpi.ca')) return Response.json({MRData:{RaceTable:{Races:[{
      season:'2026',round:'17',raceName:'Singapore Grand Prix',date:'2026-10-11',time:'12:00:00Z',
      Circuit:{circuitId:'marina_bay',circuitName:'Marina Bay',Location:{country:'Singapore',locality:'Singapore'}}
    }]}}});
    throw Error('Unexpected network request');
  });
  try {await run({advance:ms=>{now+=ms;},sent:()=>messages,states,failStorage:()=>{failStorage=true;},rejectSend:value=>{rejected=value;},timeoutSend:()=>{timedOut=true;},failCalendar:()=>{calendarFailed=true;}});}
  finally {mock.restoreAll(); process.env=saved;}
}
function req(method='GET',body?:object,source='cloudflare') {
  return new NextRequest('https://example.invalid/api/cron/reminder',{method,headers:{authorization:'Bearer test-only','x-reminder-source':source,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
}
test('scheduled synthetic session uses the real route and sends only at T-30, once across both schedulers',async()=>harness(async h=>{
  let response:Response=await POST(req('POST',{action:'schedule_test',startTimeUTC:'2026-10-10T00:35:00Z'}));
  assert.equal(response.status,200);
  response=await GET(req()); assert.equal(response.status,200);assert.equal(h.sent(),0);
  h.advance(5*60000);
  response=await GET(req());assert.equal(response.status,200);assert.equal(h.sent(),1);
  const health=await response.json(); assert.equal(health.results[0].remainingMinutes,30);
  response=await GET(req('GET',undefined,'github'));assert.equal(response.status,200);assert.equal(h.sent(),1);
}));
test('unauthorized calls cannot schedule or send; storage failure stops checks',async()=>harness(async h=>{
  const noAuth=new NextRequest('https://example.invalid/api/cron/reminder');
  assert.equal((await GET(noAuth)).status,401);assert.equal(h.sent(),0);
  h.failStorage();
  assert.equal((await GET(req())).status,503);assert.equal(h.sent(),0);
}));

test('live route retries an explicitly rejected message but does not resend an ambiguous timeout',async()=>harness(async h=>{
  await POST(req('POST',{action:'schedule_test',startTimeUTC:'2026-10-10T00:35:00Z'}));h.advance(5*60000);
  h.rejectSend(true);assert.equal((await GET(req())).status,502);assert.equal(h.sent(),1);
  h.rejectSend(false);assert.equal((await GET(req())).status,200);assert.equal(h.sent(),2);
  for(const key of h.states.keys()) if(key.startsWith('f1:delivery:test:')) h.states.delete(key);
  h.timeoutSend();assert.equal((await GET(req())).status,502);assert.equal(h.sent(),3);
  assert.equal((await GET(req())).status,502);assert.equal(h.sent(),3);
}));
test('calendar provider outage is reported and cannot send guessed race information',async()=>harness(async h=>{
  h.failCalendar();assert.equal((await GET(req())).status,503);assert.equal(h.sent(),0);
}));
