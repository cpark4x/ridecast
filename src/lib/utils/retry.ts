/**
 * Retries a function on rate-limit errors (429 / "rate limit") with exponential backoff.
 * Non-rate-limit errors are thrown immediately without retry.
 *
 * @param fn          - Async function to execute and potentially retry.
 * @param maxRetries  - Maximum number of retries after the initial attempt (default: 2).
 * @param baseDelayMs - Base delay in milliseconds before first retry (default: 1000).
 *                      Each subsequent retry delay is multiplied by 3.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('rate limit') || err.message.includes('429'));
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(3, attempt);
      console.log(
        `[retry] Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
