import { createDatabase } from '@film/db';
import { createTestDatabase, testAdminUrl } from '@film/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers';

describe('readiness against a real Postgres', () => {
  let database: { url: string; drop: () => Promise<void> };

  beforeAll(async () => {
    database = await createTestDatabase(testAdminUrl());
  });
  afterAll(async () => {
    await database?.drop();
  });

  it('reports ready when the database is up', async () => {
    const app = await createTestApp({ database: createDatabase(database.url, { max: 1 }) });
    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok', checks: { database: 'ok' } });
    } finally {
      await app.close();
    }
  });

  it('reports unavailable when the database does not exist', async () => {
    const missing = new URL(database.url);
    missing.pathname = '/film_does_not_exist';
    const app = await createTestApp({ database: createDatabase(missing.toString(), { max: 1 }) });
    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'unavailable', checks: { database: 'error' } });
    } finally {
      await app.close();
    }
  });

  it('serves /health and /v1/meta with a real database attached', async () => {
    const app = await createTestApp({ database: createDatabase(database.url, { max: 1 }) });
    try {
      expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
      expect((await app.inject({ method: 'GET', url: '/v1/meta' })).json().environment).toBe(
        'test',
      );
    } finally {
      await app.close();
    }
  });
});
