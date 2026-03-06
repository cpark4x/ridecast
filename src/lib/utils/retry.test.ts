import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from './retry';

describe('retryWithBackoff', () => {
  it('returns result immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, 2, 0);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on rate limit error (contains "rate limit") and succeeds on next call', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('rate limit exceeded'))
      .mockResolvedValueOnce('ok');

    const result = await retryWithBackoff(fn, 2, 0);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on error message containing "429"', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('429 Too Many Requests'))
      .mockResolvedValueOnce('retried-ok');

    const result = await retryWithBackoff(fn, 2, 0);
    expect(result).toBe('retried-ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on non-rate-limit errors (throws immediately)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));

    await expect(retryWithBackoff(fn, 2, 0)).rejects.toThrow('network error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops retrying after maxRetries exhausted and rethrows', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('429 Too Many Requests'));

    await expect(retryWithBackoff(fn, 2, 0)).rejects.toThrow('429');
    // initial call + 2 retries = 3 total
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects maxRetries=0 (no retries)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('rate limit hit'));

    await expect(retryWithBackoff(fn, 0, 0)).rejects.toThrow('rate limit hit');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
