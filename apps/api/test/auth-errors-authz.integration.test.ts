// D7 trial — L5 authentication errors and L6 authorization controls.
import { errorResponseSchema } from '@film/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import {
  PASSWORD,
  WEB_ORIGIN,
  ageSessions,
  createAuthTestContext,
  createVerifiedUser,
  me,
  completeRegistration,
  register,
  setPassword,
  signIn,
  uniqueEmail,
  type AuthTestContext,
} from './auth-helpers';
import { fakeDatabase, testEnv } from './helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

const post = (path: string, headers: Record<string, string>, payload?: object) =>
  ctx.app.inject({ method: 'POST', url: `/api/auth${path}`, headers, payload: payload ?? {} });

describe('L5 authentication errors', () => {
  it('wrong password and unknown email give the same response (no enumeration)', async () => {
    const { email } = await createVerifiedUser(ctx, 'enum');
    const wrong = (await signIn(ctx, email, 'not-the-password')).response;
    const unknown = (await signIn(ctx, uniqueEmail('nobody'))).response;
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(wrong.statusCode);
    expect(unknown.json()).toEqual(wrong.json());
    expect(wrong.json().code).toBe('INVALID_EMAIL_OR_PASSWORD');
  });

  it('a pending registration cannot sign in with any password, and looks like an unknown email', async () => {
    const email = uniqueEmail('pending');
    await register(ctx, email);
    const pending = (await signIn(ctx, email, PASSWORD)).response;
    const unknown = (await signIn(ctx, uniqueEmail('nobody'), PASSWORD)).response;
    expect(pending.statusCode).toBe(401);
    expect(pending.json()).toEqual(unknown.json());
  });

  it('password reset requests look identical for known and unknown emails', async () => {
    const { email } = await createVerifiedUser(ctx, 'resetenum');
    const known = await post(
      '/request-password-reset',
      { origin: WEB_ORIGIN },
      { email, redirectTo: '/reset' },
    );
    const unknown = await post(
      '/request-password-reset',
      { origin: WEB_ORIGIN },
      { email: uniqueEmail('ghost'), redirectTo: '/reset' },
    );
    expect(known.statusCode).toBe(200);
    expect(unknown.statusCode).toBe(200);
    expect(unknown.json()).toEqual(known.json());
  });

  it('registration responds identically for new, pending and existing addresses (no enumeration)', async () => {
    const { email: existing } = await createVerifiedUser(ctx, 'regenum');
    const pending = uniqueEmail('regpending');
    await register(ctx, pending);
    const responses = await Promise.all([
      register(ctx, uniqueEmail('brandnew')),
      register(ctx, pending),
      register(ctx, existing),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 200, 200]);
    expect(new Set(responses.map((response) => response.body)).size).toBe(1);
  });

  it('the old email-and-password sign-up endpoint is closed and creates nothing', async () => {
    const email = uniqueEmail('closed');
    const response = await post(
      '/sign-up/email',
      { origin: WEB_ORIGIN },
      { email, password: PASSWORD, name: 'X' },
    );
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED');
    expect(await ctx.sql`select id from users where email = ${email}`).toHaveLength(0);
  });

  it('malformed requests are rejected with 400', async () => {
    const response = await post(
      '/sign-in/email',
      { origin: WEB_ORIGIN },
      { email: 'not-an-email' },
    );
    expect(response.statusCode).toBe(400);
  });

  it('short passwords are rejected when the password is set', async () => {
    const email = uniqueEmail('short');
    await register(ctx, email);
    const response = await completeRegistration(ctx, email, 'short');
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('PASSWORD_TOO_SHORT');
    expect((await setPassword(ctx, 'not-a-real-token')).statusCode).toBe(400);
  });

  it('error format: library routes use { code, message }; our routes use the standard shape (documented exception)', async () => {
    const library = (await signIn(ctx, uniqueEmail('format'), 'x')).response.json();
    expect(library).toEqual(
      expect.objectContaining({ code: expect.any(String), message: expect.any(String) }),
    );
    expect(library).not.toHaveProperty('error');
    const ours = (await me(ctx, '')).json();
    expect(errorResponseSchema.parse(ours).error.code).toBe('UNAUTHENTICATED');
  });
});

