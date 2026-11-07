import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDatabase>['db'];

export function createDatabase(databaseUrl: string, options: { max?: number } = {}) {
  const sql = postgres(databaseUrl, { max: options.max ?? 10, onnotice: () => {} });
  const db = drizzle(sql, { schema, casing: 'snake_case' });
  return {
    db,
    /** Round-trips to the database; throws if it cannot be reached. */
    async ping(): Promise<void> {
      await sql`select 1`;
    },
    async close(): Promise<void> {
      await sql.end({ timeout: 5 });
    },
  };
}
