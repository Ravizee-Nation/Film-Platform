// D7 PROOF OF CONCEPT (branch poc/d7-better-auth; never merged).
// Better Auth 1.7.25 configured to the D7 authorization package. Each setting
// names the requirement it implements; tests in test/auth*.test.ts verify them.
import { appendFileSync } from 'node:fs';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { schema, type Database } from '@film/db';

/** S4: sessions expire after 30 days without use, refreshed at most daily. */
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;
/** S11: sensitive changes need a session created in the last 15 minutes. */
export const FRESH_AGE_SECONDS = 15 * 60;
/**
 * S11: library endpoints that get the fresh-session rule from our hook. The
 * library itself only enforces freshness on /unlink-account and /list-sessions;
 * /change-password is excluded because it already demands the current password.
 */
export const FRESH_SESSION_PATHS: readonly string[] = [
  '/link-social',
  '/unlink-account',
  '/change-email',
  '/delete-user',
];
/**
 * L4: native apps send this Origin header themselves, so the server-side
 * `expo()` plugin (and its authorization proxy, GHSA-4wq4-2ppv-q3hg) stays off.
 */
export const NATIVE_APP_ORIGIN = 'filmplatform://';
export const AUTH_BASE_PATH = '/api/auth';

export interface OutgoingAuthEmail {
  kind: 'verify-email' | 'reset-password';
  to: string;
  url: string;
  token: string;
}

/** Where auth emails go. The trial never sends real email. */
export interface AuthMailer {
  send(email: OutgoingAuthEmail): void | Promise<void>;
}

/** Prints links to the log, or appends them to a file for end-to-end tests (non-production only). */
export function createDevelopmentMailer(outboxFile?: string): AuthMailer {
  return {
    send(email) {
      if (outboxFile) {
        appendFileSync(outboxFile, `${JSON.stringify(email)}\n`);
        return;
      }
      console.warn(`[auth mail, not sent] ${email.kind} for ${email.to}: ${email.url}`);
    },
  };
}

export interface RateLimitRule {
  window: number;
  max: number;
}

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  /** Web origins allowed to call the auth API with cookies; the native origin is always added. */
  webOrigins: string[];
  mailer: AuthMailer;
  production: boolean;
  /** S3: limit for sign-in, sign-up and reset requests per IP address. */
  credentialRateLimit?: RateLimitRule;
}

export function createAuth(options: CreateAuthOptions) {
  const credentialLimit = options.credentialRateLimit ?? { window: 60, max: 5 };

  return betterAuth({
    appName: 'Film Platform',
    secret: options.secret,
    baseURL: options.baseURL,
    basePath: AUTH_BASE_PATH,
    database: drizzleAdapter(options.db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    trustedOrigins: [...options.webOrigins, NATIVE_APP_ORIGIN],
    telemetry: { enabled: false },
    advanced: {
      // Finding F1: the library skips origin/CSRF checks whenever NODE_ENV=test unless
      // this is set explicitly. Pin it, so the checks run in every environment.
      disableOriginCheck: false,
      database: { generateId: 'uuid' },
      useSecureCookies: options.production,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      // S5: account recovery revokes every existing session.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url, token }) => {
        await options.mailer.send({ kind: 'reset-password', to: user.email, url, token });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url, token }) => {
        await options.mailer.send({ kind: 'verify-email', to: user.email, url, token });
      },
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      freshAge: FRESH_AGE_SECONDS,
      // S4: every request is checked against the database; no cached session cookie.
      cookieCache: { enabled: false },
    },
    account: {
      accountLinking: {
        enabled: true,
        // S10: never link on sign-in; only explicit linking from a signed-in, fresh session.
        disableImplicitLinking: true,
        allowDifferentEmails: false,
        trustedProviders: [],
      },
    },
    user: { deleteUser: { enabled: true } },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': credentialLimit,
        '/sign-up/email': credentialLimit,
        '/request-password-reset': credentialLimit,
      },
    },
    hooks: {
      // S11: the fresh-session rule for sensitive library endpoints.
      before: createAuthMiddleware(async (ctx) => {
        if (!FRESH_SESSION_PATHS.includes(ctx.path)) return;
        const current = await getSessionFromCtx(ctx);
        if (!current?.session) {
          throw new APIError('UNAUTHORIZED', { code: 'UNAUTHORIZED', message: 'Unauthorized' });
        }
        const age = Date.now() - new Date(current.session.createdAt).getTime();
        if (age >= FRESH_AGE_SECONDS * 1000) {
          throw new APIError('FORBIDDEN', {
            code: 'SESSION_NOT_FRESH',
            message: 'Sign in again to make this change.',
          });
        }
      }),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * S5: operator security action. Revokes every session a user has, so all their
 * devices are signed out on their next request. Server-side only: run through
 * `scripts/revoke-user-sessions.ts`, never exposed over HTTP.
 */
export async function revokeAllSessionsForUser(auth: Auth, userId: string): Promise<void> {
  const context = await auth.$context;
  await context.internalAdapter.deleteUserSessions(userId);
}
