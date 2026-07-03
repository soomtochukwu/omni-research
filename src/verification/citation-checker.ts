import { logger } from '../utils/logger.js';

/**
 * Validate that citations in the text reference actual sources.
 * Returns the list of valid citation indices.
 */
export function validateCitations(
  text: string,
  totalSources: number,
): { valid: number[]; invalid: number[] } {
  const citationPattern = /\[(\d+)\]/g;
  const found = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(text)) !== null) {
    found.add(parseInt(match[1], 10));
  }

  const valid: number[] = [];
  const invalid: number[] = [];

  for (const idx of found) {
    if (idx >= 1 && idx <= totalSources) {
      valid.push(idx);
    } else {
      invalid.push(idx);
    }
  }

  if (invalid.length > 0) {
    logger.warn(`Found ${invalid.length} invalid citations: ${invalid.join(', ')}`);
  }

  return { valid, invalid };
}
