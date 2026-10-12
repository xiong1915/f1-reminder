// lib/search/url_safety.ts
// SSRF 防护、URL 规范化与来源权威性分级

export type SourceType = 'official' | 'mainstream_media' | 'self_media' | 'snippet_only';

export interface UrlSafetyCheck {
  safe: boolean;
  reason?: string;
  normalizedUrl: string;
  sourceType: SourceType;
  isOfficial: boolean;
  domain: string;
}

// 官方发布机构域名白名单
const OFFICIAL_DOMAINS = new Set([
  'formula1.com',
  'www.formula1.com',
  'fia.com',
  'www.fia.com',
  'ferrari.com',
  'www.ferrari.com',
  'mercedesamgf1.com',
  'www.mercedesamgf1.com',
  'redbullracing.com',
  'www.redbullracing.com',
  'mclaren.com',
  'www.mclaren.com',
  'astonmartinf1.com',
  'www.astonmartinf1.com',
  'alpinef1team.com',
  'www.alpinef1team.com',
  'williamsf1.com',
  'www.williamsf1.com',
  'sauber-group.com',
  'www.sauber-group.com',
  'haasf1team.com',
  'www.haasf1team.com'
]);

// 主流体育媒体与新闻通讯社
const MAINSTREAM_MEDIA_DOMAINS = [
  'motorsport.com',
  'autosport.com',
  'bbc.com',
  'skysports.com',
  'reuters.com',
  'apnews.com',
  'chinanews.com',
  'chinanews.com.cn',
  'xinhuanet.com',
  'cctv.com',
  'cctv.cn',
  'people.com.cn',
  'sina.com.cn',
  'sohu.com',
  'qq.com',
  'thepaper.cn',
  'bjnews.com.cn',
  'hupu.com'
];

// 自媒体 / 聚合订阅平台（绝不可标为官方发布机构）
const SELF_MEDIA_DOMAINS = [
  '163.com/dy',
  'dy.163.com',
  'baijiahao.baidu.com',
  'toutiao.com',
  'bilibili.com',
  'zhihu.com',
  'weibo.com',
  'kuaishou.com',
  'douyin.com',
  'xiaohongshu.com'
];

// 搜索引擎入口与建议页黑名单
const SEARCH_ENGINE_INTERNALS = [
  'wap.sogou.com/web/searchList',
  'sogou.com/web',
  'cn.bing.com/search',
  'bing.com/search',
  'baidu.com/s',
  'm.baidu.com/s',
  'google.com/search'
];

/**
 * 校验 URL 协议、内网地址（SSRF 防护）及来源可信度
 */
export function checkUrlSafety(rawUrl: string): UrlSafetyCheck {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'empty_url', normalizedUrl: '', sourceType: 'snippet_only', isOfficial: false, domain: '' };
  }

  // 1. 解码 pcurl 重定向
  let targetUrl = rawUrl.trim();
  const pcurlMatch = targetUrl.match(/[?&]pcurl=([^&]+)/i);
  if (pcurlMatch) {
    try {
      const decoded = decodeURIComponent(pcurlMatch[1]);
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        targetUrl = decoded;
      }
    } catch (_) {}
  }

  // 2. 协议检查：严格仅允许 http 和 https
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (_) {
    return { safe: false, reason: 'invalid_url_syntax', normalizedUrl: targetUrl, sourceType: 'snippet_only', isOfficial: false, domain: '' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'unsupported_protocol', normalizedUrl: targetUrl, sourceType: 'snippet_only', isOfficial: false, domain: '' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. SSRF 防护：拒绝内网 IP、Localhost、链路本地和云厂商元数据地址
  if (isPrivateOrLocalHost(hostname)) {
    return { safe: false, reason: 'ssrf_blocked_private_ip', normalizedUrl: targetUrl, sourceType: 'snippet_only', isOfficial: false, domain: hostname };
  }

  // 4. 过滤搜索引擎内部页面与话题聚合
  const fullPath = (hostname + parsed.pathname).toLowerCase();
  for (const internal of SEARCH_ENGINE_INTERNALS) {
    if (fullPath.includes(internal.toLowerCase())) {
      return { safe: false, reason: 'search_engine_internal_page', normalizedUrl: targetUrl, sourceType: 'snippet_only', isOfficial: false, domain: hostname };
    }
  }

  // 5. 过滤单纯的门户首页（无具体文章正文）
  if (/^(www\.)?(sina|sohu|163|qq|baidu|sogou)\.com(\.cn)?\/?$/i.test(hostname + parsed.pathname)) {
    return { safe: false, reason: 'portal_root_page', normalizedUrl: targetUrl, sourceType: 'snippet_only', isOfficial: false, domain: hostname };
  }

  // 6. 确定来源权威性
  let isOfficial = false;
  let sourceType: SourceType = 'mainstream_media';

  if (OFFICIAL_DOMAINS.has(hostname) || [...OFFICIAL_DOMAINS].some(d => hostname.endsWith(`.${d}`))) {
    isOfficial = true;
    sourceType = 'official';
  } else {
    // 检查是否为自媒体
    for (const sm of SELF_MEDIA_DOMAINS) {
      if (fullPath.includes(sm) || hostname.includes(sm)) {
        sourceType = 'self_media';
        break;
      }
    }
    if (sourceType !== 'self_media') {
      const isMainstream = MAINSTREAM_MEDIA_DOMAINS.some(m => hostname.includes(m));
      sourceType = isMainstream ? 'mainstream_media' : 'snippet_only';
    }
  }

  return {
    safe: true,
    normalizedUrl: parsed.toString(),
    sourceType,
    isOfficial,
    domain: hostname
  };
}

/**
 * 校验是否为私有、回环、保留或元数据 IP
 */
function isPrivateOrLocalHost(hostname: string): boolean {
  hostname = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname.startsWith('::ffff:')) {
    const tail = hostname.slice(7);
    if (tail.includes('.')) return isPrivateOrLocalHost(tail);
    const parts = tail.split(':');
    if (parts.length === 2) {
      const a = parseInt(parts[0], 16), b = parseInt(parts[1], 16);
      return isPrivateOrLocalHost(`${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`);
    }
    return true;
  }
  if (hostname === '::' || hostname.endsWith('.localhost')) return true;
  if (hostname === 'localhost' || hostname === 'ip6-localhost' || hostname === '0.0.0.0') {
    return true;
  }

  // IPv4 匹配
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, o1, o2, o3, o4] = ipv4Match.map(Number);
    if (o1 === 127) return true; // 127.0.0.0/8 回环
    if (o1 === 10) return true;  // 10.0.0.0/8 私有
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12 私有
    if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16 私有
    if (o1 === 169 && o2 === 254) return true; // 169.254.0.0/16 链路本地 / 云元数据
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true; // CGNAT
    if (o1 === 0 || o1 >= 224) return true; // 广播/多播/保留
  }

  // IPv6 本地回环或私有
  if (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) {
    return true;
  }

  return false;
}
