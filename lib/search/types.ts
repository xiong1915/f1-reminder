// lib/search/types.ts
// 搜索 Provider 接口抽象，实现零成本新闻聚合与可选商业搜索引擎降级

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResultItem[];
  provider: string;
  reason?: string;
}

export interface SearchProvider {
  id: string;
  name: string;
  search(query: string): Promise<SearchResponse>;
}
