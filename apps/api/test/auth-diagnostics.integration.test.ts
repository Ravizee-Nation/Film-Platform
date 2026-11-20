// D7 trial — Android INVALID_TOKEN investigation. The server must say, safely, why a
// password link was refused: wrong code, used code or expired code. These tests pin the
// diagnostics and prove the logs never carry codes, passwords, cookies or secrets.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codeRef, codeShape } from '../src/auth-diagnostics';
import { buildApp } from '../src/app';
import {
  PASSWORD,
  createAuthTestContext,
  createVerifiedUser,
  lastEmail,
  register,
  setPassword,
  uniqueEmail,
  type AuthTestContext,
} from './auth-helpers';
import { fakeDatabase, testEnv } from './helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

const events = (name: string) => ctx.diagnostics.filter((entry) => entry.event === name);
const lastCheck = () => events('password-link.check').at(-1)!.fields;
const lastResult = () => events('password-link.result').at(-1)!.fields;

async function freshCode(label: string) {
  const email = uniqueEmail(label);
  await register(ctx, email);
  return { email, ...lastEmail(ctx, 'complete-registration', email) };
}

describe('password-link diagnostics: why a code was refused', () => {
  it('issuing a code logs its ref, which matches the email and the later check', async () => {
    const { token, ref } = await freshCode('diag-ok');
    expect(ref).toBe(codeRef(ctx.secret, token));
    expect(events('password-link.issued').at(-1)!.fields).toMatchObject({
      kind: 'complete-registration',
      ref,
    });
    expect((await setPassword(ctx, token)).statusCode).toBe(200);
    expect(lastCheck()).toMatchObject({ stage: 'valid', length: 24, ref });
    expect(lastResult()).toMatchObject({ outcome: 'accepted', status: 200, ref });
  });

  it('a mistyped code (one character wrong) is "not-found" with a different ref', async () => {
    const { token, ref } = await freshCode('diag-typo');
    const typo = `${token.slice(0, 10)}${token[10] === 'A' ? 'B' : 'A'}${token.slice(11)}`;
    expect((await setPassword(ctx, typo)).statusCode).toBe(400);
    expect(lastCheck()).toMatchObject({ stage: 'not-found', length: 24 });
    expect(lastCheck().ref).not.toBe(ref);
    expect(lastResult()).toMatchObject({ outcome: 'refused', status: 400, code: 'INVALID_TOKEN' });
    // The real code was not used up by the failed attempt.
    expect((await setPassword(ctx, token)).statusCode).toBe(200);
  });

  it('letter case matters: a wrongly capitalised code is refused, the exact one works', async () => {
    const { token } = await freshCode('diag-case');
    const flipped = token.replace(/[A-Za-z]/, (c) =>
      c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(),
    );
    expect((await setPassword(ctx, flipped)).statusCode).toBe(400);
    expect(lastCheck().stage).toBe('not-found');
    expect((await setPassword(ctx, token)).statusCode).toBe(200);
  });

  it('a dropped or extra character is "malformed", with the length reported', async () => {
    const { token } = await freshCode('diag-short');
    await setPassword(ctx, token.slice(0, 23));
    expect(lastCheck()).toMatchObject({ stage: 'malformed', length: 23 });
    await setPassword(ctx, `${token}x`);
    expect(lastCheck()).toMatchObject({ stage: 'malformed', length: 25 });
  });

  it('a used code is "not-found" on its second use, with the same ref as the first', async () => {
    const { token, ref } = await freshCode('diag-used');
    await setPassword(ctx, token);
    await setPassword(ctx, token);
    expect(lastCheck()).toMatchObject({ stage: 'not-found', ref });
  });

  it('an expired code is "expired"', async () => {
    const { token } = await freshCode('diag-expired');
    await ctx.sql`update verifications set expires_at = now() - interval '1 second'
      where identifier = ${`reset-password:${token}`}`;
    expect((await setPassword(ctx, token)).statusCode).toBe(400);
    expect(lastCheck()).toMatchObject({ stage: 'expired' });
  });

  it('a 4-minute-old code (the Android report) is valid with about 26 minutes left', async () => {
    const { token } = await freshCode('diag-4min');
    await ctx.sql`update verifications set expires_at = expires_at - interval '4 minutes'
      where identifier = ${`reset-password:${token}`}`;
    expect((await setPassword(ctx, token)).statusCode).toBe(200);
    expect(lastCheck()).toMatchObject({ stage: 'valid' });
    expect(Number(lastCheck().minutesLeft)).toBeGreaterThanOrEqual(25);
  });

  it('suppressed codes (per-address limit) are logged as suppressed, without a ref', async () => {
    const email = uniqueEmail('diag-limit');
    for (let i = 0; i < 4; i += 1) await register(ctx, email);
    const suppressed = events('password-link.suppressed').at(-1)!.fields;
    expect(suppressed).toMatchObject({
      kind: 'complete-registration',
      reason: 'per-address-limit',
    });
    expect(suppressed).not.toHaveProperty('ref');
  });
});

describe('diagnostics never expose secrets', () => {
  it('no logged field contains a code, password, cookie, email address or the auth secret', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'diag-secrets');
    const codes = ctx.outbox.map((item) => item.token);
    const forbidden = [...codes, PASSWORD, ctx.secret, cookie.split('=')[1]!, email];
    const logged = JSON.stringify(ctx.diagnostics);
    for (const value of forbidden) expect(logged).not.toContain(value);
    for (const entry of ctx.diagnostics) {
      if (typeof entry.fields.ref === 'string') expect(entry.fields.ref).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it('code shape check: only 24 letters and digits count as well-formed', () => {
    expect(codeShape(undefined)).toBe('missing');
    expect(codeShape('')).toBe('missing');
    expect(codeShape('a'.repeat(24))).toBe('well-formed');
    expect(codeShape(`${'a'.repeat(23)} `)).toBe('malformed');
    expect(codeShape('a'.repeat(23))).toBe('malformed');
  });
});

describe('request log never records link codes', () => {
  it('the app logger redacts codes in link URLs', async () => {
    const app = await buildApp({ env: testEnv, database: fakeDatabase() });
    try {
      const serializers = (
        app.log as unknown as Record<symbol, Record<string, (value: unknown) => unknown>>
      )[Symbol.for('pino.serializers')]!;
      const fake = (url: string) =>
        serializers.req!({
          method: 'GET',
          url,
          headers: { host: 'h' },
          ip: '1.2.3.4',
          socket: {},
        }) as { url: string };
      expect(fake('/api/auth/reset-password/AbCdEfGh12345678IjKl90Mn?callbackURL=%2Fx').url).toBe(
        '/api/auth/reset-password/[redacted]?callbackURL=%2Fx',
      );
      expect(fake('/api/auth/verify-email?token=eyJhbGciOi.secret.part&callbackURL=/').url).toBe(
        '/api/auth/verify-email?token=[redacted]&callbackURL=/',
      );
      expect(fake('/v1/me').url).toBe('/v1/me');
    } finally {
      await app.close();
    }
  });
});
