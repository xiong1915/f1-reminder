import {redisCall,sendFeishuPayload} from './reminder_edge.js';
const INCIDENT='f1:watch:primary-incident';
const parse=value=>typeof value==='string'?JSON.parse(value):value;
export async function watchPrimaryHealth(env,{nowMs=Date.now(),fetchImpl=globalThis.fetch}={}) {
  const url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL;
  const token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
  const webhookUrl=env.FEISHU_WEBHOOK_URL||env.PUSH_KEY;
  if(!url||!token||!webhookUrl) throw Error('Watchdog requires Redis and Feishu');
  const redis=command=>redisCall(url,token,command,fetchImpl);
  const primary=parse(await redis(['get','f1:reminder:health:cloudflare']));
  const age=nowMs-Date.parse(primary?.checkedAt);
  const healthy=Number.isFinite(age)&&age>=-60000&&age<=180000&&primary?.status!=='error'&&!primary?.errors?.length;
  let incident=parse(await redis(['get',INCIDENT]));
  async function notify(phase,text) {
    const key=`f1:watch:delivery:${incident.id}:${phase}`;
    if(await redis(['set',key,JSON.stringify({status:'pending'}),'nx','ex',120])!=='OK') return parse(await redis(['get',key]))?.status||'pending';
    try {
      await sendFeishuPayload({webhookUrl,payload:{msg_type:'text',content:{text}},fetchImpl});
      await redis(['set',key,JSON.stringify({status:'sent'})]);
      return 'sent';
    } catch(error) {
      if(error.isRejected) await redis(['del',key]);
      else await redis(['set',key,JSON.stringify({status:'uncertain'}),'ex',60]);
      throw error;
    }
  }
  if(healthy) {
    if(incident) {
      const recovered=await notify('recovered','【系统恢复】F1 一分钟主调度已恢复有效心跳，赛前及开赛提醒继续按官方时间执行');
      if(recovered==='sent') {
        for(const phase of ['down','recovered']) await redis(['set',`f1:watch:delivery:${incident.id}:${phase}`,JSON.stringify({status:'sent'}),'ex',604800]);
        await redis(['del',INCIDENT]);
      }
    }
    return {primary:'healthy'};
  }
  if(!incident) {
    await redis(['set',INCIDENT,JSON.stringify({id:new Date(nowMs).toISOString()}),'nx']);
    incident=parse(await redis(['get',INCIDENT]));
  }
  const alert=await notify('down','【系统告警】F1 一分钟主调度没有有效心跳，备用云端通道正在接管赛事检查与提醒\n这是故障通知，不是真实赛事提醒；恢复后会再通知一次');
  return {primary:'down',alert};
}
