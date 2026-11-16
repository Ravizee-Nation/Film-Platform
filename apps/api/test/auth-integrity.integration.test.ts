// D7 trial — L10 (Gate B): database and account integrity. Duplicate accounts and
// account takeover must be prevented by database constraints, not only by the
// library normalising input, including when requests race.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PASSWORD,
  WEB_ORIGIN,
  createAuthTestContext,
  createVerifiedUser,
  lastEmail,
  signIn,
  signUp,
  uniqueEmail,
  verifyEmail,
  type AuthTestContext,
} from './auth-helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

const userIdFor = async (email: string) =>
  (await ctx.sql<{ id: string }[]>`select id from users where email = ${email}`)[0]!.id;

const requestReset = (email: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/auth/request-password-reset',
    headers: { origin: WEB_ORIGIN },
    payload: { email, redirectTo: '/reset' },
  });

const resetPassword = (token: string, newPassword: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/auth/reset-password',
    headers: { origin: WEB_ORIGIN },
    payload: { token, newPassword },
  });

describe('L10 database constraints', () => {
  it('users.email is case-insensitive text (citext)', async () => {
    const [column] = await ctx.sql<{ udt_name: string }[]>`
      select udt_name from information_schema.columns
      where table_name = 'users' and column_name = 'email'`;
    expect(column!.udt_name).toBe('citext');
  });

  it('the database refuses a second user whose email differs only in case', async () => {
    const email = uniqueEmail('dbcase');
    await signUp(ctx, email);
    await expect(
      ctx.sql`insert into users (name, email) values ('Copy', ${email.toUpperCase()})`,
    ).rejects.toThrow(/users_email_unique/);
  });

  it('a lookup with different casing finds the same user', async () => {
    const email = uniqueEmail('lookup');
    await signUp(ctx, email);
    const rows = await ctx.sql`select id from users where email = ${email.toUpperCase()}`;
    expect(rows).toHaveLength(1);
  });

  it('one provider identity can belong to only one user', async () => {
    const first = uniqueEmail('identity-a');
    const second = uniqueEmail('identity-b');
    await signUp(ctx, first);
    await signUp(ctx, second);
    const [a, b] = [await userIdFor(first), await userIdFor(second)];
    await ctx.sql`insert into accounts (user_id, provider_id, account_id) values (${a}, 'apple', 'apple-subject-1')`;
    await expect(
      ctx.sql`insert into accounts (user_id, provider_id, account_id) values (${b}, 'apple', 'apple-subject-1')`,
    ).rejects.toThrow(/accounts_provider_account_unique/);
  });

  it('a user has at most one email-and-password identity', async () => {
    const email = uniqueEmail('onecred');
    await signUp(ctx, email);
    const id = await userIdFor(email);
    await expect(
      ctx.sql`insert into accounts (user_id, provider_id, account_id) values (${id}, 'credential', ${id})`,
    ).rejects.toThrow(/accounts_provider_account_unique/);
  });

  it('rate_limits rows carry created_at and a trigger-maintained updated_at', async () => {
    await ctx.sql`insert into rate_limits (key, count, last_request) values ('probe-key', 1, 0)`;
    await ctx.sql`update rate_limits set created_at = now() - interval '1 hour', updated_at = now() - interval '1 hour' where key = 'probe-key'`;
    await ctx.sql`update rate_limits set count = 2 where key = 'probe-key'`;
    const [row] = await ctx.sql<{ fresh: boolean; created_old: boolean }[]>`
      select updated_at > now() - interval '1 minute' as fresh,
             created_at < now() - interval '30 minutes' as created_old
      from rate_limits where key = 'probe-key'`;
    expect(row).toEqual({ fresh: true, created_old: true });
  });
});

describe('L10 concurrency', () => {
  it('ten simultaneous sign-ups for one email (mixed case) create exactly one user and no server errors', async () => {
    const email = uniqueEmail('race');
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => signUp(ctx, i % 2 ? email.toUpperCase() : email)),
    );
    expect(responses.every((response) => response.statusCode < 500)).toBe(true);
    const [counts] = await ctx.sql<{ users: number; accounts: number }[]>`
      select
        (select count(*)::int from users where email = ${email}) as users,
        (select count(*)::int from accounts a join users u on u.id = a.user_id
          where u.email = ${email}) as accounts`;
    expect(counts).toEqual({ users: 1, accounts: 1 });
  });

  it('a reset token used twice at the same moment works only once', async () => {
    const { email } = await createVerifiedUser(ctx, 'resetrace');
    await requestReset(email);
    const { token } = lastEmail(ctx, 'reset-password', email);
    const results = await Promise.all([
      resetPassword(token, 'first-racing-passphrase'),
      resetPassword(token, 'second-racing-passphrase'),
    ]);
    expect(results.map((response) => response.statusCode).sort()).toEqual([200, 400]);
  });
});

describe('L10 takeover attempts', () => {
  it("signing up again with someone's verified email changes nothing and sends nothing", async () => {
    const { email } = await createVerifiedUser(ctx, 'owner');
    const sentBefore = ctx.outbox.length;
    const attempt = await signUp(ctx, email, 'an-attacker-passphrase');
    expect(attempt.statusCode).toBe(200);
    expect(ctx.outbox.length).toBe(sentBefore);
    expect((await signIn(ctx, email, 'an-attacker-passphrase')).response.statusCode).toBe(401);
    expect((await signIn(ctx, email, PASSWORD)).response.statusCode).toBe(200);
  });

  it('password reset of a pre-registered account locks the pre-registrant out', async () => {
    const email = uniqueEmail('prereg-reset');
    await signUp(ctx, email, 'an-attacker-passphrase');
    await requestReset(email);
    const { token } = lastEmail(ctx, 'reset-password', email);
    expect((await resetPassword(token, 'the-real-owner-passphrase')).statusCode).toBe(200);
    expect((await signIn(ctx, email, 'an-attacker-passphrase')).response.statusCode).toBe(401);
  });

  // KNOWN GAP (finding F11, open). Recorded as current behaviour so a fix makes this
  // test fail and forces the finding to be updated. Someone who registers another
  // person's email with their own password gains access if that person then clicks
  // the verification link sent to them.
  it('KNOWN GAP F11: verifying a pre-registered account activates the pre-registrant password', async () => {
    const email = uniqueEmail('prereg-verify');
    await signUp(ctx, email, 'an-attacker-passphrase');
    await verifyEmail(ctx, email);
    expect((await signIn(ctx, email, 'an-attacker-passphrase')).response.statusCode).toBe(200);
  });

  // Finding F12 (low): a reset proves control of the inbox but does not mark the
  // email verified, so the owner still needs a verification email afterwards.
  it('F12: a password reset does not mark the email verified', async () => {
    const email = uniqueEmail('reset-unverified');
    await signUp(ctx, email);
    await requestReset(email);
    const { token } = lastEmail(ctx, 'reset-password', email);
    await resetPassword(token, 'after-reset-passphrase');
    const login = await signIn(ctx, email, 'after-reset-passphrase');
    expect(login.response.statusCode).toBe(403);
    expect(login.response.json().code).toBe('EMAIL_NOT_VERIFIED');
  });
});
