// D7 trial — L3 web session, L4 mobile session (API side), L7 immediate revocation,
// L8 expiry and recovery.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { revokeAllSessionsForUser, SESSION_EXPIRES_IN_SECONDS } from '../src/auth';
import {
  NATIVE_ORIGIN,
  PASSWORD,
  WEB_ORIGIN,
  cookieFrom,
  createAuthTestContext,
  createVerifiedUser,
  lastEmail,
  me,
  signIn,
  type AuthTestContext,
} from './auth-helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

const post = (path: string, headers: Record<string, string>, payload?: object) =>
  ctx.app.inject({ method: 'POST', url: `/api/auth${path}`, headers, payload: payload ?? {} });

describe('L3 web session', () => {
  it('the session cookie is HttpOnly and SameSite=Lax (page scripts cannot read it)', async () => {
    const { email } = await createVerifiedUser(ctx, 'web');
    const { response } = await signIn(ctx, email);
    const setCookie = [response.headers['set-cookie']].flat().join('\n');
    const session = setCookie.split('\n').find((line) => line.includes('session_token='))!;
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).toMatch(/Path=\//);
  });

  it('no session cache cookie is issued (database-backed sessions only)', async () => {
    const { email } = await createVerifiedUser(ctx, 'nocache');
    const { response } = await signIn(ctx, email);
    const setCookie = [response.headers['set-cookie']].flat().join('\n');
    expect(setCookie).not.toMatch(/session_data/);
  });

  it('cross-origin requests are rejected: sign-in and cookie-bearing sign-out', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'csrf');
    const signInEvil = await signIn(ctx, email, PASSWORD, { origin: 'https://evil.example' });
    expect(signInEvil.response.statusCode).toBe(403);
    const signOutEvil = await post('/sign-out', { cookie, origin: 'https://evil.example' });
    expect(signOutEvil.statusCode).toBe(403);
    expect((await me(ctx, cookie)).statusCode).toBe(200);
  });
});

describe('L4 mobile session (API side)', () => {
  it('a native app signs in and acts with Origin filmplatform:// and no server expo() plugin', async () => {
    const { email } = await createVerifiedUser(ctx, 'native');
    const { response, cookie } = await signIn(ctx, email, PASSWORD, { origin: NATIVE_ORIGIN });
    expect(response.statusCode).toBe(200);
    expect((await me(ctx, cookie)).statusCode).toBe(200);
    const signOut = await post('/sign-out', { cookie, origin: NATIVE_ORIGIN });
    expect(signOut.statusCode).toBe(200);
    expect((await me(ctx, cookie)).statusCode).toBe(401);
  });

  it('without an Origin header, cookie-bearing requests are refused (why the client must send it)', async () => {
    const { cookie } = await createVerifiedUser(ctx, 'noorigin');
    const response = await post('/sign-out', { cookie });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('MISSING_OR_NULL_ORIGIN');
  });

  it('the expo-origin header alone is ignored, proving the server expo() plugin is off', async () => {
    const { cookie } = await createVerifiedUser(ctx, 'expoorigin');
    const response = await post('/sign-out', { cookie, 'expo-origin': NATIVE_ORIGIN });
    expect(response.statusCode).toBe(403);
  });

  it('the session survives an app restart: a stored cookie still resolves the same user', async () => {
    const { cookie } = await createVerifiedUser(ctx, 'restart');
    const before = (await me(ctx, cookie)).json();
    await ctx.rebuild();
    const after = await me(ctx, cookie);
    expect(after.statusCode).toBe(200);
    expect(after.json().userId).toBe(before.userId);
  });
});

