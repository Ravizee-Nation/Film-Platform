import { errorResponseSchema } from '@film/domain';
import { z } from 'zod';
import { afterEach, describe, expect, it } from 'vitest';
import { MissingRouteAccessError } from '../src/access';
import { createTestApp } from './helpers';

let app: Awaited<ReturnType<typeof createTestApp>> | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('route access policy', () => {
  it('fails at startup when a route has no access declaration', async () => {
    await expect(
      createTestApp({
        register: (instance) => {
          instance.get('/undeclared', async () => 'oops');
        },
      }),
    ).rejects.toBeInstanceOf(MissingRouteAccessError);
  });

  it.each([
    ['authenticated', 'authenticated' as const],
    ['entitlement', { entitlement: 'premium.search' }],
  ])('refuses a %s route with 401 until sign-in exists', async (_label, access) => {
    app = await createTestApp({
      register: (instance) => {
        instance.get('/private', { config: { access } }, async () => ({ secret: true }));
      },
    });
    const response = await app.inject({ method: 'GET', url: '/private' });
    expect(response.statusCode).toBe(401);
    const body = errorResponseSchema.parse(response.json());
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.error.requestId).toBe(response.headers['x-request-id']);
  });
});

describe('error model', () => {
  it('returns VALIDATION_FAILED with details for a bad body', async () => {
    app = await createTestApp({
      register: (instance) => {
        instance.post(
          '/echo',
          { config: { access: 'public' }, schema: { body: z.object({ name: z.string().min(2) }) } },
          async (request) => request.body,
        );
      },
    });
    const response = await app.inject({ method: 'POST', url: '/echo', payload: { name: 'x' } });
    expect(response.statusCode).toBe(400);
    const body = errorResponseSchema.parse(response.json());
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.details).toEqual([expect.objectContaining({ path: '/name' })]);
  });

  it('hides internal error details', async () => {
    app = await createTestApp({
      register: (instance) => {
        instance.get('/boom', { config: { access: 'public' } }, async () => {
          throw new Error('database password is hunter2');
        });
      },
    });
    const response = await app.inject({ method: 'GET', url: '/boom' });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('hunter2');
    expect(response.body).not.toContain('at ');
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 when a handler breaks its own response schema', async () => {
    app = await createTestApp({
      register: (instance) => {
        instance.get(
          '/bad-response',
          {
            config: { access: 'public' },
            schema: { response: { 200: z.object({ ok: z.boolean() }) } },
          },
          async () => ({ ok: 'yes' }) as unknown as { ok: boolean },
        );
      },
    });
    const response = await app.inject({ method: 'GET', url: '/bad-response' });
    expect(response.statusCode).toBe(500);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('INTERNAL_ERROR');
  });

  it('rejects bodies over 1 MB', async () => {
    app = await createTestApp({
      register: (instance) => {
        instance.post('/upload', { config: { access: 'public' } }, async () => ({ ok: true }));
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/upload',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ data: 'x'.repeat(1_100_000) }),
    });
    expect(response.statusCode).toBe(413);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('VALIDATION_FAILED');
  });

  it('maps a client error status to its code', async () => {
    app = await createTestApp({
      register: (instance) => {
        instance.get('/forbidden', { config: { access: 'public' } }, async () => {
          throw Object.assign(new Error('Not yours.'), { statusCode: 403 });
        });
      },
    });
    const response = await app.inject({ method: 'GET', url: '/forbidden' });
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toMatchObject({ code: 'FORBIDDEN', message: 'Not yours.' });
  });
});

describe('cross-cutting behaviour', () => {
  it('echoes a well-formed x-request-id', async () => {
    app = await createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'abc-123' },
    });
    expect(response.headers['x-request-id']).toBe('abc-123');
  });

  it('replaces a malformed x-request-id with a generated one', async () => {
    app = await createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'bad id; drop table' },
    });
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('allows only configured CORS origins', async () => {
    app = await createTestApp();
    const allowed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://allowed.test' },
    });
    const denied = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://evil.test' },
    });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.test');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sends security headers', async () => {
    app = await createTestApp();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });
});
