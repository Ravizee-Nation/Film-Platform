// D7 trial — L11 (Gate B follow-up): partial-failure recovery after a password is set,
// per-address limits on registration and recovery emails, and notification wording.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NOT_REQUESTED_NOTICE, PASSWORD_LINKS_PER_ADDRESS_PER_HOUR } from '../src/auth-email';
import {
  PASSWORD,
  WEB_ORIGIN,
  completeRegistration,
  createAuthTestContext,
  createVerifiedUser,
  lastEmail,
  register,
  setPassword,
  signIn,
  uniqueEmail,
  type AuthTestContext,
} from './auth-helpers';

let ctx: AuthTestContext;
beforeAll(async () => {
  ctx = await createAuthTestContext();
});
afterAll(async () => ctx?.close());

const requestReset = (email: string, remoteAddress?: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/auth/request-password-reset',
    headers: { origin: WEB_ORIGIN },
    remoteAddress,
    payload: { email, redirectTo: '/reset' },
  });

const emailsTo = (email: string) => ctx.outbox.filter((item) => item.to === email.toLowerCase());

const state = async (email: string) => {
  const [row] = await ctx.sql<{ verified: boolean; passwords: number }[]>`
    select u.email_verified as verified,
      (select count(*)::int from accounts a where a.user_id = u.id
        and a.provider_id = 'credential' and a.password is not null) as passwords
    from users u where u.email = ${email}`;
  return row!;
};

/** Makes the library's user update fail `times` times (or always), then restores it. */
async function failVerifiedUpdate<T>(times: number | 'always', run: () => Promise<T>): Promise<T> {
  const context = (await ctx.auth.$context) as unknown as {
    internalAdapter: { updateUser: (...args: unknown[]) => Promise<unknown> };
  };
  const original = context.internalAdapter.updateUser;
  let failures = 0;
  context.internalAdapter.updateUser = async (...args: unknown[]) => {
    if (times === 'always' || failures < times) {
      failures += 1;
      throw new Error('simulated database failure');
    }
    return original.apply(context.internalAdapter, args);
  };
  try {
    return await run();
  } finally {
    context.internalAdapter.updateUser = original;
  }
}

describe('L11 partial failure: password saved, email-verified update fails', () => {
  it('fails closed with a distinct error, then any new link finishes registration', async () => {
    const email = uniqueEmail('partial');
    await register(ctx, email);
    const { token } = lastEmail(ctx, 'complete-registration', email);

    const response = await failVerifiedUpdate('always', () => setPassword(ctx, token));
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ code: 'REGISTRATION_INCOMPLETE' });

    // The password exists, but the account is unverified: no sign-in, no session.
    expect(await state(email)).toEqual({ verified: false, passwords: 1 });
    const blocked = await signIn(ctx, email);
    expect(blocked.response.statusCode).toBe(403);
    expect(blocked.response.json().code).toBe('EMAIL_NOT_VERIFIED');
    expect(blocked.cookie).toBe('');

    // The used link stays used.
    expect((await setPassword(ctx, token)).statusCode).toBe(400);

    // Recovery: "forgot password" (or registering again) sends a fresh link.
    await requestReset(email);
    const recovery = emailsTo(email).at(-1)!;
    expect(recovery.kind).toBe('complete-registration');
    expect((await setPassword(ctx, recovery.token, 'finished-passphrase')).statusCode).toBe(200);
    expect(await state(email)).toEqual({ verified: true, passwords: 1 });
    expect((await signIn(ctx, email, 'finished-passphrase')).response.statusCode).toBe(200);
  });

  it('a single momentary failure is retried and registration completes normally', async () => {
    const email = uniqueEmail('transient');
    await register(ctx, email);
    const response = await failVerifiedUpdate(1, () => completeRegistration(ctx, email));
    expect(response.statusCode).toBe(200);
    expect(await state(email)).toEqual({ verified: true, passwords: 1 });
  });

  it('the failure leaves no session behind from before the reset', async () => {
    const { email, cookie } = await createVerifiedUser(ctx, 'partial-reset');
    await ctx.sql`update users set email_verified = false where email = ${email}`;
    await requestReset(email);
    const { token } = emailsTo(email).at(-1)!;
    await failVerifiedUpdate('always', () => setPassword(ctx, token, 'new-partial-passphrase'));
    const me = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });
});

describe('L11 per-address email limits', () => {
  it(`registration: at most ${PASSWORD_LINKS_PER_ADDRESS_PER_HOUR} links per address per hour, identical responses`, async () => {
    const email = uniqueEmail('flood');
    const responses = [];
    for (let i = 0; i < 6; i += 1) {
      responses.push(await register(ctx, email));
    }
    expect(
      new Set(responses.map((response) => `${response.statusCode} ${response.body}`)).size,
    ).toBe(1);
    expect(emailsTo(email)).toHaveLength(PASSWORD_LINKS_PER_ADDRESS_PER_HOUR);
  });

  it('recovery: the same limit applies to reset requests for one address', async () => {
    const { email } = await createVerifiedUser(ctx, 'flood-reset');
    const before = emailsTo(email).length;
    const responses = [];
    for (let i = 0; i < 6; i += 1) {
      responses.push(await requestReset(email, `10.1.0.${i}`)); // different IPs: not the IP limit
    }
    expect(new Set(responses.map((response) => response.body)).size).toBe(1);
    expect(emailsTo(email).length - before).toBe(PASSWORD_LINKS_PER_ADDRESS_PER_HOUR);
  });

  it('the limit is per address: other addresses are unaffected', async () => {
    const flooded = uniqueEmail('flooded');
    for (let i = 0; i < 5; i += 1) await register(ctx, flooded);
    const other = uniqueEmail('other');
    await register(ctx, other);
    expect(emailsTo(other)).toHaveLength(1);
  });

  it('once a link is used, its owner can get another (the limit counts unused links)', async () => {
    const email = uniqueEmail('legit');
    for (let i = 0; i < PASSWORD_LINKS_PER_ADDRESS_PER_HOUR; i += 1) await register(ctx, email);
    expect((await completeRegistration(ctx, email)).statusCode).toBe(200);
    await requestReset(email);
    expect(emailsTo(email).at(-1)!.kind).toBe('reset-password');
  });
});

describe('L11 notification wording', () => {
  it('every kind of message says what to do if it was not requested, and carries its link', async () => {
    const pending = uniqueEmail('wording-new');
    await register(ctx, pending);
    const { email: existing } = await createVerifiedUser(ctx, 'wording-existing');
    await requestReset(existing);
    await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/send-verification-email',
      headers: { origin: WEB_ORIGIN },
      payload: { email: pending },
    });

    const kinds = new Map(ctx.outbox.map((item) => [item.kind, item]));
    expect([...kinds.keys()].sort()).toEqual([
      'complete-registration',
      'reset-password',
      'verify-email',
    ]);
    for (const message of kinds.values()) {
      expect(message.text).toContain(NOT_REQUESTED_NOTICE);
      expect(message.text).toContain(message.url);
      expect(message.subject.length).toBeGreaterThan(10);
    }
    expect(kinds.get('reset-password')!.text).toContain('Your password has not changed');
    expect(kinds.get('reset-password')!.text).toContain('signs you out everywhere');
    expect(kinds.get('complete-registration')!.text).toContain('within 30 minutes');
    expect(kinds.get('complete-registration')!.text).toContain('works once');
  });

  it('no message contains the password or any secret beyond its own single-use link', () => {
    for (const message of ctx.outbox) {
      expect(message.text).not.toContain(PASSWORD);
      expect(message.text).not.toMatch(/session_token/);
    }
  });
});
