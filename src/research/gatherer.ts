import { webSearchMulti, type WebSearchResult } from '../sources/web-search.js';
import { searchAcademic, type AcademicResult } from '../sources/academic.js';
import { searchOnchain, type OnchainResult } from '../sources/onchain.js';
import { searchNews, type NewsResult } from '../sources/news.js';
import { hashString } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

export interface SourceItem {
  url: string;
  title: string;
  content: string;
  rawContent: string;
  sourceType: string;
  contentHash: string;
  retrievedAt: string;
}

export interface GatheredData {
  sources: SourceItem[];
  totalChecked: number;
  topic: string;
}

/**
 * Gather data from multiple sources based on the research plan.
 */
export async function gather(
  queries: string[],
  options: {
    sources?: string[];
    maxResults?: number;
    topic?: string;
  } = {},
): Promise<GatheredData> {
  const {
    sources = ['web'],
    maxResults = 20,
    topic = queries[0] || '',
  } = options;

  const allSources: SourceItem[] = [];
  let totalChecked = 0;

  const perSourceMax = Math.ceil(maxResults / sources.length);

  // Run all source fetches in parallel
  const tasks: Promise<void>[] = [];

  if (sources.includes('web')) {
    tasks.push(
      webSearchMulti(queries, { maxResultsPerQuery: Math.ceil(perSourceMax / queries.length) })
        .then((results) => {
          totalChecked += results.length;
          for (const r of results) {
            allSources.push(toSourceItem(r, 'web'));
          }
        }),
    );
  }

  if (sources.includes('academic')) {
    tasks.push(
      searchAcademic(topic, perSourceMax)
        .then((results) => {
          totalChecked += results.length;
          for (const r of results) {
            allSources.push(toSourceItem(r, 'academic'));
          }
        }),
    );
  }

  if (sources.includes('onchain')) {
    tasks.push(
      searchOnchain(topic)
        .then((results) => {
          totalChecked += results.length;
          for (const r of results) {
            allSources.push(toSourceItem(r, 'onchain'));
          }
        }),
    );
  }

  if (sources.includes('news')) {
    tasks.push(
      searchNews(topic, perSourceMax)
        .then((results) => {
          totalChecked += results.length;
          for (const r of results) {
            allSources.push(toSourceItem(r, 'news'));
          }
        }),
    );
  }

  await Promise.all(tasks);

  logger.info(
    `Gathered ${allSources.length} sources from ${sources.join(', ')} (checked ${totalChecked} total)`,
  );

  return { sources: allSources, totalChecked, topic };
}

function toSourceItem(
  item: WebSearchResult | AcademicResult | OnchainResult | NewsResult,
  sourceType: string,
): SourceItem {
  const content = item.content || '';
  const rawContent = 'rawContent' in item ? (item as any).rawContent || content : content;

  return {
    url: item.url,
    title: item.title,
    content,
    rawContent,
    sourceType,
    contentHash: hashString(rawContent),
    retrievedAt: item.retrievedAt,
  };
}
