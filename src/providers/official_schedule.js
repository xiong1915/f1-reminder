// Official race-page identifiers only; race times are always read live.
const PAGES={albert_park:'australia',shanghai:'china',suzuka:'japan',bahrain:'bahrain',jeddah:'saudi-arabia',miami:'miami',villeneuve:'canada',monaco:'monaco',catalunya:'barcelona-catalunya',red_bull_ring:'austria',silverstone:'great-britain',spa:'belgium',hungaroring:'hungary',zandvoort:'netherlands',monza:'italy',madring:'spain',madrid:'spain',baku:'azerbaijan',marina_bay:'singapore',americas:'united-states',rodriguez:'mexico',interlagos:'brazil',las_vegas:'las-vegas',vegas:'las-vegas',losail:'qatar',yas_marina:'united-arab-emirates'};
const LOCATIONS={Austin:'united-states','Marina Bay':'singapore',Miami:'miami','Las Vegas':'las-vegas'};
function parseOfficialTimes(html,season) {
  const times=new Map();
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const root=JSON.parse(match[1]);
    for(const node of (Array.isArray(root)?root:root['@graph']||[root])) for(const event of node.subEvent||[]) {
      const name=String(event.name||'').split(' - ')[0];
      if(event['@type']!=='SportsEvent'||!/^(Practice [123]|Sprint Qualifying|Sprint|Qualifying|Race)$/.test(name)) continue;
      if(typeof event.startDate!=='string'||!event.startDate.startsWith(season+'-')||!/(Z|[+-]\d{2}:\d{2})$/.test(event.startDate)||!Number.isFinite(Date.parse(event.startDate))||times.has(name)) throw Error('Invalid official session time');
      const status=String(event.eventStatus||'');
      times.set(name,{startTimeUTC:new Date(event.startDate).toISOString(),cancelled:status.endsWith('/EventCancelled'),postponed:status.endsWith('/EventPostponed')});
    }
  }
  if(!times.has('Race')||!times.has('Qualifying')) throw Error('Official schedule unavailable');
  return times;
}
async function verifyOfficialSessions(sessions,nowMs,fetchImpl=globalThis.fetch) {
  const groups=new Map(),output=[],official=[];
  for(const session of sessions) {
    if(Math.abs(session.startTimeMs-nowMs)>4*86400000) continue;
    const slug=PAGES[session.circuitId]||LOCATIONS[session.locality];
    if(!slug) throw Error('Official race page unknown: '+(session.circuitId||session.locality));
    const url=`https://www.formula1.com/en/racing/${session.season}/${slug}`;
    if(!groups.has(url)) groups.set(url,[]);
    groups.get(url).push(session);
  }
  for(const [sourceUrl,group] of groups) {
    const response=await fetchImpl(sourceUrl,{signal:AbortSignal.timeout(10000),headers:{Accept:'text/html','Cache-Control':'no-cache'}});
    if(!response.ok) throw Error('Official schedule HTTP '+response.status);
    const times=parseOfficialTimes(await response.text(),group[0].season),changes=[];
    for(const session of group) {
      const name=session.sessionName==='Sprint Shootout'?'Sprint Qualifying':session.sessionName;
      const time=times.get(name);
      if(!time) throw Error('Session absent from official schedule: '+name);
      if(time.cancelled||time.postponed) continue;
      if(Date.parse(time.startTimeUTC)!==session.startTimeMs) changes.push({session:name,previous:session.startTimeUTC,official:time.startTimeUTC});
      output.push({...session,startTimeUTC:time.startTimeUTC,startTimeMs:Date.parse(time.startTimeUTC)});
    }
    official.push({sourceUrl,checkedAt:new Date(nowMs).toISOString(),changes});
  }
  return {sessions:output,official};
}
module.exports={parseOfficialTimes,verifyOfficialSessions};
