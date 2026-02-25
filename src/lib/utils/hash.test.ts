import { describe, it, expect } from 'vitest';
import { contentHash } from './hash';

describe('contentHash', () => {
  it('returns a 64-character hex string', () => {
    const hash = contentHash('hello world');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input produces same hash', () => {
    const hash1 = contentHash('deterministic test input');
    const hash2 = contentHash('deterministic test input');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = contentHash('input one');
    const hash2 = contentHash('input two');
    expect(hash1).not.toBe(hash2);
  });
});
