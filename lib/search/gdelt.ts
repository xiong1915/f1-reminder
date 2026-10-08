// lib/search/gdelt.ts
// GDELT DOC API 搜索实现：完全免费、零 API Key、全球海量新闻实时索引

import { SearchProvider, SearchResponse, SearchResultItem } from './types';

export class GdeltSearchProvider implements SearchProvider {
  readonly id = 'gdelt';
  readonly name = 'GDELT Global News';

  async search(query: string = 'world news'): Promise<SearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      let gdeltQ = 'china OR world OR international news';
      if (query && !/新闻|今天|最新/.test(query)) {
        gdeltQ = query;
      }
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQ)}&mode=artlist&format=json&maxrecords=10&sort=datedesc`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 TIKE-V3-NewsBot/3.0'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        return { success: false, results: [], provider: this.id, reason: `http_${res.status}` };
      }

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return { success: false, results: [], provider: this.id, reason: 'invalid_json' };
      }

      if (data && Array.isArray(data.articles) && data.articles.length > 0) {
        const seenUrls = new Set<string>();
        const results: SearchResultItem[] = [];

        for (const a of data.articles) {
          const title = (a.title || '').trim();
          const urlStr = (a.url || '').trim();
          if (!title || !urlStr || seenUrls.has(urlStr)) continue;
          seenUrls.add(urlStr);

          results.push({
            title,
            url: urlStr,
            snippet: `[${a.domain || a.sourcecountry || '国际快讯'}] ${title}`,
            source: 'GDELT'
          });
          if (results.length >= 6) break;
        }

        return { success: results.length > 0, results, provider: this.id };
      }

      return { success: false, results: [], provider: this.id, reason: 'no_articles' };
    } catch (err: any) {
      return { success: false, results: [], provider: this.id, reason: err.name === 'AbortError' ? 'timeout' : err.message };
    } finally {
      clearTimeout(timeout);
    }
  }
}
