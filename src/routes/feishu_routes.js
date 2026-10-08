// src/routes/feishu_routes.js
// 飞书开放平台机器人集成路由与消息处理 (事件、交互卡片、URL 验证、权限隔离与防重)

import {
  getConversationKey,
  loadConversationHistory,
  saveConversationHistory,
  resetConversation,
  isResetCommand
} from '../state/conversation_store.js';
import { getBeijingTime } from '../domain/f1/time.js';
import {
  checkIsF1Query,
  buildF1ScheduleContext,
  buildSystemPrompt
} from '../ai/context_builder.js';
import { getRealtimeContext } from '../providers/realtime_search.js';
import { FALLBACK_CALENDAR_2026 } from '../cache/fallback_data.js';

// 内存二级后备与防重
export const memoryIdempotency = new Map();

/**
 * 构造飞书交互卡片
 */
export function buildResponseCard({ replyText, realtimeData, searchStatus, searchResults, isF1 }) {
  if (!realtimeData && searchStatus) {
    realtimeData = {
      attempted: searchStatus !== 'not_triggered',
      success: searchStatus === 'success',
      source: 'tavily',
      results: searchResults || []
    };
  }
  let cardTitle = "🤖 智能助手";
  let cardTemplate = "blue";
  let footnote = "";

  if (realtimeData && realtimeData.attempted) {
    if (realtimeData.success && realtimeData.results && realtimeData.results.length > 0) {
      const sourceTag = realtimeData.source === 'gdelt' ? '📰 实时新闻数据 (GDELT)' :
                        realtimeData.source === 'rss' ? '📰 实时新闻数据 (RSS)' :
                        '🌐 已进行实时联网检索';
      cardTitle = isF1 ? `🏎️ F1 赛车助手 (${sourceTag})` : `🤖 智能助手 (${sourceTag})`;
      cardTemplate = "turquoise";
      const sourceList = realtimeData.results.slice(0, 3).map((s, idx) => {
        if (s.url) {
          return `• [${idx + 1}] [${s.title}](${s.url})`;
        }
        return `• [${idx + 1}] ${s.title}`;
      }).join('\n');
      footnote = `\n\n---\n**${sourceTag}**：\n${sourceList}`;
    } else {
      cardTitle = isF1 ? "🏎️ F1 赛车助手 (⚠️ 实时检索失败)" : "🤖 智能助手 (⚠️ 实时检索失败)";
      cardTemplate = "orange";
      footnote = `\n\n---\n**⚠️ 实时检索失败**：未能获取最新互联网实时数据，以上回答基于模型已有知识`;
    }
  } else {
    cardTitle = isF1 ? "🏎️ F1 赛车助手" : "🤖 智能助手";
    cardTemplate = "blue";
    footnote = `\n\n---\n**🤖 AI 回答**`;
  }

  // 构造结构化交互按钮区域
  const actionButtons = [];
  if (isF1) {
    actionButtons.push(
      {
        tag: "button",
        text: { tag: "plain_text", content: "⏱️ 本站各节具体时间" },
        type: "primary",
        value: { action: "f1_session_times" }
      },
      {
        tag: "button",
        text: { tag: "plain_text", content: "📅 查看完整年度赛历" },
        type: "default",
        value: { action: "f1_full_calendar" }
      },
      {
        tag: "button",
        text: { tag: "plain_text", content: "🗑️ 清空上下文" },
        type: "danger",
        value: { action: "reset_context" }
      }
    );
  } else {
    actionButtons.push(
      {
        tag: "button",
        text: { tag: "plain_text", content: "🔄 换个角度回答" },
        type: "default",
        value: { action: "regenerate" }
      },
      {
        tag: "button",
        text: { tag: "plain_text", content: "🗑️ 清空上下文" },
        type: "danger",
        value: { action: "reset_context" }
      }
    );
  }

  return {
    header: {
      title: { tag: "plain_text", content: cardTitle },
      template: cardTemplate
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `${replyText}${footnote}`
        }
      },
      {
        tag: "action",
        actions: actionButtons
      }
    ]
  };
}

export const buildFeishuCard = buildResponseCard;

/**
 * 统一向飞书发送交互卡片
 */
export async function sendFeishuCard({ card, messageId, chatId, accessToken }) {
  if (messageId) {
    try {
      const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          content: JSON.stringify(card),
          msg_type: 'interactive'
        })
      });
      const data = await res.json();
      if (data.code === 0) return true;
    } catch (_) {}
  }

  if (chatId) {
    try {
      const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          receive_id: chatId,
          content: JSON.stringify(card),
          msg_type: 'interactive'
        })
      });
      const data = await res.json();
      return data.code === 0;
    } catch (_) {}
  }
  return false;
}

/**
 * 获取飞书 tenant_access_token
 */
