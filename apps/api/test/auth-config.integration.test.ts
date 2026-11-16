// D7 trial — L9: the security configuration and pinned versions are exactly as approved.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { BetterAuthOptions } from 'better-auth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FRESH_AGE_SECONDS,
  FRESH_SESSION_PATHS,
  NATIVE_APP_ORIGIN,
  PASSWORD_LINK_EXPIRES_IN_SECONDS,
} from '../src/auth';
import { WEB_ORIGIN, createAuthTestContext, type AuthTestContext } from './auth-helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

const root = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const APPROVED_VERSION = '1.7.25';

describe('L9 configuration under test', () => {
  it('sessions: database-backed, no cookie cache, 30-day sliding expiry, 15-minute fresh window', () => {
    const { session } = ctx.auth.options;
    expect(session?.cookieCache?.enabled).toBe(false);
    expect(session?.expiresIn).toBe(60 * 60 * 24 * 30);
    expect(session?.updateAge).toBe(60 * 60 * 24);
    expect(session?.freshAge).toBe(FRESH_AGE_SECONDS);
    expect(FRESH_AGE_SECONDS).toBe(15 * 60);
    expect(FRESH_SESSION_PATHS).toEqual([
      '/link-social',
      '/unlink-account',
      '/change-email',
      '/delete-user',
    ]);
  });

  it('account linking: implicit linking disabled, no trusted providers, no different emails', () => {
    const linking = ctx.auth.options.account?.accountLinking;
    expect(linking?.disableImplicitLinking).toBe(true);
    expect(linking?.allowDifferentEmails).toBe(false);
    expect(linking?.trustedProviders).toEqual([]);
  });

  it('origin and CSRF checks are pinned on (not left to NODE_ENV)', () => {
    expect(ctx.auth.options.advanced?.disableOriginCheck).toBe(false);
    const advanced: BetterAuthOptions['advanced'] = ctx.auth.options.advanced;
    expect(advanced?.disableCSRFCheck).toBeUndefined();
    expect(ctx.auth.options.trustedOrigins).toEqual([WEB_ORIGIN, NATIVE_APP_ORIGIN]);
  });

  it('email and password: verification required, recovery revokes sessions, minimum length 10', () => {
    const { emailAndPassword } = ctx.auth.options;
    expect(emailAndPassword?.requireEmailVerification).toBe(true);
    // F11: no password at registration; links are single-use and live 30 minutes.
    expect(emailAndPassword?.disableSignUp).toBe(true);
    expect(emailAndPassword?.resetPasswordTokenExpiresIn).toBe(PASSWORD_LINK_EXPIRES_IN_SECONDS);
    expect(PASSWORD_LINK_EXPIRES_IN_SECONDS).toBe(30 * 60);
    expect(emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);
    expect(emailAndPassword?.minPasswordLength).toBe(10);
  });

  it('rate limiting is on with database storage; telemetry is off', () => {
    expect(ctx.auth.options.rateLimit?.enabled).toBe(true);
    expect(ctx.auth.options.rateLimit?.storage).toBe('database');
    expect(ctx.auth.options.telemetry?.enabled).toBe(false);
  });

  it('only the verify-first registration plugin: no server expo() plugin, no excluded plugins', () => {
    const options: BetterAuthOptions = ctx.auth.options;
    expect((options.plugins ?? []).map((plugin) => plugin.id)).toEqual([
      'verify-first-registration',
    ]);
  });

  it(`better-auth and @better-auth/expo are pinned exactly to ${APPROVED_VERSION}`, () => {
    const pkg = (name: string) => JSON.parse(readFileSync(root(`${name}/package.json`), 'utf8'));
    expect(pkg('apps/api').dependencies['better-auth']).toBe(APPROVED_VERSION);
    expect(pkg('apps/web').dependencies['better-auth']).toBe(APPROVED_VERSION);
    expect(pkg('apps/mobile').dependencies['better-auth']).toBe(APPROVED_VERSION);
    expect(pkg('apps/mobile').dependencies['@better-auth/expo']).toBe(APPROVED_VERSION);

    const lock = readFileSync(root('pnpm-lock.yaml'), 'utf8');
    const resolved = [
      ...lock.matchAll(
        /^ {2}'?(better-auth|@better-auth\/(?:expo|core))@(\d+\.\d+\.\d+[^(:'\s]*)/gm,
      ),
    ].map((match) => `${match[1]}@${match[2]}`);
    expect(new Set(resolved)).toEqual(
      new Set([
        `better-auth@${APPROVED_VERSION}`,
        `@better-auth/expo@${APPROVED_VERSION}`,
        `@better-auth/core@${APPROVED_VERSION}`,
      ]),
    );
  });
});
