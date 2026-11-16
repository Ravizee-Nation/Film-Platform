// D7 trial (Gate B, F2): ADR 0004's UUID v7 rule, proven with real inserts on a database
// built by the real migrations. Every identity row gets a v7 id from the API; the
// database refuses rows without one.
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  WEB_ORIGIN,
  createAuthTestContext,
  createVerifiedUser,
  register,
  signIn,
  uniqueEmail,
  type AuthTestContext,
} from './auth-helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext({ credentialRateLimit: { window: 60, max: 10_000 } });
});
afterAll(async () => ctx?.close());

const TABLES = ['users', 'sessions', 'accounts', 'verifications', 'rate_limits'] as const;
const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('F2: UUID v7 identity keys (ADR 0004)', () => {
  it('the migrations leave no id default on any identity table', async () => {
    const rows = await ctx.sql<{ table_name: string; column_default: string | null }[]>`
      select table_name, column_default from information_schema.columns
      where column_name = 'id' and table_name in ${ctx.sql([...TABLES])}
      order by table_name`;
    expect(rows.map((row) => row.table_name)).toEqual([...TABLES].sort());
    expect(rows.every((row) => row.column_default === null)).toBe(true);
  });

  it('every row the library writes, in all five tables, has a version 7 id', async () => {
    const { email } = await createVerifiedUser(ctx, 'v7'); // users, accounts, verifications, sessions
    await signIn(ctx, email, 'a-wrong-passphrase'); // rate_limits
    await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/request-password-reset',
      headers: { origin: WEB_ORIGIN },
      payload: { email, redirectTo: '/reset' },
    }); // a fresh verifications row
    for (const table of TABLES) {
      const rows = await ctx.sql<{ id: string }[]>`select id::text as id from ${ctx.sql(table)}`;
      expect(rows.length, table).toBeGreaterThan(0);
      for (const row of rows) expect(row.id, `${table} ${row.id}`).toMatch(V7);
    }
  });

  it('ids are time-ordered: later users sort after earlier ones in the database', async () => {
    const emails = Array.from({ length: 5 }, (_, i) => uniqueEmail(`order-${i}`));
    for (const email of emails) {
      await register(ctx, email);
      await new Promise((resolve) => setTimeout(resolve, 3));
    }
    const rows = await ctx.sql<{ email: string }[]>`
      select email from users where email in ${ctx.sql(emails)} order by id`;
    expect(rows.map((row) => row.email)).toEqual(emails);
  });

  it('a row inserted without an id is refused (no silent v4 fallback)', async () => {
    await expect(
      ctx.sql`insert into users (name, email) values ('No id', ${uniqueEmail('noid')})`,
    ).rejects.toThrow(/null value in column "id"/);
  });

  it('a row inserted with an application-generated v7 id is accepted', async () => {
    const id = uuidv7();
    await ctx.sql`insert into users (id, name, email) values (${id}, 'Manual', ${uniqueEmail('manual')})`;
    const [row] = await ctx.sql<
      { id: string }[]
    >`select id::text as id from users where id = ${id}`;
    expect(row!.id).toMatch(V7);
  });
});