describe('L5 rate limiting', () => {
  let limited: AuthTestContext;
  beforeAll(async () => {
    limited = await createAuthTestContext({ credentialRateLimit: { window: 60, max: 3 } });
  });
  afterAll(async () => limited?.close());

  it('the 4th sign-in attempt from one IP within a minute gets 429; another IP is unaffected', async () => {
    const email = uniqueEmail('ratelimit');
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push(
        (await signIn(limited, email, 'wrong-password', { remoteAddress: '10.0.0.1' })).response
          .statusCode,
      );
    }
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
    const other = await signIn(limited, email, 'wrong-password', { remoteAddress: '10.0.0.2' });
    expect(other.response.statusCode).toBe(401);
  });

  it('a spoofed X-Forwarded-For header does not bypass the limit', async () => {
    const email = uniqueEmail('spoof');
    let last = 0;
    for (let i = 0; i < 5; i += 1) {
      const response = await limited.app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        remoteAddress: '10.0.0.9',
        headers: { origin: WEB_ORIGIN, 'x-forwarded-for': `203.0.113.${i}` },
        payload: { email, password: 'wrong-password' },
      });
      last = response.statusCode;
    }
    expect(last).toBe(429);
  });
});

describe('L6 authorization controls', () => {
  it('the explicit link endpoint refuses requests without a session', async () => {
    const response = await post('/link-social', { origin: WEB_ORIGIN }, { provider: 'google' });
    expect(response.statusCode).toBe(401);
  });

  it.each(['/link-social', '/unlink-account', '/change-email', '/delete-user'])(
    'a session older than 15 minutes is refused on %s',
    async (path) => {
      const { email, cookie } = await createVerifiedUser(ctx, 'stale');
      await ageSessions(ctx, email, 20);
      const body =
        path === '/link-social'
          ? { provider: 'google' }
          : path === '/unlink-account'
            ? { providerId: 'credential' }
            : path === '/change-email'
              ? { newEmail: uniqueEmail('new') }
              : { password: PASSWORD };
      const response = await post(path, { cookie, origin: WEB_ORIGIN }, body);
      expect(response.statusCode, response.body).toBe(403);
      expect(response.json().code).toBe('SESSION_NOT_FRESH');
    },
  );

  it('a fresh session can delete the account; its sessions disappear with it', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'deleteme');
    const response = await post(
      '/delete-user',
      { cookie, origin: WEB_ORIGIN },
      { password: PASSWORD },
    );
    expect(response.statusCode, response.body).toBe(200);
    expect((await me(ctx, cookie)).statusCode).toBe(401);
    expect(await ctx.sql`select id from users where email = ${email}`).toHaveLength(0);
  });

  it('changing the password demands the current password (reauthentication)', async () => {
    const { cookie } = await createVerifiedUser(ctx, 'pwreauth');
    const response = await post(
      '/change-password',
      { cookie, origin: WEB_ORIGIN },
      { currentPassword: 'not-the-password', newPassword: 'another-new-passphrase' },
    );
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it("our own 'recent-auth' routes: stale session 403 in the standard shape, fresh session 200", async () => {
    const app = await buildApp({
      env: testEnv,
      database: fakeDatabase(),
      auth: ctx.auth,
      register: (instance) => {
        instance.post('/v1/sensitive', { config: { access: 'recent-auth' } }, async () => ({
          ok: true,
        }));
      },
    });
    try {
      const fresh = await createVerifiedUser(ctx, 'recent');
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/sensitive',
            headers: { cookie: fresh.cookie },
          })
        ).statusCode,
      ).toBe(200);
      await ageSessions(ctx, fresh.email, 20);
      const stale = await app.inject({
        method: 'POST',
        url: '/v1/sensitive',
        headers: { cookie: fresh.cookie },
      });
      expect(stale.statusCode).toBe(403);
      expect(errorResponseSchema.parse(stale.json()).error.details).toEqual({
        reason: 'SESSION_NOT_FRESH',
      });
    } finally {
      await app.close();
    }
  });
});
