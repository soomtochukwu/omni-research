import { hashString, hashArray } from '../utils/hash.js';
import type { SourceItem } from '../research/gatherer.js';

/**
 * Compute a keccak256 hash over the entire evidence bundle.
 * This hash is stored on-chain via the CAP delivery proof.
 */
export function computeEvidenceHash(sources: SourceItem[]): string {
  const items = sources.map((s) => ({
    url: s.url,
    content_hash: s.contentHash,
    retrieved_at: s.retrievedAt,
  }));

  return hashArray(items, 'url');
}

/**
 * Hash a single source's raw content for per-citation verification.
 */
export function hashSourceContent(content: string): string {
  return hashString(content);
}
