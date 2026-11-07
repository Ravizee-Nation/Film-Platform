import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { runMigrations } from './migrate';

export const TEMPLATE_DATABASE = 'film_test_template';

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

async function admin<T>(adminUrl: string, fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

/** Recreates the migrated template database. Run once per test run (global setup). */
export async function prepareTemplateDatabase(adminUrl: string): Promise<void> {
  await admin(adminUrl, async (sql) => {
    await sql`select pg_terminate_backend(pid) from pg_stat_activity where datname = ${TEMPLATE_DATABASE} and pid <> pg_backend_pid()`;
    await sql.unsafe(`drop database if exists ${TEMPLATE_DATABASE}`);
    await sql.unsafe(`create database ${TEMPLATE_DATABASE}`);
  });
  await runMigrations(withDatabase(adminUrl, TEMPLATE_DATABASE));
}

/** Creates a throwaway database cloned from the template. Call `drop` when done. */
export async function createTestDatabase(
  adminUrl: string,
): Promise<{ url: string; drop: () => Promise<void> }> {
  const name = `film_test_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  await admin(adminUrl, (sql) =>
    sql.unsafe(`create database ${name} template ${TEMPLATE_DATABASE}`),
  );
  return {
    url: withDatabase(adminUrl, name),
    drop: () =>
      admin(adminUrl, (sql) => sql.unsafe(`drop database if exists ${name} with (force)`)).then(
        () => undefined,
      ),
  };
}

/** The admin connection used by tests: TEST_DATABASE_URL, falling back to DATABASE_URL. */
export function testAdminUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('Set TEST_DATABASE_URL (or DATABASE_URL) to run integration tests.');
  return url;
}
