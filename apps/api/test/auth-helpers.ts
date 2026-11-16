// D7 proof of concept: helpers for the Better Auth trial tests.
// Synthetic accounts only (*@example.test); a fresh random secret and a throwaway
// database per test file; emails are captured in memory, never sent.
import { randomBytes, randomUUID } from 'node:crypto';
import { createDatabase } from '@film/db';
import { createTestDatabase, testAdminUrl } from '@film/db/testing';
import postgres from 'postgres';
import { buildApp } from '../src/app';
import { createAuth, type OutgoingAuthEmail, type RateLimitRule } from '../src/auth';
import { testEnv } from './helpers';

export const WEB_ORIGIN = 'http://localhost:3000';
export const NATIVE_ORIGIN = 'filmplatform://';
export const PASSWORD = 'correct-horse-battery-staple';

export interface AuthTestContext {
  app: Awaited<ReturnType<typeof buildApp>>;
  auth: ReturnType<typeof createAuth>;
  sql: postgres.Sql;
  outbox: OutgoingAuthEmail[];
  rebuild: () => Promise<void>;
  close: () => Promise<void>;
}

export async function createAuthTestContext(
  options: { credentialRateLimit?: RateLimitRule } = {},
): Promise<AuthTestContext> {
  const testDb = await createTestDatabase(testAdminUrl());
  const database = createDatabase(testDb.url, { max: 2 });
  const sql = postgres(testDb.url, { max: 1, onnotice: () => {} });
  const outbox: OutgoingAuthEmail[] = [];
  const secret = randomBytes(32).toString('base64');

  const make = async () => {
    const auth = createAuth({
      db: database.db,
      secret,
      baseURL: 'http://localhost:4000',
      webOrigins: [WEB_ORIGIN],
      mailer: { send: (email) => void outbox.push(email) },
      production: false,
      credentialRateLimit: options.credentialRateLimit ?? { window: 60, max: 10_000 },
    });
    const app = await buildApp({
      env: {
        ...testEnv,
        CORS_ORIGINS: [WEB_ORIGIN],
        LOG_LEVEL: (process.env.TEST_LOG_LEVEL ?? 'silent') as 'silent',
      },
      // The app must not close the shared database when it is rebuilt.
      database: { ping: () => database.ping(), close: async () => {} },
      auth,
    });
    return { auth, app };
  };

  const context = { ...(await make()), sql, outbox } as AuthTestContext;
  context.rebuild = async () => {
    await context.app.close();
    Object.assign(context, await make());
  };
  context.close = async () => {
    await context.app.close();
    await sql.end();
    await database.close();
    await testDb.drop();
  };
  return context;
}

export const uniqueEmail = (label = 'user') => `${label}-${randomUUID().slice(0, 8)}@example.test`;

/** Joins Set-Cookie headers into a Cookie request header (name=value pairs only). */
export function cookieFrom(setCookie: string | string[] | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return list
    .map((header) => header.split(';')[0]!)
    .filter((pair) => !pair.endsWith('='))
    .join('; ');
}

/** Step 1 of verify-first registration: email only. Creates a pending account. */
export async function register(ctx: AuthTestContext, email: string) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/auth/register/email',
    headers: { origin: WEB_ORIGIN },
    payload: { email, name: 'Test User', redirectTo: '/complete-registration' },
  });
}

/** Sets a password with a single-use link token (registration or reset). */
export async function setPassword(ctx: AuthTestContext, token: string, newPassword = PASSWORD) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/auth/reset-password',
    headers: { origin: WEB_ORIGIN },
    payload: { token, newPassword },
  });
}

/** Step 2: the inbox owner opens the link and chooses a password. */
export async function completeRegistration(
  ctx: AuthTestContext,
  email: string,
  password = PASSWORD,
) {
  const { token } = lastEmail(ctx, 'complete-registration', email);
  return setPassword(ctx, token, password);
}

export function lastEmail(ctx: AuthTestContext, kind: OutgoingAuthEmail['kind'], to: string) {
  const email = [...ctx.outbox]
    .reverse()
    .find((item) => item.kind === kind && item.to === to.toLowerCase());
  if (!email) throw new Error(`No ${kind} email for ${to}`);
  return email;
}

export async function verifyEmail(ctx: AuthTestContext, email: string) {
  const { token } = lastEmail(ctx, 'verify-email', email);
  return ctx.app.inject({
    method: 'GET',
    url: `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
  });
}

export async function signIn(
  ctx: AuthTestContext,
  email: string,
  password = PASSWORD,
  options: { origin?: string; remoteAddress?: string } = {},
) {
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: options.origin ?? WEB_ORIGIN },
    remoteAddress: options.remoteAddress,
    payload: { email, password },
  });
  return { response, cookie: cookieFrom(response.headers['set-cookie']) };
}

/** Registers, completes registration from the emailed link, and signs in. */
export async function createVerifiedUser(ctx: AuthTestContext, label = 'user') {
  const email = uniqueEmail(label);
  const registerResponse = await register(ctx, email);
  if (registerResponse.statusCode !== 200)
    throw new Error(`register failed: ${registerResponse.body}`);
  const complete = await completeRegistration(ctx, email);
  if (complete.statusCode !== 200) throw new Error(`complete failed: ${complete.body}`);
  const { response, cookie } = await signIn(ctx, email);
  if (response.statusCode !== 200) throw new Error(`sign-in failed: ${response.body}`);
  return { email, cookie };
}

export async function me(ctx: AuthTestContext, cookie: string) {
  return ctx.app.inject({ method: 'GET', url: '/v1/me', headers: cookie ? { cookie } : {} });
}

/** Moves a user's sessions back in time (simulates an old sign-in). */
export async function ageSessions(ctx: AuthTestContext, email: string, minutes: number) {
  await ctx.sql`
    update sessions set created_at = created_at - make_interval(mins => ${minutes})
    where user_id = (select id from users where email = ${email.toLowerCase()})`;
}