describe('L7 immediate revocation', () => {
  it('sign-out: the old session fails on the very next request', async () => {
    const { cookie } = await createVerifiedUser(ctx, 'signout');
    expect((await post('/sign-out', { cookie, origin: WEB_ORIGIN })).statusCode).toBe(200);
    expect((await me(ctx, cookie)).statusCode).toBe(401);
  });

  it('password change: other sessions are revoked immediately', async () => {
    const { email, cookie: deviceA } = await createVerifiedUser(ctx, 'pwchange');
    const { cookie: deviceB } = await signIn(ctx, email);
    const change = await post(
      '/change-password',
      { cookie: deviceA, origin: WEB_ORIGIN },
      {
        currentPassword: PASSWORD,
        newPassword: 'a-brand-new-passphrase',
        revokeOtherSessions: true,
      },
    );
    expect(change.statusCode, change.body).toBe(200);
    expect((await me(ctx, deviceB)).statusCode).toBe(401);
    expect((await signIn(ctx, email, PASSWORD)).response.statusCode).toBe(401);
    expect((await signIn(ctx, email, 'a-brand-new-passphrase')).response.statusCode).toBe(200);
  });

  it('password reset (account recovery): every session is revoked', async () => {
    const { email, cookie: deviceA } = await createVerifiedUser(ctx, 'reset');
    const { cookie: deviceB } = await signIn(ctx, email, PASSWORD, { origin: NATIVE_ORIGIN });
    const request = await post(
      '/request-password-reset',
      { origin: WEB_ORIGIN },
      { email, redirectTo: '/reset' },
    );
    expect(request.statusCode).toBe(200);
    const { token } = lastEmail(ctx, 'reset-password', email);
    const reset = await post(
      '/reset-password',
      { origin: WEB_ORIGIN },
      { token, newPassword: 'recovered-passphrase-1' },
    );
    expect(reset.statusCode, reset.body).toBe(200);
    expect((await me(ctx, deviceA)).statusCode).toBe(401);
    expect((await me(ctx, deviceB)).statusCode).toBe(401);
    expect((await signIn(ctx, email, 'recovered-passphrase-1')).response.statusCode).toBe(200);
  });

  it('a reset token works once only', async () => {
    const { email } = await createVerifiedUser(ctx, 'resetonce');
    await post('/request-password-reset', { origin: WEB_ORIGIN }, { email, redirectTo: '/reset' });
    const { token } = lastEmail(ctx, 'reset-password', email);
    expect(
      (
        await post(
          '/reset-password',
          { origin: WEB_ORIGIN },
          { token, newPassword: 'first-new-passphrase' },
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await post(
          '/reset-password',
          { origin: WEB_ORIGIN },
          { token, newPassword: 'second-new-passphrase' },
        )
      ).statusCode,
    ).toBeGreaterThanOrEqual(400);
  });

  it('operator security action: every session for the user is revoked', async () => {
    const { email, cookie: deviceA } = await createVerifiedUser(ctx, 'operator');
    const { cookie: deviceB } = await signIn(ctx, email, PASSWORD, { origin: NATIVE_ORIGIN });
    const userId = (await me(ctx, deviceA)).json().userId as string;
    await revokeAllSessionsForUser(ctx.auth, userId);
    expect((await me(ctx, deviceA)).statusCode).toBe(401);
    expect((await me(ctx, deviceB)).statusCode).toBe(401);
  });
});

describe('L8 expiry and recovery', () => {
  it('an expired session is rejected', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'expired');
    await ctx.sql`update sessions set expires_at = now() - interval '1 minute'
      where user_id = (select id from users where email = ${email})`;
    expect((await me(ctx, cookie)).statusCode).toBe(401);
  });

  it('sessions slide: use after a day extends expiry to 30 days from now', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'sliding');
    await ctx.sql`update sessions set expires_at = now() + interval '28 days'
      where user_id = (select id from users where email = ${email})`;
    expect((await me(ctx, cookie)).statusCode).toBe(200);
    const [row] = await ctx.sql<{ days: number }[]>`
      select extract(epoch from (expires_at - now())) / 86400 as days from sessions
      where user_id = (select id from users where email = ${email})`;
    expect(Number(row!.days)).toBeGreaterThan(29.9);
    expect(Number(row!.days)).toBeLessThanOrEqual(SESSION_EXPIRES_IN_SECONDS / 86400);
  });

  it('a new session starts with a 30-day expiry', async () => {
    const { email } = await createVerifiedUser(ctx, 'newsession');
    const [row] = await ctx.sql<{ days: number }[]>`
      select extract(epoch from (expires_at - created_at)) / 86400 as days from sessions
      where user_id = (select id from users where email = ${email})`;
    expect(Math.round(Number(row!.days))).toBe(30);
  });

  it('after sign-out a stored cookie cannot be replayed', async () => {
    const { cookie } = await createVerifiedUser(ctx, 'replay');
    const fresh = cookieFrom([]);
    expect(fresh).toBe('');
    await post('/sign-out', { cookie, origin: WEB_ORIGIN });
    expect((await me(ctx, cookie)).statusCode).toBe(401);
  });
});
