// lib/search/content_fetcher.ts
// 安全网页正文与结构化表格抓取器：集成 SSRF 防护、超时、响应体积限制、多编码兼容与表格解析

import { checkUrlSafety, UrlSafetyCheck } from './url_safety';
import { lookup } from 'node:dns/promises';

export interface FetchedArticle {
  success: boolean;
  url: string;
  title?: string;
  content?: string;
  tables?: string[];
  hasFullText: boolean;
  sourceType: string;
  isOfficial: boolean;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 6000;
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * 从 Content-Type 头或 HTML meta 标签中提取字符编码
 */
function detectEncoding(contentType: string, htmlHeadPreview: string): string {
  const ctMatch = contentType.match(/charset=([a-zA-Z0-9_-]+)/i);
  if (ctMatch && ctMatch[1]) {
    const enc = ctMatch[1].toLowerCase();
    if (enc === 'gb2312' || enc === 'gbk' || enc === 'gb18030') return 'gbk';
    return enc;
  }

  const metaMatch = htmlHeadPreview.match(/<meta[^>]+charset=["']?([a-zA-Z0-9_-]+)/i) ||
    htmlHeadPreview.match(/<meta[^>]+content=["'][^"']*charset=([a-zA-Z0-9_-]+)/i);
  if (metaMatch && metaMatch[1]) {
    const enc = metaMatch[1].toLowerCase();
    if (enc === 'gb2312' || enc === 'gbk' || enc === 'gb18030') return 'gbk';
    return enc;
  }

  return 'utf-8';
}

/**
 * 解析 HTML 中的 <table> 表格并转为结构化 Markdown 文本
 */
export function extractCleanTables(html: string): string[] {
  const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  const tables: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(html)) !== null) {
    const tableHtml = match[1];
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: string[] = [];
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowContent = rowMatch[1];
      const cellRegex = /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
      const cells: string[] = [];
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const text = cellMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(text.replace(/\|/g, '\\|'));
      }

      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    }

    if (rows.length >= 2) {
      // 检查是否包含成绩相关特征词
      const tableText = rows.join('\n');
      const isRaceResults = /(pos|position|no|driver|car|time|lap|laps|gap|pts|points|名次|车手|车队|圈速|成绩)/i.test(tableText);
      const label = isRaceResults ? '【赛事成绩/排名表格】' : '【数据表格】';
      const columns = rows[0].split(' | ').length;
      tables.push(`${label}\n${rows[0]}\n${Array(columns).fill('---').join(' | ')}\n${rows.slice(1).join('\n')}`);
    }
  }

  return tables;
}

/**
 * 清洗 HTML 剥离噪音并提取有效正文段落
 */
export function extractCleanParagraphs(html: string): string[] {
  let cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const paragraphs = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(t => {
      if (t.length < 15) return false;
      if (/特别声明：|版权声明|免责声明|All rights reserved|点击下载客户端/i.test(t)) return false;
      return true;
    });

  return paragraphs;
}

/**
 * 安全抓取外部网页正文与表格，提炼证据文本
 */
export async function fetchArticleContent(
  rawUrl: string,
  options?: { timeoutMs?: number; maxBytes?: number; signal?: AbortSignal }
): Promise<FetchedArticle> {
  let safety: UrlSafetyCheck = checkUrlSafety(rawUrl);
  if (!safety.safe) {
    return {
      success: false,
      url: rawUrl,
      hasFullText: false,
      sourceType: safety.sourceType,
      isOfficial: safety.isOfficial,
      error: safety.reason || 'blocked_by_safety_policy'
    };
  }

  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes || MAX_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const signal = options?.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
    let res: Response | undefined;
    for (let hop = 0; hop < 5; hop++) {
      const records = await lookup(new URL(safety.normalizedUrl).hostname, { all: true });
      if (records.some(r => !checkUrlSafety(`http://${r.family === 6 ? `[${r.address}]` : r.address}/`).safe)) throw new Error('ssrf_blocked_dns_address');
      res = await fetch(safety.normalizedUrl, {
      signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
      });
      if (![301, 302, 303, 307, 308].includes(res.status)) break;
      const location = res.headers.get('location');
      await res.body?.cancel();
      if (!location) throw new Error('redirect_without_location');
      safety = checkUrlSafety(new URL(location, safety.normalizedUrl).href);
      if (!safety.safe) throw new Error(safety.reason || 'unsafe_redirect');
      res = undefined;
    }
    if (!res) throw new Error('too_many_redirects');

    if (!res.ok) {
      return {
        success: false,
        url: safety.normalizedUrl,
        hasFullText: false,
        sourceType: safety.sourceType,
        isOfficial: safety.isOfficial,
        error: `http_${res.status}`
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/') && !contentType.includes('application/json')) {
      return {
        success: false,
        url: safety.normalizedUrl,
        hasFullText: false,
        sourceType: safety.sourceType,
        isOfficial: safety.isOfficial,
        error: 'non_text_content_type'
      };
    }

    // 读取响应字节
    const body = res.body;
    if (!body) {
      return {
        success: false,
        url: safety.normalizedUrl,
        hasFullText: false,
        sourceType: safety.sourceType,
        isOfficial: safety.isOfficial,
        error: 'empty_response_body'
      };
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (receivedBytes > maxBytes) {
          await reader.cancel();
          throw new Error('response_too_large');
        }
      }
    }

    const buffer = Buffer.concat(chunks);
    const preview = buffer.slice(0, 1024).toString('binary');
    const encoding = detectEncoding(contentType, preview);

    let html = '';
    try {
      html = new TextDecoder(encoding).decode(buffer);
    } catch {
      html = new TextDecoder('utf-8').decode(buffer);
    }
    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(html);
      return { success: true, url: safety.normalizedUrl, content: JSON.stringify(parsed, null, 2).slice(0, 12000), hasFullText: true, sourceType: safety.sourceType, isOfficial: safety.isOfficial };
    }

    // 提炼网页标题
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

    // 清洗提取段落与表格
    const cleanParagraphs = extractCleanParagraphs(html);
    const cleanTables = extractCleanTables(html);

    if (cleanParagraphs.length === 0 && cleanTables.length === 0) {
      return {
        success: false,
        url: safety.normalizedUrl,
        title,
        hasFullText: false,
        sourceType: safety.sourceType,
        isOfficial: safety.isOfficial,
        error: 'no_readable_paragraphs_or_tables_extracted'
      };
    }

    // 整合内容：表格置前（高信息密度成绩数据），段落随后
    const combinedParts: string[] = [];
    if (cleanTables.length > 0) {
      combinedParts.push(...cleanTables);
    }
    if (cleanParagraphs.length > 0) {
      combinedParts.push(...cleanParagraphs);
    }

    const content = combinedParts.join('\n\n').slice(0, 3000);

    return {
      success: true,
      url: safety.normalizedUrl,
      title,
      content,
      tables: cleanTables,
      hasFullText: true,
      sourceType: safety.sourceType,
      isOfficial: safety.isOfficial
    };
  } catch (err: any) {
    return {
      success: false,
      url: safety.normalizedUrl,
      hasFullText: false,
      sourceType: safety.sourceType,
      isOfficial: safety.isOfficial,
      error: err.name === 'AbortError' ? 'fetch_timeout' : (err.message || 'fetch_failed')
    };
  } finally {
    clearTimeout(timer);
  }
}
