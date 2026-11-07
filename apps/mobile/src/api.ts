import { createApiClient } from '@film/contracts';

export type ApiStatus = 'ok' | 'unavailable';

/**
 * EXPO_PUBLIC_API_URL is inlined at bundle time. On a physical phone it must be
 * your computer's LAN address (for example http://192.168.1.20:4000), not localhost.
 */
export function apiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
}

/** Calls GET /health through the generated client. Never throws. */
export async function fetchApiStatus(
  baseUrl = apiBaseUrl(),
  fetchImpl: typeof fetch = fetch,
): Promise<ApiStatus> {
  try {
    const client = createApiClient(baseUrl, { fetch: fetchImpl });
    const { data } = await client.GET('/health');
    return data?.status === 'ok' ? 'ok' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
