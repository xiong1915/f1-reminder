// src/ai/orchestrator.js
// 统一 AI 调度中枢：服务于 Web 端与飞书机器人端

import { formatBeijingTime } from '../domain/f1/time.js';
import { checkIsF1Query, getRealtimeContext } from '../providers/realtime_search.js';
import { buildSystemPrompt } from './context_builder.js';
import { F1Service } from '../services/f1_service.js';

export async function askAI({
  query,
  history = [],
  env,
  isRegenerate = false,
  originalQuestion = ''
}) {
  const beijingTimeStr = formatBeijingTime(new Date());
  const isF1 = checkIsF1Query(query);

  let f1Overview = null;
  if (isF1) {
    try {
      const f1Service = new F1Service(env);
      f1Overview = await f1Service.getOverview();
    } catch (e) {
      console.warn('[AI Orchestrator] Failed to load F1 overview:', e.message);
    }
  }

  // 检索外部实时数据
  const realtimeData = await getRealtimeContext(query, env);

  const systemPrompt = buildSystemPrompt({
    beijingTime: beijingTimeStr,
    isF1,
    f1Overview,
    realtimeData,
    isRegenerate,
    originalQuestion
  });

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: query }
  ];

  const apiKey = (env && env.DEEPSEEK_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.DEEPSEEK_API_KEY);
  const modelName = (env && env.DEEPSEEK_MODEL) || 'deepseek-chat';

  if (!apiKey) {
    return {
      reply: '服务未配置 DEEPSEEK_API_KEY，无法调用大模型。',
      beijingTime: beijingTimeStr,
      isF1,
      realtimeData,
      sources: []
    };
  }

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '未能生成回答。';

    const sources = [];
    if (isF1) {
      sources.push({ name: 'Jolpica / OpenF1 2026 官方数据层', type: 'Canonical F1 Data' });
    }
    if (realtimeData?.success && realtimeData.results) {
      realtimeData.results.forEach(r => sources.push({ name: r.title, url: r.url, type: 'Web Search' }));
    }

    return {
      reply,
      beijingTime: beijingTimeStr,
      isF1,
      realtimeData,
      sources
    };
  } catch (err) {
    return {
      reply: `AI 推理服务暂时遇到问题: ${err.message}`,
      beijingTime: beijingTimeStr,
      isF1,
      realtimeData,
      sources: []
    };
  }
}
