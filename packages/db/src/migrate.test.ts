import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from './migrate';
import { createTestDatabase, prepareTemplateDatabase, testAdminUrl } from './testing';

describe('migrations', () => {
  let database: { url: string; drop: () => Promise<void> };

  beforeAll(async () => {
    await prepareTemplateDatabase(testAdminUrl());
    database = await createTestDatabase(testAdminUrl());
  });

  afterAll(async () => {
    await database?.drop();
  });

  it('enables the baseline extensions', async () => {
    const sql = postgres(database.url, { max: 1 });
    try {
      const rows = await sql<
        { extname: string }[]
      >`select extname from pg_extension order by extname`;
      expect(rows.map((row) => row.extname)).toEqual(
        expect.arrayContaining(['citext', 'pgcrypto']),
      );
    } finally {
      await sql.end();
    }
  });

  it('is a no-op when re-run on a migrated database', async () => {
    await expect(runMigrations(database.url)).resolves.toBeUndefined();
  });

  it('serializes concurrent runs with the advisory lock', async () => {
    await expect(
      Promise.all([runMigrations(database.url), runMigrations(database.url)]),
    ).resolves.toHaveLength(2);
  });
});
