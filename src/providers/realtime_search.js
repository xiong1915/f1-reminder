// src/providers/realtime_search.js
// 统一多源实时检索与降级体系：Tavily -> GDELT -> RSS Adapter -> 短期缓存

import { checkIsF1Query, isNewsQuery, needsRealtimeSearch, shouldSearchWeb } from '../ai/context_builder.js';

export { checkIsF1Query, isNewsQuery, needsRealtimeSearch, shouldSearchWeb };

/**
 * 实时信息适配器：Tavily 搜索
 */
export async function searchTavily(query, env) {
  if (!query) return { success: false, reason: 'empty_query', results: [] };
  const apiKey = (env && env.TAVILY_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.TAVILY_API_KEY) || '';
  if (!apiKey) return { success: false, reason: 'no_key', results: [] };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        max_results: 5
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Tavily Search]: HTTP ${res.status}`);
      return { success: false, reason: `http_${res.status}`, results: [] };
    }

    const data = await res.json();
    if (data && Array.isArray(data.results) && data.results.length > 0) {
      const results = data.results.map(r => ({
        title: r.title || '无标题网页',
        url: r.url || '',
        snippet: (r.content || r.snippet || '').trim(),
        content: (r.content || r.snippet || '').trim(),
        source: 'Tavily'
      })).filter(r => r.title && r.snippet);

      if (results.length > 0) {
        return { success: true, results };
      }
    }
    return { success: false, reason: 'empty', results: [] };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, reason: err.name === 'AbortError' ? 'timeout' : 'error', results: [] };
  }
}

export const searchWeb = searchTavily;

/**
 * 实时信息适配器：GDELT DOC API (全球免 Key 公开新闻)
 */
export async function fetchGdeltNews(query = 'world news') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    let gdeltQ = 'china OR world OR international news';
    if (query && !/新闻|今天|最新/.test(query)) {
      gdeltQ = query;
    }
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQ)}&mode=artlist&format=json&maxrecords=10&sort=datedesc`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) F1NewsBot/2.0'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[GDELT]: HTTP ${res.status}`);
      return { success: false, reason: `http_${res.status}`, results: [] };
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, reason: 'invalid_json', results: [] };
    }

    if (data && Array.isArray(data.articles) && data.articles.length > 0) {
      const seenUrls = new Set();
      const seenTitles = new Set();
      const results = [];

      for (const a of data.articles) {
        const title = (a.title || '').trim();
        const url = (a.url || '').trim();
        if (!title || !url || seenUrls.has(url) || seenTitles.has(title)) continue;
        seenUrls.add(url);
        seenTitles.add(title);
        const snippet = `[${a.domain || a.sourcecountry || '国际快讯'}] ${title}`;
        results.push({
          title,
          url,
          snippet,
          content: snippet,
          source: 'GDELT'
        });
        if (results.length >= 6) break;
      }

      if (results.length > 0) {
        return { success: true, results };
      }
    }
    return { success: false, reason: 'empty', results: [] };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, reason: err.name === 'AbortError' ? 'timeout' : 'error', results: [] };
  }
}

/**
 * 实时信息适配器：RSS Fallback (开放全球要闻源)
 */
export async function fetchRssNews() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const rssUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 NewsBot/1.0',
        'Accept': 'application/xml, text/xml, */*'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return { success: false, reason: `http_${res.status}`, results: [] };

    const xml = await res.text();
    const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>(?:[\s\S]*?<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>)?[\s\S]*?<\/item>/gi;
    let match;
    const results = [];
    const seen = new Set();

    while ((match = itemRegex.exec(xml)) !== null && results.length < 5) {
      const title = (match[1] || '').replace(/<[^>]+>/g, '').trim();
      const link = (match[2] || '').trim();
      const desc = (match[3] || '').replace(/<[^>]+>/g, '').trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        results.push({
          title,
          url: link,
          snippet: desc || title,
          content: desc || title,
          source: 'RSS Feed'
        });
      }
    }

    if (results.length > 0) {
      return { success: true, results };
    }
    return { success: false, reason: 'empty', results: [] };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, reason: err.name === 'AbortError' ? 'timeout' : 'error', results: [] };
  }
}

/**
 * 统一实时信息调度器 (Tavily -> GDELT -> RSS -> 短期缓存)
 */
export async function getRealtimeContext(query, env) {
  const isNews = isNewsQuery(query);
  const needsSearch = needsRealtimeSearch(query);

  if (!needsSearch) {
    return { attempted: false, success: false, source: null, results: [] };
  }

  // 1. 如果是新闻类请求，先读短期缓存 (TTL 300秒)
  if (isNews && env && env.KV_CHAT) {
    try {
      const cached = await env.KV_CHAT.get('cache:news:recent', { type: 'json' });
      if (cached && Array.isArray(cached.results) && cached.results.length > 0) {
        return { attempted: true, success: true, source: cached.source || 'cache', results: cached.results };
      }
    } catch (_) {}
  }

  // 2. 如果配置了 TAVILY_API_KEY，优先 Tavily
  const apiKey = (env && env.TAVILY_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.TAVILY_API_KEY);
  if (apiKey) {
    const tavilyRes = await searchTavily(query, env);
    if (tavilyRes.success && tavilyRes.results.length > 0) {
      const out = { attempted: true, success: true, source: 'tavily', results: tavilyRes.results };
      if (isNews && env && env.KV_CHAT) {
        env.KV_CHAT.put('cache:news:recent', JSON.stringify(out), { expirationTtl: 300 }).catch(() => {});
      }
      return out;
    }
  }

  // 3. 如果是新闻类提问（或 Tavily 失败），fallback 至 GDELT
  if (isNews) {
    const gdeltRes = await fetchGdeltNews(query);
    if (gdeltRes.success && gdeltRes.results.length > 0) {
      const out = { attempted: true, success: true, source: 'gdelt', results: gdeltRes.results };
      if (env && env.KV_CHAT) {
        env.KV_CHAT.put('cache:news:recent', JSON.stringify(out), { expirationTtl: 300 }).catch(() => {});
      }
      return out;
    }

    // 4. GDELT 失败 fallback 至公开 RSS Adapter
    const rssRes = await fetchRssNews();
    if (rssRes.success && rssRes.results.length > 0) {
      const out = { attempted: true, success: true, source: 'rss', results: rssRes.results };
      if (env && env.KV_CHAT) {
        env.KV_CHAT.put('cache:news:recent', JSON.stringify(out), { expirationTtl: 300 }).catch(() => {});
      }
      return out;
    }
  }

  // 5. 全部失败
  return {
    attempted: true,
    success: false,
    source: null,
    results: [],
    error: '实时信息检索暂时不可用'
  };
}
