import test from 'node:test';
import assert from 'node:assert/strict';
import {watchPrimaryHealth} from '../src/worker/reminder_watchdog.js';
function harness() {
  const values=new Map(),messages=[],expires=new Map();
  let clock=Date.parse('2026-10-24T00:00:00Z');
  const env={UPSTASH_REDIS_REST_URL:'https://redis.invalid',UPSTASH_REDIS_REST_TOKEN:'test-only',FEISHU_WEBHOOK_URL:'https://open.feishu.cn/test-only'};
  let reject=false;
  const fetchImpl=async(url,options)=>{
    if(url===env.FEISHU_WEBHOOK_URL){messages.push(JSON.parse(options.body));return Response.json({code:reject?19021:0});}
    assert.equal(url,'https://redis.invalid/pipeline');
    return Response.json(JSON.parse(options.body).map(([op,key,value,...flags])=>{
      if(op==='get')return {result:values.get(key)||null};
      if(op==='del')return {result:values.delete(key)?1:0};
      if(op==='set'){if(flags.includes('nx')&&values.has(key))return {result:null};values.set(key,value);const ex=flags.indexOf('ex');if(ex>=0)expires.set(key,clock+flags[ex+1]*1000);else expires.delete(key);return {result:'OK'};}
      throw Error('Unexpected operation');
    }));
  };
  return {values,messages,env,fetchImpl,reject:()=>{reject=true;},advance:ms=>{clock+=ms;for(const [key,end] of expires)if(end<=clock){values.delete(key);expires.delete(key);}}};
}
test('healthy primary stays silent; missing primary alerts once and backup can continue',async()=>{
  const h=harness(),now=Date.parse('2026-10-24T00:00:00Z');
  h.values.set('f1:reminder:health:cloudflare',JSON.stringify({checkedAt:new Date(now).toISOString()}));
  assert.equal((await watchPrimaryHealth(h.env,{nowMs:now,fetchImpl:h.fetchImpl})).primary,'healthy');assert.equal(h.messages.length,0);
  h.values.delete('f1:reminder:health:cloudflare');
  assert.equal((await watchPrimaryHealth(h.env,{nowMs:now,fetchImpl:h.fetchImpl})).primary,'down');
  await watchPrimaryHealth(h.env,{nowMs:now+60000,fetchImpl:h.fetchImpl});
  assert.equal(h.messages.length,1);assert.match(h.messages[0].content.text,/备用/);
});
test('primary recovery closes incident and only sends one recovery notice',async()=>{
  const h=harness(),now=Date.parse('2026-10-24T00:00:00Z');
  await watchPrimaryHealth(h.env,{nowMs:now,fetchImpl:h.fetchImpl});
  h.values.set('f1:reminder:health:cloudflare',JSON.stringify({checkedAt:new Date(now+60000).toISOString()}));
  await watchPrimaryHealth(h.env,{nowMs:now+60000,fetchImpl:h.fetchImpl});
  await watchPrimaryHealth(h.env,{nowMs:now+60001,fetchImpl:h.fetchImpl});
  assert.equal(h.messages.length,2);assert.match(h.messages[1].content.text,/恢复/);
});
test('rejected alert is not marked sent and will be retried',async()=>{
  const h=harness();h.reject();
  await assert.rejects(watchPrimaryHealth(h.env,{fetchImpl:h.fetchImpl}));
  await assert.rejects(watchPrimaryHealth(h.env,{fetchImpl:h.fetchImpl}));
  assert.equal(h.messages.length,2);
});
test('long outage retains one incident and sends recovery even after eight days',async()=>{
  const h=harness(),now=Date.parse('2026-10-24T00:00:00Z');
  await watchPrimaryHealth(h.env,{nowMs:now,fetchImpl:h.fetchImpl});
  const original=h.values.get('f1:watch:primary-incident');
  h.advance(8*86400000);
  await watchPrimaryHealth(h.env,{nowMs:now+8*86400000,fetchImpl:h.fetchImpl});
  assert.equal(h.messages.length,1);assert.equal(h.values.get('f1:watch:primary-incident'),original);
  h.values.set('f1:reminder:health:cloudflare',JSON.stringify({checkedAt:new Date(now+8*86400000).toISOString()}));
  await watchPrimaryHealth(h.env,{nowMs:now+8*86400000,fetchImpl:h.fetchImpl});
  assert.equal(h.messages.length,2);assert.match(h.messages[1].content.text,/恢复/);
});
test('stale or failed primary is down, and in-flight recovery is not prematurely closed',async()=>{
  const h=harness(),now=Date.parse('2026-10-24T00:00:00Z');
  h.values.set('f1:reminder:health:cloudflare',JSON.stringify({checkedAt:new Date(now-181000).toISOString()}));
  assert.equal((await watchPrimaryHealth(h.env,{nowMs:now,fetchImpl:h.fetchImpl})).primary,'down');
  const id=JSON.parse(h.values.get('f1:watch:primary-incident')).id;
  const recoveryKey=`f1:watch:delivery:${id}:recovered`;
  h.values.set(recoveryKey,JSON.stringify({status:'pending'}));
  h.values.set('f1:reminder:health:cloudflare',JSON.stringify({checkedAt:new Date(now).toISOString()}));
  await watchPrimaryHealth(h.env,{nowMs:now,fetchImpl:h.fetchImpl});
  assert.ok(h.values.has('f1:watch:primary-incident'));assert.equal(h.messages.length,1);
  h.values.delete(recoveryKey);
  await watchPrimaryHealth(h.env,{nowMs:now,fetchImpl:h.fetchImpl});
  assert.equal(h.messages.length,2);assert.equal(h.values.has('f1:watch:primary-incident'),false);
});
