import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { fetchJolpicaCalendar } from '@/providers/f1/jolpica';
import { alignOfficialSchedule } from '@/providers/f1/official-schedule';
import { F1Meeting } from '@/lib/f1/types';
import { formatBeijingDisplay } from '@/lib/f1/time';
import { deliverReminder, reminderDue, startReminderDue, DeliveryStore } from '@/lib/f1/reminder-delivery';
export const dynamic = 'force-dynamic';
const TEST_KEY = 'f1:reminder:test', HEALTH_KEY = 'f1:reminder:health', TTL = 7 * 86400;
interface TestSession { id: string; startTimeUTC: string; createdAt: string }
function client() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw Error('Persistent storage is required');
  return new Redis({url, token});
}
function authorized(req: NextRequest) {
  return Boolean(process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`);
}
function store(redis: Redis): DeliveryStore {
  return {
    async claim(key) { return await redis.set(key, {status:'pending', attemptedAt:new Date().toISOString()}, {nx:true,ex:120}) === 'OK'; },
    async finish(key,status) { await redis.set(key,{status,updatedAt:new Date().toISOString()},{ex:status==='sent'?TTL:60}); },
    async release(key) { await redis.del(key); },
    async readStatus(key) { return (await redis.get<{status:string}>(key))?.status || null; }
  };
}
async function send(text: string): Promise<'sent'|'rejected'|'uncertain'> {
  const webhook = process.env.FEISHU_WEBHOOK_URL || process.env.PUSH_KEY;
  if (!webhook || !/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(webhook)) throw Error('Feishu webhook is required');
  try {
    const res = await fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msg_type:'text',content:{text}}),signal:AbortSignal.timeout(10000)});
    const data = await res.json();
    if (res.ok && (data.code === 0 || data.StatusCode === 0)) return 'sent';
    return (typeof data.code === 'number' && data.code !== 0) ||
      (typeof data.StatusCode === 'number' && data.StatusCode !== 0) ? 'rejected' : 'uncertain';
  } catch { return 'uncertain'; }
}
async function calendar(redis: Redis, season: string) {
  const key = `f1:reminder:calendar:${season}`;
  const cached = await redis.get<{updatedAt:string;meetings:F1Meeting[]}>(key);
  const age=cached?Date.now()-Date.parse(cached.updatedAt):Infinity;
  if (cached && age>=0 && age<5*60000) return cached;
  try {
    const meetings = await fetchJolpicaCalendar(season);
    if (!meetings.length) throw Error('No calendar data');
    const data = {updatedAt:new Date(Date.now()).toISOString(),meetings,secondaryCacheFallback:false};
    await redis.set(key,data,{ex:86400});
    return data;
  } catch(error) {
    // Only reuse discovery metadata: session times must still pass the live official check below.
    if(cached && age>=0 && age<86400000) return {...cached,secondaryCacheFallback:true};
    throw error;
  }
}
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const body = await req.json(), start = Date.parse(body.startTimeUTC);
    if (body.action !== 'schedule_test' || !Number.isFinite(start) || start<Date.now()+37*60000 || start>Date.now()+120*60000) return NextResponse.json({error:'Test start must be 37–120 minutes in the future'},{status:400});
    const redis=client(), test:TestSession={id:crypto.randomUUID(),startTimeUTC:new Date(start).toISOString(),createdAt:new Date().toISOString()};
    if (!await redis.set(TEST_KEY,test,{nx:true,ex:3*3600})) return NextResponse.json({error:'Test already scheduled'},{status:409});
    return NextResponse.json({test,dueAt:new Date(start-35*60000).toISOString()});
  } catch { return NextResponse.json({error:'Unable to schedule test'},{status:503}); }
}
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const redis=client(), test=await redis.get<TestSession>(TEST_KEY);
    if (req.nextUrl.searchParams.get('mode') === 'status') return NextResponse.json({health:await redis.get(HEALTH_KEY),cloudflare:await redis.get(`${HEALTH_KEY}:cloudflare`),github:await redis.get(`${HEALTH_KEY}:github`),test,testDelivery:test?await redis.get(`f1:delivery:test:${test.id}`):null});
    const webhook = process.env.FEISHU_WEBHOOK_URL || process.env.PUSH_KEY;
    if (!webhook || !/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(webhook)) throw Error('Feishu webhook is required');
    const season=String(new Date().getUTCFullYear()), data=await calendar(redis,season), delivery=store(redis);
    // Verify the active weekend every invocation; a refreshed secondary cache can still contain old times.
    const official=[];
    const meetings=[];
    for(const meeting of data.meetings) {
      const race=Date.parse(meeting.raceStartUTC);
      if(race<Date.now()-86400000||race>Date.now()+4*86400000) continue;
      const aligned=await alignOfficialSchedule(meeting);
      official.push({sourceUrl:aligned.sourceUrl,checkedAt:aligned.checkedAt,changes:aligned.changes});
      meetings.push(aligned.meeting);
    }
    const candidates=meetings.flatMap(m=>m.sessions.map(s=>({key:`f1:delivery:${season}:${m.round}:${s.id}:${s.startTimeUTC}`,title:`${m.nameZh} · ${s.name}`,startTimeUTC:s.startTimeUTC,test:false})));
    if(test) candidates.push({key:`f1:delivery:test:${test.id}`,title:'【测试】模拟 F1 比赛',startTimeUTC:test.startTimeUTC,test:true});
    const results:{session:string;phase:string;status:string;remainingMinutes:number}[]=[];
    for(const item of candidates) {
      const now=Date.now();
      const phase=reminderDue(item.startTimeUTC,now)?'before':startReminderDue(item.startTimeUTC,now)?'start':null;
      if(!phase) continue;
      const remainingMinutes=(Date.parse(item.startTimeUTC)-now)/60000;
      const text=phase==='start'
        ? `${item.title}\n${item.test?'【测试】模拟开赛提醒':'F1 开赛提醒'}\n已到官方赛程的开赛时间：${formatBeijingDisplay(item.startTimeUTC)}（北京时间）\n${item.test?'这是云端定时测试，不是真实赛事':'实际是否延迟，请以现场公告为准'}`
        : `${item.title}\n${item.test?'这是云端定时测试，不是真实赛事':'F1 赛前提醒'}\n开赛时间：${formatBeijingDisplay(item.startTimeUTC)}（北京时间）\n距开赛：${remainingMinutes.toFixed(1)} 分钟\n目标提醒时间：${formatBeijingDisplay(new Date(Date.parse(item.startTimeUTC)-30*60000).toISOString())}`;
      const status=await deliverReminder(phase==='start'?`${item.key}:start`:item.key,delivery,()=>send(text));
      results.push({session:item.title,phase,status,remainingMinutes});
    }
    const source = req.headers.get('x-reminder-source') || 'unknown';
    const sourceKey = `${HEALTH_KEY}:${['cloudflare','github'].includes(source) ? source : 'manual'}`;
    const previous = await redis.get<{checkedAt:string}>(sourceKey);
    const scheduledAt = req.headers.get('x-scheduled-at');
    const health={checkedAt:new Date().toISOString(),previousCheckedAt:previous?.checkedAt||null,
      scheduledAt,lagMs:scheduledAt&&Number.isFinite(Date.parse(scheduledAt))?Date.now()-Date.parse(scheduledAt):null,
      calendarUpdatedAt:data.updatedAt,secondaryCacheFallback:'secondaryCacheFallback' in data?data.secondaryCacheFallback:false,
      meetingCount:data.meetings.length,sessionCount:candidates.filter(s=>!s.test).length,official,source,results};
    await redis.set(sourceKey,health,{ex:TTL});
    await redis.set(HEALTH_KEY,health,{ex:TTL});
    return NextResponse.json(health,{status:results.some(r=>['failed','uncertain','pending'].includes(r.status))?502:200});
  } catch { return NextResponse.json({error:'Reminder check failed; inspect configuration and server logs'},{status:503}); }
}
