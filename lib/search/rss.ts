// lib/search/rss.ts
// RSS 要闻提取器：完全免费、零 Key 降级源

import { SearchProvider, SearchResponse, SearchResultItem } from './types';

export class RssSearchProvider implements SearchProvider {
  readonly id = 'rss';
  readonly name = 'Global RSS Feeds';

  async search(): Promise<SearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const rssUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';
      const res = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 TIKE-V3-Rss/3.0',
          'Accept': 'application/xml, text/xml, */*'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        return { success: false, results: [], provider: this.id, reason: `http_${res.status}` };
      }

      const xml = await res.text();
      const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>(?:[\s\S]*?<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>)?[\s\S]*?<\/item>/gi;
      const results: SearchResultItem[] = [];

      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(xml)) !== null && results.length < 5) {
        const title = match[1]?.trim();
        const link = match[2]?.trim();
        const desc = match[3]?.replace(/<[^>]+>/g, '').trim() || title;

        if (title && link) {
          results.push({
            title,
            url: link,
            snippet: desc,
            source: 'RSS'
          });
        }
      }

      return { success: results.length > 0, results, provider: this.id };
    } catch (err: any) {
      return { success: false, results: [], provider: this.id, reason: err.message };
    } finally {
      clearTimeout(timeout);
    }
  }
}
