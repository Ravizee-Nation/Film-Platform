import { describe, expect, it, vi } from 'vitest';
import { fetchApiStatus } from './api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchApiStatus', () => {
  it('returns ok when /health says ok', async () => {
    const fetchMock = vi.fn(async () => json({ status: 'ok' }));
    await expect(fetchApiStatus('http://api.test', fetchMock)).resolves.toBe('ok');
  });

  it('returns unavailable on an error response', async () => {
    const fetchMock = vi.fn(async () => json({ error: { code: 'INTERNAL_ERROR' } }, 500));
    await expect(fetchApiStatus('http://api.test', fetchMock)).resolves.toBe('unavailable');
  });

  it('returns unavailable when the network fails', async () => {
    const fetchMock = vi.fn(async () => Promise.reject(new TypeError('fetch failed')));
    await expect(fetchApiStatus('http://api.test', fetchMock)).resolves.toBe('unavailable');
  });
});
