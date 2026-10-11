import 'server-only';
import { API_RATES } from '../pricing';

export interface TavilySearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilySearchResponse {
  results: TavilySearchResultItem[];
  query: string;
  actual_credits: number;
  cost_micro_usd: number;
}

export interface TavilyExtractItem {
  url: string;
  raw_content: string;
}

export interface TavilyExtractResponse {
  results: TavilyExtractItem[];
  failed_results: Array<{ url: string; error: string }>;
  actual_credits: number;
  cost_micro_usd: number;
}

export async function searchTavily(
  query: string,
  options: {
    max_results?: number;
    search_depth?: 'basic' | 'advanced';
    include_domains?: string[];
    exclude_domains?: string[];
  } = {}
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured on the server');
  }

  const searchDepth = options.search_depth || 'advanced';
  const maxResults = options.max_results || 8;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_domains: options.include_domains,
      exclude_domains: options.exclude_domains,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Tavily search failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const credits = searchDepth === 'advanced' ? API_RATES.TAVILY_SEARCH_CREDITS : 1;
  const costMicroUsd = credits * API_RATES.TAVILY_MICRO_PER_CREDIT;

  const results: TavilySearchResultItem[] = Array.isArray(data.results)
    ? data.results.map((r: any) => ({
        title: String(r.title || ''),
        url: String(r.url || ''),
        content: String(r.content || ''),
        score: typeof r.score === 'number' ? r.score : undefined,
      }))
    : [];

  return {
    results,
    query,
    actual_credits: credits,
    cost_micro_usd: costMicroUsd,
  };
}

export async function extractTavily(urls: string[]): Promise<TavilyExtractResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured on the server');
  }

  if (!urls || urls.length === 0) {
    return {
      results: [],
      failed_results: [],
      actual_credits: 0,
      cost_micro_usd: 0,
    };
  }

  // Cap at 10 URLs per extraction call for budget control
  const safeUrls = urls.slice(0, 10);

  const res = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      urls: safeUrls,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Tavily extract failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const batches = Math.ceil(safeUrls.length / 5);
  const credits = batches * API_RATES.TAVILY_EXTRACT_CREDITS_PER_5_URLS;
  const costMicroUsd = credits * API_RATES.TAVILY_MICRO_PER_CREDIT;

  const results: TavilyExtractItem[] = Array.isArray(data.results)
    ? data.results.map((r: any) => ({
        url: String(r.url || ''),
        raw_content: String(r.raw_content || ''),
      }))
    : [];

  return {
    results,
    failed_results: Array.isArray(data.failed_results) ? data.failed_results : [],
    actual_credits: credits,
    cost_micro_usd: costMicroUsd,
  };
}
