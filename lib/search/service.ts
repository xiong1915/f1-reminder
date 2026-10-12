// lib/search/service.ts
// 统一搜索聚合协调器：真正的检索链路 (搜索候选 -> 相关性筛选 -> 获取原文/正文 -> 提取证据)
// 未取得有效正文或结构化证据时，自动继续尝试备用来源，绝不提前宣布成功截断

import { SearchResponse, SearchResultItem } from './types';
import { SogouSearchProvider } from './sogou';
import { BingSearchProvider } from './bing';
import { GdeltSearchProvider } from './gdelt';
import { RssSearchProvider } from './rss';
import { TavilySearchProvider } from './tavily';
import { filterAndRankCandidates, FilterContext } from './filter';
import { fetchArticleContent } from './content_fetcher';
import { defaultCache } from '../cache/memory';

export class SearchService {
  private sogou = new SogouSearchProvider();
  private bing = new BingSearchProvider();
  private gdelt = new GdeltSearchProvider();
  private rss = new RssSearchProvider();
  private tavily = new TavilySearchProvider();

  async search(query: string, context?: FilterContext, signal?: AbortSignal): Promise<SearchResponse> {
    const cleanQ = (query || '').trim();
    if (!cleanQ) {
      return { success: false, results: [], provider: 'none', reason: 'empty_query' };
    }

    const filterCtx: FilterContext = context || { query: cleanQ };
    const cacheKey = `search:${cleanQ.toLowerCase()}:${filterCtx.isOfficialOnly ? 'off' : 'all'}:${filterCtx.season || ''}:${filterCtx.round || ''}:${filterCtx.meetingName || ''}`;
    const cached = await defaultCache.get<SearchResponse>(cacheKey);
    if (cached) return cached;

    const providers = [
      ...(process.env.TAVILY_API_KEY ? [this.tavily] : []),
      this.sogou,
      this.bing,
      this.gdelt,
      this.rss
    ];

    let fallbackEnrichedResults: SearchResultItem[] = [];
    let fallbackProviderId = 'none';

    for (const provider of providers) {
      signal?.throwIfAborted();
      try {
        const rawRes = await provider.search(cleanQ, signal);
        if (!rawRes.success || !rawRes.results || rawRes.results.length === 0) {
          continue; // 当前渠道无结果，尝试下一个备用渠道
        }

        // 执行严格的主题、运动、分站及安全性相关性筛选
        const qualified = filterAndRankCandidates(rawRes.results, filterCtx);
        if (qualified.length === 0) {
          // 当前渠道的结果全部为无关/垃圾内容，严禁提前截断，继续尝试下一个备用渠道！
          continue;
        }

        // 对筛选出的最相关前 3 篇核心候选尝试获取原文正文（带超时与体积限制）
        const topCandidates = qualified.slice(0, 3);
        const enrichedResults: SearchResultItem[] = await Promise.all(
          topCandidates.map(async (item) => {
            if (!item.url || !item.url.startsWith('http')) return item;

            try {
              const fetched = await fetchArticleContent(item.url, { timeoutMs: 4000, signal });
              if (fetched.success && fetched.content && fetched.content.length > 40) {
                return {
                  ...item,
                  content: fetched.content,
                  hasFullText: true,
                  title: fetched.title || item.title
                };
              }
            } catch (_) {}

            return {
              ...item,
              hasFullText: false
            };
          })
        );

        // 核心质量准则：检查是否至少取得 1 篇有效正文
        const revalidated = filterAndRankCandidates(enrichedResults.map(r => ({ ...r, snippet: `${r.snippet}\n${r.content || ''}` })), filterCtx);
        const hasAnyFullText = revalidated.some(r => r.hasFullText);

        if (hasAnyFullText) {
          const finalResponse: SearchResponse = {
            success: true,
            results: revalidated,
            provider: provider.id
          };
          await defaultCache.set(cacheKey, finalResponse, 300);
          return finalResponse;
        }

        // 若当前渠道未取得有效正文，暂存候选作为备胎，但继续尝试下一个渠道！
        if (fallbackEnrichedResults.length === 0) {
          fallbackEnrichedResults = enrichedResults;
          fallbackProviderId = provider.id;
        }
      } catch (err: any) {
        // 出错时继续 fallback 到下一个提供者
        continue;
      }
    }

    // 所有渠道穷尽后，若有筛选出的候选摘要，降级返回但标注未取得全文
    if (fallbackEnrichedResults.length > 0) {
      const degradedResponse: SearchResponse = {
        success: true,
        results: fallbackEnrichedResults,
        provider: fallbackProviderId
      };
      await defaultCache.set(cacheKey, degradedResponse, 120);
      return degradedResponse;
    }

    return {
      success: false,
      results: [],
      provider: 'none',
      reason: 'all_sources_exhausted'
    };
  }
}

export const defaultSearchService = new SearchService();
