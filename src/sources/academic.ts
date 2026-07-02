import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface AcademicResult {
  url: string;
  title: string;
  content: string;  // abstract
  authors: string[];
  publishedDate: string;
  source: 'arxiv' | 'pubmed';
  retrievedAt: string;
}

/**
 * Search arXiv for academic papers.
 */
export async function searchArxiv(
  query: string,
  maxResults = 5,
): Promise<AcademicResult[]> {
  try {
    const params = new URLSearchParams({
      search_query: `all:${query}`,
      start: '0',
      max_results: String(maxResults),
      sortBy: 'relevance',
    });

    const response = await axios.get(
      `http://export.arxiv.org/api/query?${params.toString()}`,
      { headers: { Accept: 'application/xml' } },
    );

    const xml = response.data as string;
    const entries = xml.split('<entry>').slice(1);

    const results: AcademicResult[] = entries.map((entry) => {
      const getTag = (tag: string): string => {
        const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return match ? match[1].trim() : '';
      };

      const authorMatches = [...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)];

      return {
        url: getTag('id'),
        title: getTag('title').replace(/\s+/g, ' '),
        content: getTag('summary').replace(/\s+/g, ' '),
        authors: authorMatches.map((m) => m[1]),
        publishedDate: getTag('published'),
        source: 'arxiv' as const,
        retrievedAt: new Date().toISOString(),
      };
    });

    logger.info(`arXiv search for "${query}" returned ${results.length} papers`);
    return results;
  } catch (err: any) {
    logger.error(`arXiv search failed: ${err.message}`);
    return [];
  }
}

/**
 * Search PubMed for biomedical literature.
 */
export async function searchPubMed(
  query: string,
  maxResults = 5,
): Promise<AcademicResult[]> {
  try {
    // Step 1: Search for IDs
    const searchResp = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi', {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        retmode: 'json',
        sort: 'relevance',
      },
    });

    const ids: string[] = searchResp.data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2: Fetch summaries
    const summaryResp = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'json',
      },
    });

    const summaryResult = summaryResp.data?.result || {};

    const results: AcademicResult[] = ids
      .filter((id) => summaryResult[id])
      .map((id) => {
        const item = summaryResult[id];
        const authors = (item.authors || []).map((a: any) => a.name);
        return {
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          title: item.title || '',
          content: item.title || '',  // PubMed summary doesn't include abstract inline
          authors,
          publishedDate: item.pubdate || '',
          source: 'pubmed' as const,
          retrievedAt: new Date().toISOString(),
        };
      });

    logger.info(`PubMed search for "${query}" returned ${results.length} papers`);
    return results;
  } catch (err: any) {
    logger.error(`PubMed search failed: ${err.message}`);
    return [];
  }
}

/**
 * Search both arXiv and PubMed in parallel.
 */
export async function searchAcademic(
  query: string,
  maxResults = 5,
): Promise<AcademicResult[]> {
  const [arxivResults, pubmedResults] = await Promise.all([
    searchArxiv(query, maxResults),
    searchPubMed(query, maxResults),
  ]);

  return [...arxivResults, ...pubmedResults];
}
