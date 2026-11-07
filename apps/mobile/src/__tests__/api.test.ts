import { fetchApiStatus } from '../api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchApiStatus', () => {
  it('returns ok when /health says ok', async () => {
    const fetchMock = jest.fn(async () => json({ status: 'ok' }));
    await expect(fetchApiStatus('http://api.test', fetchMock)).resolves.toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable when the request fails', async () => {
    const fetchMock = jest.fn(async () => Promise.reject(new TypeError('Network request failed')));
    await expect(fetchApiStatus('http://api.test', fetchMock)).resolves.toBe('unavailable');
  });
});