export async function getFeishuAccessToken(env) {
  const appId = (env && env.FEISHU_APP_ID) || (typeof process !== 'undefined' && process.env && process.env.FEISHU_APP_ID) || '';
  const appSecret = (env && env.FEISHU_APP_SECRET) || (typeof process !== 'undefined' && process.env && process.env.FEISHU_APP_SECRET) || '';
  if (!appId || !appSecret) {
    console.error('[飞书凭据缺失]: 未配置 FEISHU_APP_ID 或 FEISHU_APP_SECRET');
    return null;
  }

  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const data = await res.json();
    if (data.code !== 0) {
      console.error('[获取飞书 Token 失败]:', data.msg);
      return null;
    }
    return data.tenant_access_token;
  } catch (err) {
    console.error('[获取飞书 Token 异常]:', err);
    return null;
  }
}

/**
 * 普通文本消息处理入口
 */
export async function handleMessage(message, event, env) {
  try {
    const parsed = JSON.parse(message.content);
    let rawText = (parsed.text || '').trim();

    // 过滤掉 @机器人的飞书标签
    let text = rawText.replace(/@_user_\d+/g, '').replace(/@[\w\u4e00-\u9fa5]+/g, '').trim();
    if (!text) return;

    const senderId = (event && event.sender && event.sender.sender_id && (event.sender.sender_id.open_id || event.sender.sender_id.user_id)) || (message.sender && message.sender.id) || 'unknown_user';
    const chatId = message.chat_id || (message.sender && message.sender.id) || 'default_chat';
    const chatType = message.chat_type || (chatId.startsWith('oc_') ? 'group' : 'p2p');
    const rootId = (message.root_id && message.root_id.trim()) || '';

    // 1. 生成会话唯一 Key（支持群聊按人、话题 thread 隔离）
    const convKey = getConversationKey({ chatId, senderId, chatType, rootId });

    const accessToken = await getFeishuAccessToken(env);

    // 2. 检查会话重置指令
    if (isResetCommand(text)) {
      console.log(`>>> [会话重置指令命中]: key=${convKey}`);
      await resetConversation(convKey, env);
      if (accessToken) {
        const resetCard = {
          header: { title: { tag: "plain_text", content: "✅ 会话已重置" }, template: "green" },
          elements: [{ tag: "div", text: { tag: "lark_md", content: "已为你清空当前会话上下文，随时可以开启新话题！" } }]
        };
        await sendFeishuCard({ card: resetCard, messageId: message.message_id, chatId, accessToken });
      }
      return;
    }

    // 3. 读取会话历史
    const history = await loadConversationHistory(convKey, env);

    // 4. 计算当前北京时间
    const now = new Date();
    const beijingTime = getBeijingTime(now);

    // 5. 判断 F1 意图
    const isF1 = checkIsF1Query(text);
    const f1Context = isF1 ? buildF1ScheduleContext(now) : '';

    // 6. 统一实时信息检索
    const realtimeData = await getRealtimeContext(text, env);

    // 7. 构建 System Prompt
    const systemPrompt = buildSystemPrompt({
      beijingTime,
      isF1,
      f1Context,
      realtimeData
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: text }
    ];

    // 8. 调用 DeepSeek 模型
    const dsKey = (env && env.DEEPSEEK_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.DEEPSEEK_API_KEY) || '';
    const dsModel = (env && env.DEEPSEEK_MODEL) || 'deepseek-chat';
    let replyText = '助手正在思考中，请稍后再试～';

    if (dsKey) {
      const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dsKey}`
        },
        body: JSON.stringify({
          model: dsModel,
          messages: messages,
          max_tokens: 800,
          temperature: 0.4
        })
      });

      const dsData = await dsRes.json();
      if (dsData.choices && dsData.choices[0] && dsData.choices[0].message) {
        replyText = dsData.choices[0].message.content.trim();
      } else if (dsData.error) {
        replyText = `模型接口返回异常: ${dsData.error.message || '请检查额度或配置'}`;
      }
    } else {
      replyText = '系统未检测到 DEEPSEEK_API_KEY，请在 Cloudflare 环境变量中添加。';
    }

    // 9. 仅将 clean 的 user / assistant 对话保存进历史，防止上下文污染
    history.push({ role: 'user', content: text });
    history.push({ role: 'assistant', content: replyText });
    await saveConversationHistory(convKey, history, env);

    // 10. 构建并发送交互卡片
    if (accessToken) {
      const card = buildResponseCard({
        replyText,
        realtimeData,
        isF1
      });
      await sendFeishuCard({ card, messageId: message.message_id, chatId, accessToken });
    }

  } catch (e) {
    console.error('处理消息异常:', e);
  }
}

/**
 * 飞书卡片交互按钮回调处理入口 (毫秒级响应防 3 秒超时 + ctx.waitUntil 异步处理)
 */
export async function handleCardAction(body, env, ctx) {
  try {
    // 兼容飞书卡片回调两种格式
    const isEventV2 = body.header && body.header.event_type === 'card.action.trigger';
    const actionValue = isEventV2 ? (body.event && body.event.action && body.event.action.value) : (body.action && body.action.value);
    const actionName = actionValue && actionValue.action;
    if (!actionName) {
      return new Response(JSON.stringify({ toast: { type: 'warning', content: '未识别的操作' } }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 必须从回调事件本身提取安全标识，绝不信任客户端入参
    const senderId = (isEventV2 ? (body.event && body.event.operator && (body.event.operator.open_id || body.event.operator.user_id)) : (body.open_id || body.user_id)) || 'unknown_operator';
    const chatId = (isEventV2 ? (body.event && body.event.context && body.event.context.open_chat_id) : body.open_chat_id) || '';
    const messageId = (isEventV2 ? (body.event && body.event.context && body.event.context.open_message_id) : body.open_message_id) || '';
    const rootId = (isEventV2 && body.event && body.event.context && body.event.context.root_id) || '';

    // 防重复点击（幂等拦截）
    const eventId = (body.header && body.header.event_id) || body.token || (isEventV2 && body.event && body.event.token) || `${senderId}_${messageId}_${actionName}`;
    const idempotencyKey = `idempotency:action:${eventId}`;

    if (memoryIdempotency.has(idempotencyKey)) {
      console.log(`[防重拦截]: 忽略重复点击 ${idempotencyKey}`);
      return new Response(JSON.stringify({ toast: { type: 'info', content: '请求已在处理中，请勿重复点击' } }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    memoryIdempotency.set(idempotencyKey, Date.now());

    if (env && env.KV_CHAT) {
      try {
        const exists = await env.KV_CHAT.get(idempotencyKey);
        if (exists) {
          return new Response(JSON.stringify({ toast: { type: 'info', content: '请求已在处理中，请勿重复点击' } }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        await env.KV_CHAT.put(idempotencyKey, '1', { expirationTtl: 300 });
      } catch (_) {}
    }

    const convKey = getConversationKey({ chatId, senderId, chatType: chatId ? 'group' : 'p2p', rootId });

    // 1. Action: 清空上下文
    if (actionName === 'reset_context') {
      console.log(`>>> [卡片点击清空上下文]: key=${convKey}, operator=${senderId}`);
      await resetConversation(convKey, env);
      const asyncTask = async () => {
        try {
          const accessToken = await getFeishuAccessToken(env);
          if (accessToken) {
            const resetCard = {
              header: { title: { tag: "plain_text", content: "✅ 上下文已清空" }, template: "green" },
              elements: [{ tag: "div", text: { tag: "lark_md", content: `已为当前用户成功清空会话上下文，随时开启新话题！` } }]
            };
            await sendFeishuCard({ card: resetCard, messageId, chatId, accessToken });
          }
        } catch (e) {
          console.error('[清空上下文异步发送异常]:', e);
        }
      };
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(asyncTask());
      } else {
        await asyncTask();
      }
      return new Response(JSON.stringify({ toast: { type: 'success', content: '已清空当前上下文' } }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Action: 换个角度回答
    if (actionName === 'regenerate') {
      console.log(`>>> [卡片点击换个角度回答]: key=${convKey}, operator=${senderId}`);
      const history = await loadConversationHistory(convKey, env);
      const lastUserMsg = [...history].reverse().find(m => m.role === 'user');

      if (!lastUserMsg) {
        return new Response(JSON.stringify({ toast: { type: 'warning', content: '当前无历史问题可供重新回答' } }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const asyncRegenerate = async () => {
        try {
          const now = new Date();
          const beijingTime = getBeijingTime(now);
          const isF1 = checkIsF1Query(lastUserMsg.content);
          const f1Context = isF1 ? buildF1ScheduleContext(now) : '';
          const realtimeData = await getRealtimeContext(lastUserMsg.content, env);

          const systemPrompt = buildSystemPrompt({
            beijingTime,
            isF1,
            f1Context,
            realtimeData,
            isRegenerate: true,
            originalQuestion: lastUserMsg.content
          });

          const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(0, -1),
            { role: 'user', content: `请换一个全新的角度回答：${lastUserMsg.content}` }
          ];

          const dsKey = (env && env.DEEPSEEK_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.DEEPSEEK_API_KEY) || '';
          const dsModel = (env && env.DEEPSEEK_MODEL) || 'deepseek-chat';
          let replyText = '助手正在重新思考中...';

          if (dsKey) {
            const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dsKey}`
              },
              body: JSON.stringify({
                model: dsModel,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7
              })
            });
            const dsData = await dsRes.json();
            if (dsData.choices && dsData.choices[0] && dsData.choices[0].message) {
              replyText = dsData.choices[0].message.content.trim();
            }
          }

          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'assistant') {
              history[i].content = replyText;
              break;
            }
          }
          await saveConversationHistory(convKey, history, env);

          const accessToken = await getFeishuAccessToken(env);
          if (accessToken) {
            const card = buildResponseCard({
              replyText: `🔄 **[换个角度解答]**\n\n${replyText}`,
              realtimeData,
              isF1
            });
            await sendFeishuCard({ card, messageId, chatId, accessToken });
          }
        } catch (e) {
          console.error('[换个角度异步处理异常]:', e);
        }
      };

      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(asyncRegenerate());
      } else {
        await asyncRegenerate();
      }

      return new Response(JSON.stringify({ toast: { type: 'info', content: '正在换个角度回答，请稍候...' } }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Action: F1 本站具体时间
    if (actionName === 'f1_session_times') {
      const asyncF1Times = async () => {
        try {
          const now = new Date();
          const beijingMs = now.getTime() + 8 * 3600 * 1000;
          const beijingDateStr = new Date(beijingMs).toISOString().split('T')[0];
          const upcoming = FALLBACK_CALENDAR_2026.filter(c => (c.end || c.dateEnd) >= beijingDateStr);
          const currentRound = upcoming[0] || FALLBACK_CALENDAR_2026[0];

          const timeText = `🏎️ **2026 F1 第 ${currentRound.round} 站 ${currentRound.gp || currentRound.nameZh}**\n` +
            `📍 **赛道**：${currentRound.country || ''} · ${currentRound.circuit}\n` +
            `📅 **日期**：${currentRound.start || currentRound.dateStart} 至 ${currentRound.end || currentRound.dateEnd} (${currentRound.isSprint ? '冲刺赛周末' : '常规大奖赛周末'})\n\n` +
            `**各节赛程具体北京时间**：\n• ` + (currentRound.details || '10-09 16:30 FP1 / 10-09 20:30 SQ / 10-10 17:00 Sprint / 10-10 21:00 Quali / 10-11 20:00 Race').replace(/\s*\/\s*/g, '\n• ');

          const accessToken = await getFeishuAccessToken(env);
          if (accessToken) {
            const card = buildResponseCard({
              replyText: timeText,
              realtimeData: { attempted: false },
              isF1: true
            });
            await sendFeishuCard({ card, messageId, chatId, accessToken });
          }
        } catch (e) {
          console.error('[F1时间异步处理异常]:', e);
        }
      };

      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(asyncF1Times());
      } else {
        await asyncF1Times();
      }

      return new Response(JSON.stringify({ toast: { type: 'info', content: '已发送本站详细时间' } }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Action: F1 完整年度赛历
    if (actionName === 'f1_full_calendar') {
      const asyncF1Calendar = async () => {
        try {
          let calText = `📅 **2026 赛季 F1 剩余分站官方赛历安排**：\n\n`;
          for (const r of FALLBACK_CALENDAR_2026) {
            calText += `• **第 ${r.round} 站 ${r.gp || r.nameZh}** (${r.country || ''} · ${r.circuit})\n  - 时间：${r.start || r.dateStart} ~ ${r.end || r.dateEnd} ${r.isSprint ? '【冲刺赛】' : ''}\n`;
          }

          const accessToken = await getFeishuAccessToken(env);
          if (accessToken) {
            const card = buildResponseCard({
              replyText: calText,
              realtimeData: { attempted: false },
              isF1: true
            });
            await sendFeishuCard({ card, messageId, chatId, accessToken });
          }
        } catch (e) {
          console.error('[F1赛历异步处理异常]:', e);
        }
      };

      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(asyncF1Calendar());
      } else {
        await asyncF1Calendar();
      }

      return new Response(JSON.stringify({ toast: { type: 'info', content: '已发送完整赛历' } }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ code: 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('处理卡片交互异常:', err);
    return new Response(JSON.stringify({ code: -1, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 飞书路由顶层分发处理器 (POST 请求)
 */
export async function handleFeishuRoutes(request, env, ctx) {
  try {
    const body = await request.json();

    // 1. 飞书开放平台首次 URL 校验握手
    if (body.type === 'url_verification') {
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 飞书卡片按钮点击交互回调 (支持 v1 和 v2 触发事件)
    if ((body.action && body.action.value) || (body.header && body.header.event_type === 'card.action.trigger')) {
      return handleCardAction(body, env, ctx);
    }

    // 3. 接收普通文本消息事件 (im.message.receive_v1)
    if (body.header && body.header.event_type === 'im.message.receive_v1') {
      const message = body.event && body.event.message;
      if (message && message.message_type === 'text') {
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(handleMessage(message, body.event, env));
        } else {
          await handleMessage(message, body.event, env);
        }
      }
    }

    return new Response(JSON.stringify({ code: 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response('OK', { status: 200 });
  }
}
