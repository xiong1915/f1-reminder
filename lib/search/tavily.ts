// lib/search/tavily.ts
// Tavily 搜索适配器 (仅在配置了 TAVILY_API_KEY 时作为可选增强，不作为强依赖)

import { SearchProvider, SearchResponse, SearchResultItem } from './types';

export class TavilySearchProvider implements SearchProvider {
  readonly id = 'tavily';
  readonly name = 'Tavily Search';

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || '';
  }

  async search(query: string): Promise<SearchResponse> {
    if (!this.apiKey) {
      return { success: false, results: [], provider: this.id, reason: 'no_key' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'basic',
          max_results: 5
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        return { success: false, results: [], provider: this.id, reason: `http_${res.status}` };
      }

      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const results: SearchResultItem[] = data.results.map((r: any) => ({
          title: r.title || '无标题网页',
          url: r.url || '',
          snippet: (r.content || r.snippet || '').trim(),
          source: 'Tavily'
        })).filter((r: SearchResultItem) => r.title && r.snippet);

        return { success: results.length > 0, results, provider: this.id };
      }

      return { success: false, results: [], provider: this.id, reason: 'empty' };
    } catch (err: any) {
      return { success: false, results: [], provider: this.id, reason: err.message };
    } finally {
      clearTimeout(timeout);
    }
  }
}
