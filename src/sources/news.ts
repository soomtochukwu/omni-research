import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface NewsResult {
  url: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  retrievedAt: string;
}

/**
 * Fetch recent news about a topic from a free news API.
 * Uses the GNews API (free tier: 100 req/day).
 * Falls back gracefully if no API key is set.
 */
export async function searchNews(
  query: string,
  maxResults = 5,
): Promise<NewsResult[]> {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    logger.warn('GNEWS_API_KEY not set — skipping news search');
    return [];
  }

  try {
    const resp = await axios.get('https://gnews.io/api/v4/search', {
      params: {
        q: query,
        max: maxResults,
        lang: 'en',
        token: apiKey,
      },
    });

    const articles = resp.data.articles || [];

    const results: NewsResult[] = articles.map((a: any) => ({
      url: a.url,
      title: a.title,
      content: a.description || a.content || '',
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt,
      retrievedAt: new Date().toISOString(),
    }));

    logger.info(`News search for "${query}" returned ${results.length} articles`);
    return results;
  } catch (err: any) {
    logger.error(`News search failed: ${err.message}`);
    return [];
  }
}
