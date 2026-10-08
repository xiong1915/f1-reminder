// lib/feishu/handler.ts
// 飞书开放平台 Webhook 事件调度器 (URL 握手、消息处理、卡片 Action 回调与防重幂等)

import { defaultSessionStore, defaultIdempotencyStore } from '../storage';
import { isResetCommand } from '../session/memory';
import { defaultAIOrchestrator } from '../ai/orchestrator';
import { buildResponseCard } from './cards';
import { getFeishuAccessToken, sendFeishuCard } from './client';
import { defaultF1Service } from '../../providers/f1/service';
import { formatBeijingDisplay } from '../f1/time';

export async function handleFeishuPayload(payload: any): Promise<{ status: number; body: any }> {
  // 1. URL 校验握手 (challenge)
  if (payload.type === 'url_verification' && payload.challenge) {
    return {
      status: 200,
      body: { challenge: payload.challenge }
    };
  }

  // 2. 卡片 Action 按钮交互回调 (card.action.trigger)
  if (payload.action) {
    const actionVal = payload.action.value || {};
    const actionType = actionVal.action;
    const operatorId = payload.operator?.open_id || payload.user_id || 'unknown';
    const msgId = payload.open_message_id || 'msg';
    const actionKey = `action:${operatorId}_${msgId}_${actionType}`;

    const alreadyHandled = await defaultIdempotencyStore.checkAndMarkHandled(actionKey, 600);
    if (alreadyHandled) {
      return { status: 200, body: { toast: { type: 'info', content: '操作已处理，无需重复点击' } } };
    }

    if (actionType === 'reset_context') {
      const convKey = defaultSessionStore.getKey({
        chatId: payload.open_chat_id,
        senderId: operatorId,
        chatType: payload.open_chat_id ? 'group' : 'p2p'
      });
      await defaultSessionStore.reset(convKey);
      return {
        status: 200,
        body: {
          toast: { type: 'success', content: '会话上下文已为您成功重置' }
        }
      };
    }

    if (actionType === 'f1_session_times') {
      const overview = await defaultF1Service.getOverview();
      const curr = overview.currentMeeting;
      const list = (curr.sessions || []).map(s => `• ${s.name}: ${s.startTimeUTC ? formatBeijingDisplay(s.startTimeUTC) : '待定'}`).join('\n');
      return {
        status: 200,
        body: {
          toast: { type: 'info', content: `【${curr.nameZh || curr.name} 各节时间】\n${list}` }
        }
      };
    }

    if (actionType === 'f1_full_calendar') {
      return {
        status: 200,
        body: {
          toast: { type: 'info', content: '完整赛历请访问 TIKE 官网: https://f1.tike69.cc.cd/races' }
        }
      };
    }

    return { status: 200, body: {} };
  }

  // 3. 消息接收事件 (im.message.receive_v1)
  if (payload.header?.event_type === 'im.message.receive_v1' || payload.event?.message) {
    const event = payload.event || {};
    const message = event.message || {};
    const sender = event.sender || {};
    const messageId = message.message_id;

    if (!messageId) return { status: 200, body: { message: 'no_message_id' } };

    // 幂等防重 (原子 SET NX 或内存互斥)
    const isHandled = await defaultIdempotencyStore.checkAndMarkHandled(`event:${messageId}`, 600);
    if (isHandled) {
      return { status: 200, body: { message: 'already_handled' } };
    }

    // 解析消息正文 (支持 text 与 post 富文本)
    let userText = '';
    try {
      const parsed = JSON.parse(message.content || '{}');
      userText = parsed.text || '';
    } catch (_) {}

    // 清洗飞书 @ 机器人的占位符
    userText = userText.replace(/@_user_\d+/g, '').trim();
    if (!userText) {
      return { status: 200, body: { message: 'empty_content' } };
    }

    const chatId = message.chat_id;
    const chatType = message.chat_type; // 'p2p' or 'group'
    const senderId = sender.sender_id?.open_id || 'unknown';
    const rootId = message.root_id;

    // 会话隔离 Key (群聊按用户隔离，话题帖按 rootId 隔离)
    const convKey = defaultSessionStore.getKey({ chatId, senderId, chatType, rootId });

    // 重置指令判定
    if (isResetCommand(userText)) {
      await defaultSessionStore.reset(convKey);
      const token = await getFeishuAccessToken();
      if (token) {
        const card = buildResponseCard({ replyText: '已成功清空当前上下文记忆，您可以开始全新的对话。' });
        await sendFeishuCard({ card, messageId, chatId, accessToken: token });
      }
      return { status: 200, body: { message: 'context_reset' } };
    }

    // 读取历史多轮上下文
    const history = await defaultSessionStore.getHistory(convKey);
    const messages = [...history, { role: 'user' as const, content: userText }];

    // 调用统一 AI Core
    const { reply, sources } = await defaultAIOrchestrator.answer(messages, senderId);

    // 存储对话历史
    await defaultSessionStore.saveHistory(convKey, [
      ...messages,
      { role: 'assistant' as const, content: reply }
    ]);

    // 发送飞书响应卡片
    const token = await getFeishuAccessToken();
    if (token) {
      const isF1 = defaultAIOrchestrator.classifyIntent(userText) !== 'GENERAL';
      const card = buildResponseCard({ replyText: reply, isF1, sources });
      await sendFeishuCard({ card, messageId, chatId, accessToken: token });
    }

    return { status: 200, body: { message: 'success' } };
  }

  return { status: 200, body: { message: 'ignored' } };
}
