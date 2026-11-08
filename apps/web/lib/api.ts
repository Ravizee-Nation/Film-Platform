import { createApiClient } from '@film/contracts';

export type ApiStatus = 'ok' | 'unavailable';

/** Server-only: API_URL is never exposed to the browser. */
export function apiBaseUrl(): string {
  return process.env.API_URL ?? 'http://localhost:4000';
}

/** Calls GET /health through the generated client. Never throws. */
export async function fetchApiStatus(
  baseUrl = apiBaseUrl(),
  fetchImpl: typeof fetch = fetch,
): Promise<ApiStatus> {
  try {
    const client = createApiClient(baseUrl, { fetch: fetchImpl });
    const { data } = await client.GET('/health', { signal: AbortSignal.timeout(3000) });
    return data?.status === 'ok' ? 'ok' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
