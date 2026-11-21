/**
 * Right after the proxy refreshes an expired session, the new JWT's `iat` can
 * be a few hundred ms ahead of the database clock, and PostgREST rejects it
 * with "JWT issued at future". That surfaced as a server error on the first
 * open of the day that a reload fixed. Retry such requests once after the
 * skew has passed. Only that specific 401 is retried.
 */
export const SKEW_RETRY_MS = 1200;

export function isJwtFutureError(status: number, body: string): boolean {
  return status === 401 && /JWT issued at future/i.test(body);
}

export function createSkewTolerantFetch(
  baseFetch: typeof fetch = fetch,
  delayMs = SKEW_RETRY_MS,
): typeof fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init);
    if (response.status !== 401) return response;
    const body = await response.clone().text();
    if (!isJwtFutureError(response.status, body)) return response;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return baseFetch(input, init);
  };
}
