// src/routes/web_routes.js
// 统一 SSR 页面路由分发层

import { F1Service } from '../services/f1_service.js';
import { renderHomePage } from '../render/home_page.js';
import { renderAiPage } from '../render/ai_page.js';
import { renderSystemPage } from '../render/system_page.js';

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  });
}

export async function handleWebRoutes(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null;
  }

  const f1 = new F1Service(env);

  // 1. /system 系统监控页
  if (pathname === '/system') {
    const overview = await f1.getOverview();
    return htmlResponse(renderSystemPage(overview));
  }

  // 2. /ai 独立 AI 分析专页
  if (pathname === '/ai') {
    const overview = await f1.getOverview();
    return htmlResponse(renderAiPage(overview));
  }

  // 3. / 首页 (默认)
  if (pathname === '/' || pathname === '') {
    const overview = await f1.getOverview();
    return htmlResponse(renderHomePage(overview));
  }

  return null;
}
