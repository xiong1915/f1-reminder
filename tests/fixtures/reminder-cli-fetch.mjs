// Offline subprocess fixture: unknown network destinations fail immediately.
const now=Date.now(),date=(ms)=>new Date(ms).toISOString();
const start=date(now+30*60000),quali=date(now+86400000),race=date(now+2*86400000);
const field=iso=>({date:iso.slice(0,10),time:iso.slice(11)});
const states=new Map();
globalThis.fetch=async(url,options={})=>{
  const address=String(url);
  if(address==='https://redis.invalid/pipeline') return Response.json(JSON.parse(options.body).map(([op,key,value,...flags])=>{
    if(op.toLowerCase()==='get') return {result:states.get(key)||null};
    if(op.toLowerCase()==='set') {if(flags.includes('nx')&&states.has(key))return {result:null};states.set(key,value);return {result:'OK'};}
    throw Error('Unexpected Redis operation');
  }));
  if(address.startsWith('https://api.jolpi.ca/')) return Response.json({MRData:{RaceTable:{Races:[{season:new Date().getUTCFullYear(),round:18,raceName:'United States Grand Prix',Circuit:{circuitId:'americas',Location:{country:'United States',locality:'Austin'}},FirstPractice:field(start),Qualifying:field(quali),...field(race)}]}}});
  if(address.startsWith('https://www.formula1.com/')) return new Response(`<script type="application/ld+json">${JSON.stringify({subEvent:[['Practice 1',start],['Qualifying',quali],['Race',race]].map(([name,startDate])=>({'@type':'SportsEvent',name:name+' - United States Grand Prix',startDate}))})}</script>`);
  if(address==='https://open.feishu.cn/test-only') return Response.json({code:0});
  throw Error('Unexpected network destination');
};
