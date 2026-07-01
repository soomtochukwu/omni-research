import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Compute keccak256 hash of a string.
 */
export function hashString(input: string): string {
  return keccak256(toUtf8Bytes(input));
}

/**
 * Compute a deterministic hash over an array of objects.
 * Objects are sorted by a key before hashing to ensure determinism.
 */
export function hashArray<T extends Record<string, unknown>>(
  items: T[],
  sortKey: keyof T,
): string {
  const sorted = [...items].sort((a, b) =>
    String(a[sortKey]).localeCompare(String(b[sortKey])),
  );
  return hashString(JSON.stringify(sorted));
}
