import test from 'node:test';
import assert from 'node:assert/strict';
import { F1Service, determineStandingsCutoff, evaluateHasLatestRaceResult } from '../providers/f1/service.ts';
import { MemoryCacheStore } from '../lib/storage/index.ts';
import { LastKnownGoodStore } from '../lib/storage/lkg.ts';
import { normalizeJolpicaRace } from '../lib/f1/normalize.ts';
import { fetchJolpicaLastResult } from '../providers/f1/jolpica.ts';
import { GET as sync } from '../app/api/cron/sync/route.ts';
import { NextRequest } from 'next/server';

const calendar = [{season:'2026',round:17,nameZh:'新加坡大奖赛',isSprintWeekend:true,raceStartUTC:'2026-10-11T12:00:00Z',sessions:[]}];
const create = () => {const cache = new MemoryCacheStore(); const lkg = new LastKnownGoodStore(cache, ''); return {cache,lkg,service:new F1Service(cache,lkg)};};

test('missing constructor session and mixed driver scopes cannot be certified', () => {
  assert.equal(determineStandingsCutoff([{officialRound:17,snapshotSession:'race'}],[{officialRound:17}],calendar).verified,false);
  assert.equal(determineStandingsCutoff([{officialRound:17,snapshotSession:'race'},{officialRound:16,snapshotSession:'race'}],[{officialRound:17,snapshotSession:'race'}],calendar).verified,false);
  assert.equal(determineStandingsCutoff([{officialRound:17}],[{officialRound:17}],calendar, {round:17,date:'2026-10-11',winner:{}},'2026-10-12T01:00:00Z').verified,false);
});

test('delayed race and unsorted calendar do not fabricate completion', () => {
  const old={season:'2026',round:16,winner:{code:'VER'}};
  const earlier={season:'2026',round:16,raceStartUTC:'2026-10-04T07:00:00Z'};
  assert.equal(evaluateHasLatestRaceResult([...calendar,earlier],old,new Date('2026-10-11T16:00:00Z')),'unknown');
  assert.equal(evaluateHasLatestRaceResult([...calendar,earlier],{season:'2026',round:17,winner:{code:'VER'}},new Date('2026-10-11T13:00:00Z')),true);
});

test('one successful domain cannot mask another failure; seasons are isolated', async () => {
  const {service}=create();
  await Promise.all([service.recordUpstreamAttempt(false,'failed','driverStandings','2026'), service.recordUpstreamAttempt(true,undefined,'calendar','2026')]);
  assert.equal((await service.getUpstreamSyncRecord('2026')).success,false);
  assert.equal(await service.getUpstreamSyncRecord('2025'),null);
});

test('bare hot cache never borrows a different LKG timestamp', async () => {
  const {cache,lkg,service}=create();
  await lkg.save('driverStandings',[{points:1}], 'jolpica','2026','2026-10-01T00:00:00Z');
  await cache.set('f1:v3:standings:drivers:2026',[{points:2}],60);
  const value=await service.getDriverStandingsResult('2026');
  assert.equal(value.data[0].points,2); assert.equal(value.fetchedAt,undefined);
});

test('LKG fallback preserves its origin on the next hot cache read', async () => {
  const {lkg,service}=create();
  await lkg.save('driverStandings',[{points:325}], 'jolpica','2026','2026-10-10T20:00:00Z');
  const original=globalThis.fetch; globalThis.fetch=async()=>{throw new Error('offline');};
  try {
    const first=await service.getDriverStandingsResult('2026');
    const second=await service.getDriverStandingsResult('2026');
    assert.equal(first.source,'lkg'); assert.equal(second.source,'lkg'); assert.equal(first.fetchedAt,second.fetchedAt);
    assert.equal(second.cacheHit,true);
    assert.equal((await service.getUpstreamSyncRecord()).success,false);
  } finally {globalThis.fetch=original;}
});

