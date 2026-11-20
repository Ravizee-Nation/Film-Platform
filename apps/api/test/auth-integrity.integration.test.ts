// D7 trial — L10 (Gate B): database and account integrity, and the F11 regression
// suite for verify-first registration. Duplicate accounts and account takeover must be
// prevented by the flow and by database constraints, including when requests race.
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PASSWORD_LINK_EXPIRES_IN_SECONDS } from '../src/auth';
import { REGISTRATION_RESPONSE } from '../src/auth-registration';
import {
  PASSWORD,
  WEB_ORIGIN,
  completeRegistration,
  createAuthTestContext,
  createVerifiedUser,
  lastEmail,
  me,
  register,
  setPassword,
  signIn,
  uniqueEmail,
  verifyEmail,
  type AuthTestContext,
} from './auth-helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

const ATTACKER_PASSWORD = 'an-attacker-passphrase';

/** credentials = email-and-password identities that actually hold a password. */
const accountState = async (email: string) => {
  const [row] = await ctx.sql<{ users: number; verified: boolean | null; credentials: number }[]>`
    select
      (select count(*)::int from users where email = ${email}) as users,
      (select bool_or(email_verified) from users where email = ${email}) as verified,
      (select count(*)::int from accounts a join users u on u.id = a.user_id
        where u.email = ${email} and a.provider_id = 'credential'
          and a.password is not null) as credentials`;
  return row!;
};

const requestReset = (email: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/auth/request-password-reset',
    headers: { origin: WEB_ORIGIN },
    payload: { email, redirectTo: '/reset' },
  });

const emailsTo = (email: string) => ctx.outbox.filter((item) => item.to === email.toLowerCase());

describe('F11 regression: no password or session before the inbox is proven', () => {
  it('registration takes an email only: no cookie, no token, no password identity, no sign-in', async () => {
    const email = uniqueEmail('reg-only');
    const response = await register(ctx, email);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(REGISTRATION_RESPONSE);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body).not.toMatch(/token/i);
    expect(await accountState(email)).toEqual({ users: 1, verified: false, credentials: 0 });
    expect((await signIn(ctx, email, PASSWORD)).response.statusCode).toBe(401);
  });

  it('a password supplied with the registration request is ignored', async () => {
    const email = uniqueEmail('reg-pw');
    await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register/email',
      headers: { origin: WEB_ORIGIN },
      payload: { email, password: ATTACKER_PASSWORD },
    });
    expect(await accountState(email)).toEqual({ users: 1, verified: false, credentials: 0 });
    expect((await signIn(ctx, email, ATTACKER_PASSWORD)).response.statusCode).toBe(401);
  });

  it('the link goes only to the address being registered, and expires in 30 minutes', async () => {
    const email = uniqueEmail('reg-link');
    await register(ctx, email);
    const sent = emailsTo(email);
    expect(sent.map((item) => item.kind)).toEqual(['complete-registration']);
    const [row] = await ctx.sql<{ minutes: number }[]>`
      select extract(epoch from (expires_at - now())) / 60 as minutes from verifications
      where identifier = ${`reset-password:${sent[0]!.token}`}`;
    expect(Number(row!.minutes)).toBeGreaterThan(PASSWORD_LINK_EXPIRES_IN_SECONDS / 60 - 1);
    expect(Number(row!.minutes)).toBeLessThanOrEqual(PASSWORD_LINK_EXPIRES_IN_SECONDS / 60);
  });

  it('opening the link sets the password and verifies the email in one step', async () => {
    const email = uniqueEmail('reg-complete');
    await register(ctx, email);
    expect((await completeRegistration(ctx, email)).statusCode).toBe(200);
    expect(await accountState(email)).toEqual({ users: 1, verified: true, credentials: 1 });
    const { response, cookie } = await signIn(ctx, email);
    expect(response.statusCode).toBe(200);
    expect((await me(ctx, cookie)).json()).toMatchObject({ email, emailVerified: true });
  });
});

