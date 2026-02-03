/**
 * Fetch utility with retry logic and timeout support
 */

import { VenalabsApiError } from './errors';

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Options for fetchWithRetry
 */
export interface FetchWithRetryOptions {
  /** Number of retry attempts (default: 1) */
  retries?: number;
  /** Delay between retries in ms (default: 2000) */
  retryDelay?: number;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  retries: 1,
  retryDelay: 2000,
  timeout: 30000,
};

/**
 * Check if an error is retryable based on HTTP status
 */
function isRetryableStatus(status: number): boolean {
  // Retry on 5xx server errors and 429 rate limiting
  return status >= 500 || status === 429;
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeoutId };
}

/**
 * Fetch with automatic retry on network errors and 5xx responses
 *
 * @param url - URL to fetch
 * @param options - Fetch options (RequestInit)
 * @param retryOptions - Retry and timeout configuration
 * @returns Promise resolving to Response
 * @throws VenalabsApiError on timeout, network errors, or exhausted retries
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: FetchWithRetryOptions = {}
): Promise<Response> {
  const { retries, retryDelay, timeout } = { ...DEFAULT_OPTIONS, ...retryOptions };

  let lastError: Error | null = null;
  let attemptsRemaining = retries + 1; // Initial attempt + retries

  while (attemptsRemaining > 0) {
    const { controller, timeoutId } = createTimeoutController(timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Success or non-retryable error - return response
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }

      // Retryable status but have retries remaining
      attemptsRemaining--;
      if (attemptsRemaining > 0) {
        await sleep(retryDelay);
        continue;
      }

      // No more retries - return the error response
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Check for abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = VenalabsApiError.fromTimeout(timeout);
        attemptsRemaining--;

        if (attemptsRemaining > 0) {
          await sleep(retryDelay);
          continue;
        }

        throw lastError;
      }

      // Network error
      lastError = error instanceof Error ? error : new Error(String(error));
      attemptsRemaining--;

      if (attemptsRemaining > 0) {
        await sleep(retryDelay);
        continue;
      }

      throw VenalabsApiError.fromNetworkError(lastError);
    }
  }

  // Should not reach here, but handle edge case
  throw lastError || new Error('Unknown fetch error');
}
