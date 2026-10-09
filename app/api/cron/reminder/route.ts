// app/api/cron/reminder/route.ts
// 100% 纯云端 Serverless F1 比赛开赛提醒触发器 (彻底脱离本地电脑依赖)
// 适配 Cloudflare Worker Cron / Vercel Cron / QStash 定时轮询，具备分布式原子幂等防重

import { NextRequest, NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';
import { RaceStateService } from '@/lib/f1/race-state';
import { defaultIdempotencyStore } from '@/lib/storage';
import { formatBeijingDisplay } from '@/lib/f1/time';

export const dynamic = 'force-dynamic';

const DEFAULT_FEISHU_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/c07f5cd2-8f2a-42c1-98db-1a19a761df60';

async function sendFeishuWebhook(webhookUrl: string, payload: any): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.code === 0 || data.StatusCode === 0;
  } catch (err) {
    console.error('[CloudReminder] Webhook 请求失败:', err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  return handleReminderCheck(req);
}

export async function POST(req: NextRequest) {
  return handleReminderCheck(req);
}

async function handleReminderCheck(req: NextRequest) {
  const nowMs = Date.now();
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL || process.env.PUSH_KEY || DEFAULT_FEISHU_WEBHOOK;

  try {
    const calendar = await defaultF1Service.getCalendar('2026');
    if (!calendar || calendar.length === 0) {
      return NextResponse.json({ status: 'no_calendar_data', checkedAt: new Date(nowMs).toISOString() });
    }

    // 寻找当前最邻近的分站及环节
    const matchedAlerts: any[] = [];

    for (const meeting of calendar) {
      if (!meeting.sessions || meeting.sessions.length === 0) continue;

      for (const session of meeting.sessions) {
        if (!session.startTimeUTC) continue;
        const startMs = new Date(session.startTimeUTC).getTime();
        if (isNaN(startMs)) continue;

        const diffMinutes = (startMs - nowMs) / 60000;

        // 提醒时间窗口：开赛前 35 分钟以内，或者已过开赛时间 5 分钟以内的紧急补发 (0 < diff <= 35) 或 (-5 <= diff <= 0)
        const inStandardWindow = diffMinutes > 0 && diffMinutes <= 35;
        const inCatchupWindow = diffMinutes <= 0 && diffMinutes >= -5;

        if (inStandardWindow || inCatchupWindow) {
          const sessionKey = `f1:cloud_reminded:${meeting.round}:${session.id || session.name}:${session.startTimeUTC}`;
          
          // 分布式原子幂等检查：7 天内该场次只推送一次，绝对杜绝重复轰炸
          const alreadyHandled = await defaultIdempotencyStore.checkAndMarkHandled(sessionKey, 86400 * 7);
          if (alreadyHandled) {
            matchedAlerts.push({
              session: session.name,
              round: meeting.round,
              status: 'already_sent_suppressed',
              diffMinutes: Math.round(diffMinutes)
            });
            continue;
          }

          // 组织飞书交互式卡片
          const isCatchUp = inCatchupWindow;
          const remMin = Math.max(1, Math.round(diffMinutes));
          const timeStr = formatBeijingDisplay(session.startTimeUTC);
          const gpName = `${meeting.nameZh || meeting.name} (${meeting.locality} · ${meeting.circuitName})`;
          const headerTitle = isCatchUp 
            ? `🏎️ 【即将开赛紧急提醒】仅剩 ${remMin} 分钟` 
            : `🏎️ F1 比赛开赛提醒 (前30分钟)`;
          const noteText = isCatchUp 
            ? `⚠️ 提示：开赛在即（剩余约 ${remMin} 分钟），请立即就位观赛！🏁` 
            : `🏁 五盏红灯熄灭，精彩即将开赛，请做好观赛准备！`;

          const cardPayload = {
            msg_type: 'interactive',
            card: {
              header: {
                title: { tag: 'plain_text', content: headerTitle },
                template: isCatchUp ? 'orange' : 'carmine'
              },
              elements: [
                {
                  tag: 'div',
                  text: {
                    tag: 'lark_md',
                    content: `**🏆 大奖赛**：${gpName}\n**⏱️ 环节**：${session.name}\n**📍 赛道地点**：${meeting.locality}\n**⏰ 开赛时间**：${timeStr} (北京时间)\n**⏳ 倒计时**：约 **${remMin} 分钟**`
                  }
                },
                {
                  tag: 'note',
                  elements: [
                    { tag: 'plain_text', content: noteText }
                  ]
                },
                {
                  tag: 'action',
                  actions: [
                    {
                      tag: 'button',
                      text: { tag: 'plain_text', content: '📊 查看积分榜' },
                      type: 'primary',
                      url: 'https://f1.tike69.cc.cd/standings'
                    },
                    {
                      tag: 'button',
                      text: { tag: 'plain_text', content: '🤖 问问 AI 战术' },
                      type: 'default',
                      url: 'https://f1.tike69.cc.cd/ai'
                    }
                  ]
                }
              ]
            }
          };

          const sentSuccess = await sendFeishuWebhook(webhookUrl, cardPayload);

          matchedAlerts.push({
            session: session.name,
            round: meeting.round,
            diffMinutes: remMin,
            status: sentSuccess ? 'delivered' : 'failed_network',
            targetTime: timeStr
          });
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      mode: '100% Cloud Serverless',
      executedAt: new Date(nowMs).toISOString(),
      alertsTriggered: matchedAlerts.length,
      details: matchedAlerts
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
