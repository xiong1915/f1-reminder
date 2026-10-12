// lib/search/bing.ts
// 真实高可用实时网页搜索引擎 (无需 API Key，国内与海外边缘均稳定可用)

import { SearchProvider, SearchResponse, SearchResultItem } from './types';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&ensp;/g, ' ')
    .replace(/&emsp;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#183;/g, '·')
    .replace(/&middot;/g, '·')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export class BingSearchProvider implements SearchProvider {
  readonly id = 'bing';
  readonly name = 'Bing Web Search';

  async search(query: string, signal?: AbortSignal): Promise<SearchResponse> {
    const q = (query || '').trim();
    if (!q) {
      return { success: false, results: [], provider: this.id, reason: 'empty_query' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    try {
      const url = `https://cn.bing.com/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
      });

      if (!res.ok) {
        return { success: false, results: [], provider: this.id, reason: `http_${res.status}` };
      }

      const html = await res.text();
      const blocks = [...html.matchAll(/<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/g)].slice(0, 6);
      const results: SearchResultItem[] = [];
      const seenUrls = new Set<string>();

      for (const b of blocks) {
        const blockContent = b[1];
        const titleMatch = blockContent.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>\s*<\/h2>/i);
        const snippetMatch = blockContent.match(/<div class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
                             blockContent.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

        if (titleMatch) {
                    let rawUrl = decodeHtmlEntities(titleMatch[1].trim());
          try {
            const parsed = new URL(rawUrl, 'https://cn.bing.com');
            if (parsed.pathname === '/ck/a') {
              const encoded = parsed.searchParams.get('u');
              if (encoded?.startsWith('a1')) rawUrl = Buffer.from(encoded.slice(2), 'base64url').toString('utf8');
            }
          } catch { continue; }
          const rawTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();
          const rawSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : rawTitle;

          // 过滤非赛车体育
          const NON_F1_SPORTS = /(乒乓球|国乒|WTT|世乒赛|羽毛球|中超|西甲|英超|欧冠|CBA|NBA|排球|女排|女足|男篮|男排)/i;
          if (NON_F1_SPORTS.test(rawTitle) || NON_F1_SPORTS.test(rawSnippet)) {
            continue;
          }

          // 过滤掉内部广告或跳转环
          if (!rawUrl || rawUrl.startsWith('javascript:') || seenUrls.has(rawUrl)) continue;

          // 过滤单纯门户首页
          if (/^https?:\/\/(www\.)?(sina|sohu|163|qq|baidu|bing)\.com(\.cn)?\/?$/i.test(rawUrl)) {
            continue;
          }

          seenUrls.add(rawUrl);

          results.push({
            title: decodeHtmlEntities(rawTitle),
            url: rawUrl,
            snippet: decodeHtmlEntities(rawSnippet),
            source: 'Bing'
          });

          if (results.length >= 5) break;
        }
      }

      return {
        success: results.length > 0,
        results,
        provider: this.id,
        reason: results.length > 0 ? undefined : 'no_results_parsed'
      };
    } catch (err: any) {
      return {
        success: false,
        results: [],
        provider: this.id,
        reason: err.name === 'AbortError' ? 'timeout' : err.message
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
