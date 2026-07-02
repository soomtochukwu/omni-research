import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { RateLimiter } from '../utils/rate-limiter.js';

export interface WebSearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  rawContent?: string;
  retrievedAt: string;
}

const limiter = new RateLimiter(5, 1); // 5 tokens, 1/sec refill

/**
 * Search the web using Tavily API.
 */
export async function webSearch(
  query: string,
  options: { maxResults?: number; searchDepth?: 'basic' | 'advanced' } = {},
): Promise<WebSearchResult[]> {
  const { maxResults = 10, searchDepth = 'advanced' } = options;

  if (!config.tavily.apiKey) {
    logger.warn('Tavily API key not set — skipping web search');
    return [];
  }

  await limiter.acquire();

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: config.tavily.apiKey,
      query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_raw_content: true,
    });

    const results: WebSearchResult[] = (response.data.results || []).map(
      (r: any) => ({
        url: r.url,
        title: r.title,
        content: r.content,
        score: r.score ?? r.relevance_score ?? 0,
        rawContent: r.raw_content || r.content,
        retrievedAt: new Date().toISOString(),
      }),
    );

    logger.info(`Web search for "${query}" returned ${results.length} results`);
    return results;
  } catch (err: any) {
    logger.error(`Web search failed: ${err.message}`);
    return [];
  }
}

/**
 * Search multiple queries in parallel and deduplicate by URL.
 */
export async function webSearchMulti(
  queries: string[],
  options: { maxResultsPerQuery?: number } = {},
): Promise<WebSearchResult[]> {
  const { maxResultsPerQuery = 5 } = options;

  const allResults = await Promise.all(
    queries.map((q) => webSearch(q, { maxResults: maxResultsPerQuery })),
  );

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique: WebSearchResult[] = [];

  for (const results of allResults) {
    for (const r of results) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        unique.push(r);
      }
    }
  }

  return unique;
}
