// lib/search/service.ts
// 统一搜索聚合协调器：免费开源优先 (GDELT -> RSS -> 可选 Tavily)，自带短时防抖缓存

import { SearchResponse, SearchResultItem } from './types';
import { GdeltSearchProvider } from './gdelt';
import { RssSearchProvider } from './rss';
import { TavilySearchProvider } from './tavily';
import { defaultCache } from '../cache/memory';

export class SearchService {
  private gdelt = new GdeltSearchProvider();
  private rss = new RssSearchProvider();
  private tavily = new TavilySearchProvider();

  async search(query: string): Promise<SearchResponse> {
    const cacheKey = `search:${query.trim().toLowerCase()}`;
    const cached = await defaultCache.get<SearchResponse>(cacheKey);
    if (cached) return cached;

    // 1. 如果配置了 Tavily 且查询具备针对性，尝试 Tavily
    if (process.env.TAVILY_API_KEY) {
      try {
        const tavilyRes = await this.tavily.search(query);
        if (tavilyRes.success && tavilyRes.results.length > 0) {
          await defaultCache.set(cacheKey, tavilyRes, 600); // 10分钟缓存
          return tavilyRes;
        }
      } catch (_) {}
    }

    // 2. 核心免费渠道：GDELT 全球新闻实时检索
    try {
      const gdeltRes = await this.gdelt.search(query);
      if (gdeltRes.success && gdeltRes.results.length > 0) {
        await defaultCache.set(cacheKey, gdeltRes, 600);
        return gdeltRes;
      }
    } catch (_) {}

    // 3. 最终兜底：免费官方 RSS 流
    try {
      const rssRes = await this.rss.search();
      if (rssRes.success && rssRes.results.length > 0) {
        await defaultCache.set(cacheKey, rssRes, 600);
        return rssRes;
      }
    } catch (_) {}

    return {
      success: false,
      results: [],
      provider: 'none',
      reason: 'all_sources_exhausted'
    };
  }
}

export const defaultSearchService = new SearchService();
