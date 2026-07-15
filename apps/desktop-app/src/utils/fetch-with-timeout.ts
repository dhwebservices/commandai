/**
 * Fetch with timeout and retry logic
 * Prevents app hangs from network failures
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 10000, // 10 seconds default
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt < retries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        );
        continue;
      }

      // All retries exhausted
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Server is unreachable. Check your internet connection.');
      }

      throw error;
    }
  }

  throw lastError || new Error('Fetch failed');
}

/**
 * Parse JSON response with proper error handling
 */
export async function parseJSONResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    // Not JSON - get text instead
    const text = await response.text();
    throw new Error(`Expected JSON response, got: ${text.substring(0, 200)}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('Failed to parse JSON response');
  }
}
