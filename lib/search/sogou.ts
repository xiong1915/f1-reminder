// lib/search/sogou.ts
// Sogou 实时中文互联网移动端搜索 Provider (极高召回率、最新资讯覆盖、无鉴权限制)

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

export class SogouSearchProvider implements SearchProvider {
  readonly id = 'sogou';
  readonly name = 'Sogou Web Search';

  async search(query: string, signal?: AbortSignal): Promise<SearchResponse> {
    const q = (query || '').trim();
    if (!q) {
      return { success: false, results: [], provider: this.id, reason: 'empty_query' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    try {
      const url = `https://wap.sogou.com/web/searchList.jsp?keyword=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
      });

      if (!res.ok) {
        return { success: false, results: [], provider: this.id, reason: `http_${res.status}` };
      }

      const html = await res.text();
      const regex = /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>([\s\S]*?)(?=<h3|<\/section|$)/gi;
      const matches = [...html.matchAll(regex)];
      const results: SearchResultItem[] = [];
      const seenTitles = new Set<string>();

      for (const m of matches) {
        const rawHref = m[1].trim();
        const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
        const rawBody = m[3];

        if (!rawTitle || rawTitle.length < 2 || seenTitles.has(rawTitle)) continue;
        if (/大家还在搜|相关搜索|猜你想搜/i.test(rawTitle)) continue;

        // 过滤非赛车体育（乒乓球、国乒、WTT、羽毛球、中超、西甲、英超、欧冠、CBA、NBA、排球等）
        const NON_F1_SPORTS = /(乒乓球|国乒|WTT|世乒赛|羽毛球|中超|西甲|英超|欧冠|CBA|NBA|排球|女排|女足|男篮|男排)/i;
        if (NON_F1_SPORTS.test(rawTitle) || NON_F1_SPORTS.test(rawBody)) {
          continue;
        }

        seenTitles.add(rawTitle);

        const snippetMatch = rawBody.match(/<p[^>]*>([\s\S]*?)<\/p>/i) ||
                             rawBody.match(/<div class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const rawSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : rawTitle;

        // 构建规范化外部访问链接，优先提取 pcurl 解码后的真实文章 URL
        let finalUrl = rawHref;
        const pcurlMatch = rawHref.match(/[?&]pcurl=([^&]+)/i);
        if (pcurlMatch) {
          try {
            const decoded = decodeURIComponent(pcurlMatch[1]);
            if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
              finalUrl = decoded;
            }
          } catch (_) {}
        } else if (rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
          finalUrl = rawHref;
        } else if (rawHref.startsWith('?')) {
          finalUrl = `https://wap.sogou.com/web/searchList.jsp${rawHref}`;
        } else if (rawHref.startsWith('./')) {
          finalUrl = `https://wap.sogou.com/web/${rawHref.slice(2)}`;
        } else {
          finalUrl = `https://wap.sogou.com/web/${rawHref}`;
        }

        // 过滤内部搜索列表与单纯的门户首页（无具体文章）
        if (finalUrl.includes('searchList.jsp') || finalUrl.includes('wap.sogou.com/web')) {
          continue;
        }

        if (/^https?:\/\/(www\.)?(sina|sohu|163|qq|baidu|sogou)\.com(\.cn)?\/?$/i.test(finalUrl)) {
          continue;
        }

        results.push({
          title: decodeHtmlEntities(rawTitle),
          url: finalUrl,
          snippet: decodeHtmlEntities(rawSnippet),
          source: '搜狗搜索'
        });

        if (results.length >= 5) break;
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