describe('F11 regression: pre-registration by an attacker', () => {
  it('the attacker gets nothing usable; the owner completes with their own password', async () => {
    const email = uniqueEmail('victim');
    const attackerView = await register(ctx, email); // attacker registers the victim's address
    expect(attackerView.body).toBe(JSON.stringify(REGISTRATION_RESPONSE));

    expect((await completeRegistration(ctx, email, 'the-owners-own-passphrase')).statusCode).toBe(
      200,
    );
    expect((await signIn(ctx, email, ATTACKER_PASSWORD)).response.statusCode).toBe(401);
    expect((await signIn(ctx, email, 'the-owners-own-passphrase')).response.statusCode).toBe(200);
    expect(await accountState(email)).toEqual({ users: 1, verified: true, credentials: 1 });
  });

  it('verifying a pre-registered account by the verification-email route gives no password', async () => {
    const email = uniqueEmail('victim-verify');
    await register(ctx, email);
    await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/send-verification-email',
      headers: { origin: WEB_ORIGIN },
      payload: { email },
    });
    await verifyEmail(ctx, email); // the owner clicks it
    expect(await accountState(email)).toMatchObject({ credentials: 0 });
    expect((await signIn(ctx, email, ATTACKER_PASSWORD)).response.statusCode).toBe(401);
  });

  it('a guessed or made-up link token is refused', async () => {
    const email = uniqueEmail('victim-guess');
    await register(ctx, email);
    const response = await setPassword(ctx, 'a'.repeat(24), ATTACKER_PASSWORD);
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('INVALID_TOKEN');
    expect(await accountState(email)).toMatchObject({ credentials: 0 });
  });
});

describe('F11 regression: existing accounts cannot be claimed or changed by registering', () => {
  it('registering a verified address changes nothing; only its owner is emailed', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'owner');
    const before = ctx.outbox.length;
    const attempt = await register(ctx, email);
    expect(attempt.json()).toEqual(REGISTRATION_RESPONSE);
    const sent = ctx.outbox.slice(before);
    expect(sent.map((item) => [item.kind, item.to])).toEqual([['reset-password', email]]);
    expect((await me(ctx, cookie)).statusCode).toBe(200); // the owner's session is untouched
    expect((await signIn(ctx, email, PASSWORD)).response.statusCode).toBe(200);
    expect(await accountState(email)).toEqual({ users: 1, verified: true, credentials: 1 });
  });
});

describe('F11 regression: concurrency and consistent responses', () => {
  it('ten simultaneous registrations (mixed case): one user, no password, identical responses', async () => {
    const email = uniqueEmail('race');
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => register(ctx, i % 2 ? email.toUpperCase() : email)),
    );
    expect(responses.map((response) => response.statusCode)).toEqual(Array(10).fill(200));
    expect(new Set(responses.map((response) => response.body)).size).toBe(1);
    expect(await accountState(email)).toEqual({ users: 1, verified: false, credentials: 0 });
    expect(emailsTo(email).every((item) => item.kind === 'complete-registration')).toBe(true);
  });

  // Repeated 10 times: the race this guards against failed about 1 run in 5 before the fix.
  it('two different links redeemed at once: no server error, exactly one password identity', async () => {
    for (let run = 0; run < 10; run += 1) {
      const email = uniqueEmail('race-complete');
      await register(ctx, email);
      await register(ctx, email);
      const [first, second] = emailsTo(email).map((item) => item.token);
      const results = await Promise.all([
        setPassword(ctx, first!, 'first-racing-passphrase'),
        setPassword(ctx, second!, 'second-racing-passphrase'),
      ]);
      expect(results.map((response) => response.statusCode)).toEqual([200, 200]);
      const rows = await ctx.sql`
        select a.id from accounts a join users u on u.id = a.user_id
        where u.email = ${email} and a.provider_id = 'credential'`;
      expect(rows).toHaveLength(1);
      expect(await accountState(email)).toEqual({ users: 1, verified: true, credentials: 1 });
    }
  });
});

