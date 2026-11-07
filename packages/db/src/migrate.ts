import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../migrations', import.meta.url));

// Arbitrary constant shared by every deploy so two migrators never run at once.
const MIGRATION_LOCK_ID = 7_340_001;

/** Applies pending migrations under an advisory lock. Each migration runs in a transaction. */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await sql`select pg_advisory_lock(${MIGRATION_LOCK_ID})`;
    try {
      await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER });
    } finally {
      await sql`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`;
    }
  } finally {
    await sql.end();
  }
}
