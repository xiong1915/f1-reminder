// cf_worker.js - APEX F1 Race Intelligence & Feishu Bot (Cloudflare Worker 模块化架构 v2.0)
// 职责：统一分发 CORS OPTIONS、/api/* REST 端点、/ SSR 前端页面、飞书 Webhook 事件

import { handleApiRoutes, handleWebChat } from './src/routes/api_routes.js';
import { handleWebRoutes } from './src/routes/web_routes.js';
import {
  handleFeishuRoutes,
  buildResponseCard,
  buildFeishuCard,
  sendFeishuCard,
  getFeishuAccessToken,
  handleMessage,
  handleCardAction
} from './src/routes/feishu_routes.js';
import {
  getConversationKey,
  loadConversationHistory,
  saveConversationHistory,
  resetConversation,
  isResetCommand
} from './src/state/conversation_store.js';
import {
  checkIsF1Query,
  isNewsQuery,
  needsRealtimeSearch,
  shouldSearchWeb,
  buildF1ScheduleContext,
  buildSystemPrompt
} from './src/ai/context_builder.js';
import {
  searchTavily,
  searchWeb,
  fetchGdeltNews,
  fetchRssNews,
  getRealtimeContext
} from './src/providers/realtime_search.js';
import { getBeijingTime } from './src/domain/f1/time.js';
import { renderEditorialWebPage, renderHomePage } from './src/render/home_page.js';
import { renderSystemPage } from './src/render/system_page.js';
import {
  F1_CALENDAR_2026,
  DRIVERS_STANDINGS_2026,
  CONSTRUCTORS_STANDINGS_2026
} from './src/cache/fallback_data.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS 跨域预检处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // 2. API 路由 (/api/f1/*, /api/calendar, /api/chat 等)
    if (url.pathname.startsWith('/api/')) {
      const apiRes = await handleApiRoutes(request, env, ctx);
      if (apiRes) return apiRes;
    }

    // 3. Web SSR 页面路由 (/, /ai, /system 等 GET 页面请求)
    if (request.method === 'GET') {
      const webRes = await handleWebRoutes(request, env, ctx);
      if (webRes) return webRes;
    }

    // 4. 飞书开放平台机器人 Webhook 路由 (POST 请求)
    if (request.method === 'POST') {
      return handleFeishuRoutes(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  }
};

const renderWebPage = renderEditorialWebPage;

export {
  getConversationKey,
  loadConversationHistory,
  saveConversationHistory,
  resetConversation,
  isResetCommand,
  checkIsF1Query,
  isNewsQuery,
  needsRealtimeSearch,
  shouldSearchWeb,
  searchTavily,
  searchWeb,
  fetchGdeltNews,
  fetchRssNews,
  getRealtimeContext,
  getBeijingTime,
  buildF1ScheduleContext,
  buildSystemPrompt,
  buildResponseCard,
  buildFeishuCard,
  sendFeishuCard,
  getFeishuAccessToken,
  handleMessage,
  handleCardAction,
  handleWebChat,
  renderWebPage,
  renderEditorialWebPage,
  renderSystemPage,
  F1_CALENDAR_2026,
  DRIVERS_STANDINGS_2026,
  CONSTRUCTORS_STANDINGS_2026
};