test('a live snapshot keeps its own timestamp after the LKG is replaced', async () => {
  const {lkg,service}=create();
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({MRData:{total:'1',StandingsTable:{StandingsLists:[{season:'2026',round:'17',DriverStandings:[{position:'1',points:'340',wins:'8',Driver:{driverId:'antonelli',code:'ANT'},Constructors:[]}]}]}}}),{status:200});
  try {
    const first=await service.getDriverStandingsResult('2026');
    await lkg.save('driverStandings',[{points:999}], 'jolpica','2026','2026-01-01T00:00:00Z');
    const second=await service.getDriverStandingsResult('2026');
    assert.equal(second.data[0].points,340); assert.equal(second.fetchedAt,first.fetchedAt);
  } finally {globalThis.fetch=original;}
});

test('historical last-result requests use and validate the requested season', async () => {
  const original=globalThis.fetch; let requested;
  globalThis.fetch=async url=>{requested=String(url);return new Response(JSON.stringify({MRData:{RaceTable:{Races:[{season:'2026',round:'17',Results:[]}]}}}),{status:200});};
  try {await assert.rejects(fetchJolpicaLastResult('2025'),/season mismatch/);assert.match(requested,/\/2025\/last\/results.json$/);}
  finally {globalThis.fetch=original;}
});

test('race normalization does not turn every round 16 into Malaysia or round 17 into a sprint',()=>{
  const value=normalizeJolpicaRace({season:'2025',round:'16',raceName:'Italian Grand Prix',Circuit:{circuitId:'monza',Location:{locality:'Monza'}},date:'2025-09-07',time:'13:00:00Z'});
  assert.equal(value.nameZh.includes('马来西亚'),false);assert.equal(value.locality.includes('吉隆坡'),false);
  assert.equal(normalizeJolpicaRace({season:'2025',round:'17',Circuit:{circuitId:'marina_bay'}}).isSprintWeekend,false);
});

test('sync endpoint fails closed with no secret and rejects query-string credentials',async()=>{
  const previous=process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await sync(new NextRequest('https://example.test/api/cron/sync'))).status,401);
    process.env.CRON_SECRET='local-test-only';
    assert.equal((await sync(new NextRequest('https://example.test/api/cron/sync?token=local-test-only'))).status,401);
  } finally {if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});

test('overview cache refreshes response time without inventing a synchronization attempt',async()=>{
  const {cache,service}=create();
  await cache.set('f1:v3:calendar:2026',calendar,60);
  await cache.set('f1:v3:standings:drivers:2026',[{officialRound:17}],60);
  await cache.set('f1:v3:standings:constructors:2026',[{officialRound:17}],60);
  await cache.set('f1:v3:results:last:2026',{season:'2026',round:17,winner:{code:'VER'}},60);
  const first=await service.getOverview();
  const second=await service.getOverview();
  assert.equal(first.syncStatus.lastAttemptAt,undefined);assert.equal(second.syncStatus.lastAttemptAt,undefined);
  assert.equal(second.isCacheHit,true);assert.equal(second.updatedAt,undefined);assert.equal(second.canSimulateRace,false);
});

test('authenticated sync reports partial failures and forces each domain refresh',async()=>{
  const {defaultF1Service}=await import('../providers/f1/service.ts');
  const envKeys=['CRON_SECRET','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','STORAGE_PROVIDER'];
  const previous=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
  const methods=['getCalendarResult','getDriverStandingsResult','getConstructorStandingsResult','getLastRaceResultResult'];
  const originals=methods.map(m=>defaultF1Service[m]);let calls=0;
  try {
    process.env.CRON_SECRET='local-test-only';process.env.UPSTASH_REDIS_REST_URL='https://example.test';process.env.UPSTASH_REDIS_REST_TOKEN='local-test-only';process.env.STORAGE_PROVIDER='redis';
    methods.forEach((method,i)=>{defaultF1Service[method]=async(season,force)=>{assert.equal(season,'2025');assert.equal(force,true);calls++;return {source:i===2?'lkg':'live',data:[],fetchedAt:'2025-01-01T00:00:00Z'};};});
    const response=await sync(new NextRequest('https://example.test/api/cron/sync?season=2025',{headers:{authorization:'Bearer local-test-only'}}));
    assert.equal(response.status,503);assert.equal(calls,4);const body=await response.json();assert.equal(body.success,false);assert.equal(body.summary.constructors.success,false);assert.equal(body.feishuNotificationSuppressed,true);
  } finally {
    methods.forEach((m,i)=>defaultF1Service[m]=originals[i]);
    envKeys.forEach(k=>{if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];});
  }
});
