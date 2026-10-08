// src/routes/api_routes.js
// 统一 REST API 路由层

import { F1Service } from '../services/f1_service.js';
import { askAI } from '../ai/orchestrator.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60'
    }
  });
}

export async function handleApiRoutes(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const f1 = new F1Service(env);

  // 1. GET /api/f1/overview (核心聚合端点，避免前端发 8 个请求)
  if (request.method === 'GET' && pathname === '/api/f1/overview') {
    const overview = await f1.getOverview();
    return jsonResponse(overview);
  }

  // 2. GET /api/f1/calendar 或兼容旧 /api/calendar
  if (request.method === 'GET' && (pathname === '/api/f1/calendar' || pathname === '/api/calendar')) {
    const cal = await f1.getCalendar();
    return jsonResponse({ calendar: cal.data, status: 'online', stale: cal.stale, updatedAt: cal.updatedAt });
  }

  // 3. GET /api/f1/standings/drivers
  if (request.method === 'GET' && pathname === '/api/f1/standings/drivers') {
    const drivers = await f1.getDriverStandings();
    return jsonResponse({ drivers: drivers.data, stale: drivers.stale, updatedAt: drivers.updatedAt });
  }

  // 4. GET /api/f1/standings/constructors
  if (request.method === 'GET' && pathname === '/api/f1/standings/constructors') {
    const teams = await f1.getConstructorStandings();
    return jsonResponse({ constructors: teams.data, stale: teams.stale, updatedAt: teams.updatedAt });
  }

  // 5. GET /api/f1/results/latest
  if (request.method === 'GET' && pathname === '/api/f1/results/latest') {
    const result = await f1.getLatestRaceResult();
    return jsonResponse({ result: result.data, stale: result.stale, updatedAt: result.updatedAt });
  }

  // 6. GET /api/f1/live
  if (request.method === 'GET' && pathname === '/api/f1/live') {
    const overview = await f1.getOverview();
    return jsonResponse({ live: overview.liveState, nextSession: overview.nextSession });
  }

  // 7. POST /api/chat (Web 端 TIKE AI 对话接口)
  if (request.method === 'POST' && pathname === '/api/chat') {
    try {
      const body = await request.json();
      const message = body.message || body.query;
      if (!message || typeof message !== 'string') {
        return jsonResponse({ error: '消息内容不能为空' }, 400);
      }
      const history = Array.isArray(body.history) ? body.history : [];
      const aiResult = await askAI({ query: message, history, env });
      return jsonResponse(aiResult);
    } catch (e) {
      return jsonResponse({ error: `请求解析失败: ${e.message}` }, 400);
    }
  }

  return null;
}

export async function handleWebChat(request, env) {
  try {
    const json = await request.json();
    const userText = (json.message || json.query || '').trim();
    if (!userText) {
      return jsonResponse({ error: '消息内容不能为空' }, 400);
    }
    const history = Array.isArray(json.history) ? json.history : [];
    const aiResult = await askAI({ query: userText, history, env });
    return jsonResponse(aiResult);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
