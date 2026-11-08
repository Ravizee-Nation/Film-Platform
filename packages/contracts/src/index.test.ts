import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './index';

describe('createApiClient', () => {
  it('calls the typed health route on the given base URL', async () => {
    const fetchMock = vi.fn(async (request: Request) => {
      expect(request.url).toBe('http://api.test/health');
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createApiClient('http://api.test', { fetch: fetchMock });
    const { data, error } = await client.GET('/health');
    expect(error).toBeUndefined();
    expect(data?.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
