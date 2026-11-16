// D7 trial — L1 (Fastify integration within our guardrails) and L2 (unified identity).
import { buildApp } from '../src/app';
import { MissingRouteAccessError } from '../src/access';
import { errorResponseSchema } from '@film/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  NATIVE_ORIGIN,
  PASSWORD,
  createAuthTestContext,
  createVerifiedUser,
  me,
  signIn,
  signUp,
  uniqueEmail,
  verifyEmail,
  type AuthTestContext,
} from './auth-helpers';
import { fakeDatabase, testEnv } from './helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

describe('L1 Fastify integration within our guardrails', () => {
  it('protected route: 401 in the standard error shape without a session, 200 with one', async () => {
    const anonymous = await me(ctx, '');
    expect(anonymous.statusCode).toBe(401);
    expect(errorResponseSchema.parse(anonymous.json()).error.code).toBe('UNAUTHENTICATED');

    const { email, cookie } = await createVerifiedUser(ctx);
    const signedIn = await me(ctx, cookie);
    expect(signedIn.statusCode).toBe(200);
    expect(signedIn.json()).toMatchObject({ email, emailVerified: true });
  });

  it('a forged or unknown session cookie is refused', async () => {
    const response = await me(ctx, 'better-auth.session_token=forged.value');
    expect(response.statusCode).toBe(401);
  });

  it('every route still needs an access declaration, with auth enabled', async () => {
    await expect(
      buildApp({
        env: testEnv,
        database: fakeDatabase(),
        auth: ctx.auth,
        register: (app) => {
          app.get('/undeclared', async () => 'oops');
        },
      }),
    ).rejects.toBeInstanceOf(MissingRouteAccessError);
  });

  it('entitlement routes are refused even with a session (Phase 2 not built)', async () => {
    const app = await buildApp({
      env: testEnv,
      database: fakeDatabase(),
      auth: ctx.auth,
      register: (instance) => {
        instance.get('/premium', { config: { access: { entitlement: 'premium' } } }, async () => ({
          ok: true,
        }));
      },
    });
    try {
      const { cookie } = await createVerifiedUser(ctx, 'entitled');
      const response = await app.inject({ method: 'GET', url: '/premium', headers: { cookie } });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('the OpenAPI contract documents /v1/me and hides the library routes', () => {
    const spec = ctx.app.swagger() as { paths: Record<string, unknown> };
    expect(Object.keys(spec.paths)).toContain('/v1/me');
    expect(Object.keys(spec.paths).some((path) => path.startsWith('/api/auth'))).toBe(false);
  });
});

describe('L2 one person, one identity', () => {
  it('web and native clients signing in as the same person get the same user ID', async () => {
    const { email, cookie: webCookie } = await createVerifiedUser(ctx, 'unified');
    const { response, cookie: nativeCookie } = await signIn(ctx, email, PASSWORD, {
      origin: NATIVE_ORIGIN,
    });
    expect(response.statusCode).toBe(200);
    expect(nativeCookie).not.toBe(webCookie);

    const fromWeb = (await me(ctx, webCookie)).json();
    const fromNative = (await me(ctx, nativeCookie)).json();
    expect(fromNative.userId).toBe(fromWeb.userId);

    const [counts] = await ctx.sql<{ users: number; accounts: number; sessions: number }[]>`
      select
        (select count(*)::int from users where email = ${email}) as users,
        (select count(*)::int from accounts a join users u on u.id = a.user_id where u.email = ${email}) as accounts,
        (select count(*)::int from sessions s join users u on u.id = s.user_id where u.email = ${email}) as sessions`;
    expect(counts).toEqual({ users: 1, accounts: 1, sessions: 2 });
  });

  it('email addresses are case-insensitive: one account, sign-in with any casing', async () => {
    const lower = uniqueEmail('casing');
    const mixed = lower.replace(/^c/, 'C').replace('example', 'Example');
    expect((await signUp(ctx, mixed)).statusCode).toBe(200);
    expect((await verifyEmail(ctx, lower)).statusCode).toBeLessThan(400);

    const { response } = await signIn(ctx, lower);
    expect(response.statusCode).toBe(200);
    const rows = await ctx.sql`select email from users where lower(email) = ${lower}`;
    expect(rows).toEqual([{ email: lower }]);
  });

  it('signing up again with the same email never creates a second user', async () => {
    const email = uniqueEmail('duplicate');
    await signUp(ctx, email);
    await signUp(ctx, email.toUpperCase());
    const rows = await ctx.sql`select id from users where lower(email) = ${email}`;
    expect(rows).toHaveLength(1);
  });
});