describe('F11 regression: expired, repeated and concurrent link tokens', () => {
  it('an expired link is refused', async () => {
    const email = uniqueEmail('expired-link');
    await register(ctx, email);
    const { token } = lastEmail(ctx, 'complete-registration', email);
    await ctx.sql`update verifications set expires_at = now() - interval '1 second'
      where identifier = ${`reset-password:${token}`}`;
    const response = await setPassword(ctx, token);
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('INVALID_TOKEN');
    expect(await accountState(email)).toMatchObject({ verified: false, credentials: 0 });
  });

  it('a link works once', async () => {
    const email = uniqueEmail('once-link');
    await register(ctx, email);
    const { token } = lastEmail(ctx, 'complete-registration', email);
    expect((await setPassword(ctx, token, 'first-passphrase-here')).statusCode).toBe(200);
    const again = await setPassword(ctx, token, 'second-passphrase-here');
    expect(again.statusCode).toBe(400);
    expect((await signIn(ctx, email, 'first-passphrase-here')).response.statusCode).toBe(200);
  });

  it('the same link redeemed twice at the same moment works once', async () => {
    const email = uniqueEmail('race-link');
    await register(ctx, email);
    const { token } = lastEmail(ctx, 'complete-registration', email);
    const results = await Promise.all([
      setPassword(ctx, token, 'first-racing-passphrase'),
      setPassword(ctx, token, 'second-racing-passphrase'),
    ]);
    expect(results.map((response) => response.statusCode).sort()).toEqual([200, 400]);
  });
});

describe('Recovery (F12 resolved)', () => {
  it('a reset for a verified account works, revokes sessions and keeps it verified', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'recover');
    await requestReset(email);
    const { token } = lastEmail(ctx, 'reset-password', email);
    expect((await setPassword(ctx, token, 'recovered-passphrase')).statusCode).toBe(200);
    expect((await me(ctx, cookie)).statusCode).toBe(401);
    expect(await accountState(email)).toEqual({ users: 1, verified: true, credentials: 1 });
  });

  it('a reset requested for a pending account completes its registration (same proof of inbox)', async () => {
    const email = uniqueEmail('pending-reset');
    await register(ctx, email);
    await requestReset(email);
    const sent = emailsTo(email).at(-1)!;
    expect(sent.kind).toBe('complete-registration');
    expect((await setPassword(ctx, sent.token)).statusCode).toBe(200);
    expect(await accountState(email)).toEqual({ users: 1, verified: true, credentials: 1 });
  });
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
    await register(ctx, email);
    await expect(
      ctx.sql`insert into users (id, name, email) values (${uuidv7()}, 'Copy', ${email.toUpperCase()})`,
    ).rejects.toThrow(/users_email_unique/);
  });

  it('one provider identity can belong to only one user', async () => {
    const first = uniqueEmail('identity-a');
    const second = uniqueEmail('identity-b');
    await register(ctx, first);
    await register(ctx, second);
    const ids = await ctx.sql<{ id: string }[]>`
      select id from users where email in (${first}, ${second}) order by email`;
    await ctx.sql`insert into accounts (id, user_id, provider_id, account_id)
      values (${uuidv7()}, ${ids[0]!.id}, 'apple', 'apple-subject-1')`;
    await expect(
      ctx.sql`insert into accounts (id, user_id, provider_id, account_id)
        values (${uuidv7()}, ${ids[1]!.id}, 'apple', 'apple-subject-1')`,
    ).rejects.toThrow(/accounts_provider_account_unique/);
  });

  it('a user has at most one email-and-password identity', async () => {
    const { email } = await createVerifiedUser(ctx, 'onecred');
    const [user] = await ctx.sql<{ id: string }[]>`select id from users where email = ${email}`;
    const id = user!.id;
    await expect(
      ctx.sql`insert into accounts (id, user_id, provider_id, account_id)
        values (${uuidv7()}, ${id}, 'credential', ${id})`,
    ).rejects.toThrow(/accounts_provider_account_unique/);
  });

  it('rate_limits rows carry created_at and a trigger-maintained updated_at', async () => {
    await ctx.sql`insert into rate_limits (id, key, count, last_request)
      values (${uuidv7()}, 'probe-key', 1, 0)`;
    await ctx.sql`update rate_limits set created_at = now() - interval '1 hour',
      updated_at = now() - interval '1 hour' where key = 'probe-key'`;
    await ctx.sql`update rate_limits set count = 2 where key = 'probe-key'`;
    const [row] = await ctx.sql<{ fresh: boolean; created_old: boolean }[]>`
      select updated_at > now() - interval '1 minute' as fresh,
             created_at < now() - interval '30 minutes' as created_old
      from rate_limits where key = 'probe-key'`;
    expect(row).toEqual({ fresh: true, created_old: true });
  });
});
