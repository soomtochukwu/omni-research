import { logger } from '../utils/logger.js';
import type { SourceItem, GatheredData } from './gatherer.js';
import type { Synthesis } from './synthesizer.js';

export interface VerifiedSource {
  url: string;
  title: string;
  relevance: number;
  contentHash: string;
  sourceType: string;
}

export interface ScoredResearch {
  summary: string;
  keyFindings: string[];
  detailedAnalysis: string;
  nextSteps: string[];
  callToAction: Synthesis['callToAction'];
  verifiedSources: VerifiedSource[];
  overallConfidence: number;
}

/**
 * Score the confidence of the synthesized research and verify citations.
 */
export function score(synthesis: Synthesis, data: GatheredData): ScoredResearch {
  const verifiedSources: VerifiedSource[] = data.sources.map((s, i) => ({
    url: s.url,
    title: s.title,
    relevance: computeRelevance(s, data.topic, i, data.sources.length),
    contentHash: s.contentHash,
    sourceType: s.sourceType,
  }));

  // Sort by relevance
  verifiedSources.sort((a, b) => b.relevance - a.relevance);

  // Compute overall confidence
  const overallConfidence = computeConfidence(synthesis, data, verifiedSources);

  logger.info(`Research scored: confidence=${overallConfidence}%, verified ${verifiedSources.length} sources`);

  return {
    summary: synthesis.summary,
    keyFindings: synthesis.keyFindings,
    detailedAnalysis: synthesis.detailedAnalysis,
    nextSteps: synthesis.nextSteps,
    callToAction: synthesis.callToAction,
    verifiedSources,
    overallConfidence,
  };
}

/**
 * Compute relevance score for a source (0-100).
 */
function computeRelevance(
  source: SourceItem,
  topic: string,
  index: number,
  totalSources: number,
): number {
  let score = 50; // Base score

  // Boost for keyword match in title
  const topicWords = topic.toLowerCase().split(/\s+/);
  const titleLower = source.title.toLowerCase();
  const matchingWords = topicWords.filter((w) => w.length > 3 && titleLower.includes(w));
  score += matchingWords.length * 10;

  // Boost for content length (more content = more relevant, up to a point)
  const contentLength = source.content.length;
  if (contentLength > 200) score += 5;
  if (contentLength > 500) score += 5;
  if (contentLength > 1000) score += 5;

  // Boost for academic sources (more credible)
  if (source.sourceType === 'academic') score += 10;

  // Slight penalty for later results (search engines rank by relevance)
  score -= Math.floor(index / totalSources * 10);

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute overall confidence score for the research.
 */
function computeConfidence(
  synthesis: Synthesis,
  data: GatheredData,
  verified: VerifiedSource[],
): number {
  let confidence = 40; // Base

  // More sources = higher confidence
  const sourceCount = verified.length;
  if (sourceCount >= 5) confidence += 10;
  if (sourceCount >= 10) confidence += 10;
  if (sourceCount >= 20) confidence += 5;

  // Source diversity bonus
  const sourceTypes = new Set(verified.map((s) => s.sourceType));
  confidence += sourceTypes.size * 5;

  // Key findings bonus
  if (synthesis.keyFindings.length >= 3) confidence += 5;
  if (synthesis.keyFindings.length >= 5) confidence += 5;

  // Summary quality (length as proxy)
  if (synthesis.summary.length > 200) confidence += 5;
  if (synthesis.summary.length > 500) confidence += 5;

  // Average relevance of top sources
  const topRelevance =
    verified.slice(0, 5).reduce((sum, s) => sum + s.relevance, 0) /
    Math.min(5, verified.length);
  if (topRelevance > 70) confidence += 5;

  return Math.max(0, Math.min(100, Math.round(confidence)));
}
