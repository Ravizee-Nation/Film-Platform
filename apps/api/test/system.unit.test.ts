import { errorResponseSchema, healthResponseSchema, metaResponseSchema } from '@film/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_VERSION } from '../src/app';
import { createTestApp, fakeDatabase } from './helpers';

let app: Awaited<ReturnType<typeof createTestApp>> | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('system routes', () => {
  it('GET /health returns ok without touching the database', async () => {
    const ping = vi.fn();
    app = await createTestApp({ database: fakeDatabase({ ping }) });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ status: 'ok' });
    expect(ping).not.toHaveBeenCalled();
  });

  it('GET /ready returns 200 when the database answers', async () => {
    app = await createTestApp();
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checks: { database: 'ok' } });
  });

  it('GET /ready returns 503 when the database is down', async () => {
    app = await createTestApp({
      database: fakeDatabase({ ping: async () => Promise.reject(new Error('connection refused')) }),
    });
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable', checks: { database: 'error' } });
  });

  it('GET /v1/meta reports version, environment and minimum client version', async () => {
    app = await createTestApp();
    const response = await app.inject({ method: 'GET', url: '/v1/meta' });
    expect(response.statusCode).toBe(200);
    expect(metaResponseSchema.parse(response.json())).toEqual({
      apiVersion: API_VERSION,
      environment: 'test',
      minimumClientVersion: '0.1.0',
    });
  });

  it('closes the database when the app closes', async () => {
    const close = vi.fn(async () => {});
    const local = await createTestApp({ database: fakeDatabase({ close }) });
    await local.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it('describes every route in the OpenAPI document', async () => {
    app = await createTestApp();
    const spec = app.swagger() as {
      paths: Record<string, unknown>;
      components: { schemas: Record<string, unknown> };
    };
    expect(Object.keys(spec.paths).sort()).toEqual(['/health', '/ready', '/v1/meta']);
    expect(spec.components.schemas).toHaveProperty('ErrorResponse');
  });

  it('unknown routes return the standard 404 error', async () => {
    app = await createTestApp();
    const response = await app.inject({ method: 'GET', url: '/nope' });
    expect(response.statusCode).toBe(404);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('NOT_FOUND');
  });
});
