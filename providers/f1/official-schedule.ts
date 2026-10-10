import { F1Meeting } from '@/lib/f1/types';

// Identifiers for official race pages, not locally maintained race times.
const pages: Record<string,string> = {
  albert_park:'australia', shanghai:'china', suzuka:'japan', bahrain:'bahrain',
  jeddah:'saudi-arabia', miami:'miami', villeneuve:'canada', monaco:'monaco',
  catalunya:'barcelona-catalunya', red_bull_ring:'austria', silverstone:'great-britain',
  spa:'belgium', hungaroring:'hungary', zandvoort:'netherlands', monza:'italy',
  madring:'spain', madrid:'spain', baku:'azerbaijan', marina_bay:'singapore',
  americas:'united-states', rodriguez:'mexico', interlagos:'brazil',
  las_vegas:'las-vegas', losail:'qatar', yas_marina:'united-arab-emirates'
};
export interface OfficialTime { name:string; startTimeUTC:string; cancelled:boolean }
export function parseOfficialSchedule(html:string, season:string): OfficialTime[] {
  const events:OfficialTime[]=[];
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const root=JSON.parse(match[1]);
    const nodes=Array.isArray(root)?root:root['@graph']||[root];
    for(const node of nodes) for(const event of node.subEvent||[]) {
      if(event['@type']!=='SportsEvent') continue;
      const name=String(event.name||'').split(' - ')[0];
      if(!/^(Practice [123]|Sprint Qualifying|Sprint|Qualifying|Race)$/.test(name)) continue;
      if(typeof event.startDate!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(event.startDate)||
        !Number.isFinite(Date.parse(event.startDate))||!event.startDate.startsWith(season+'-')) throw Error('Invalid official session time');
      if(events.some(e=>e.name===name)) throw Error('Duplicate official session');
      events.push({name,startTimeUTC:new Date(event.startDate).toISOString(),cancelled:String(event.eventStatus).endsWith('/EventCancelled')});
    }
  }
  if(!events.some(e=>e.name==='Race')||!events.some(e=>e.name==='Qualifying')) throw Error('Official schedule unavailable');
  return events;
}
export async function alignOfficialSchedule(meeting:F1Meeting):Promise<{meeting:F1Meeting;sourceUrl:string;checkedAt:string;changes:{session:string;previous:string;official:string}[]}> {
  const slug=pages[meeting.circuitId];
  if(!slug) throw Error('Unknown official race page: '+meeting.circuitId);
  const sourceUrl=`https://www.formula1.com/en/racing/${meeting.season}/${slug}`;
  const response=await fetch(sourceUrl,{cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
  if(!response.ok) throw Error('Official schedule HTTP '+response.status);
  const times=parseOfficialSchedule(await response.text(),meeting.season);
  const changes:{session:string;previous:string;official:string}[]=[];
  const sessions=meeting.sessions.flatMap(session=>{
    const name=session.type==='race'?'Race':session.type==='qualifying'?'Qualifying':session.type==='sprint_qualifying'?'Sprint Qualifying':session.type==='sprint'?'Sprint':session.nameEn;
    const official=times.find(t=>t.name===name);
    if(!official) throw Error('Session absent from official schedule: '+session.nameEn);
    if(official.cancelled) return [];
    if(Date.parse(session.startTimeUTC)!==Date.parse(official.startTimeUTC)) changes.push({session:session.nameEn,previous:session.startTimeUTC,official:official.startTimeUTC});
    return [{...session,startTimeUTC:official.startTimeUTC}];
  });
  const race=sessions.find(s=>s.type==='race');
  return {meeting:{...meeting,sessions,raceStartUTC:race?.startTimeUTC||meeting.raceStartUTC},sourceUrl,checkedAt:new Date().toISOString(),changes};
}
