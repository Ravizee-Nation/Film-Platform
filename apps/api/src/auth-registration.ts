// D7 PROOF OF CONCEPT (branch poc/d7-better-auth; never merged).
// F11 fix: verify-first registration, as a Better Auth plugin.
//
// Registration takes an email only. It creates a pending account with no password and
// sends the inbox owner the library's own single-use, short-lived password link
// (the reset-password flow). A password, and so a session, can only be set by whoever
// opens that link, and our onPasswordReset callback then marks the email verified.
// Email-and-password sign-up stays disabled, so no other route can attach a password
// to an unverified address.
//
// Before any link is issued, the account gets an email-and-password identity with NO
// password (a placeholder the library treats like a wrong password). Redeeming a link
// then only ever updates that row. Without it, two links redeemed at the same moment
// both try to insert the identity and one fails with a server error (the library
// checks, then inserts).
import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint, createAuthMiddleware, requestPasswordReset } from 'better-auth/api';
import * as z from 'zod';

export const REGISTRATION_PATH = '/register/email';

/** The one response every registration request gets, whatever the address's state. */
export const REGISTRATION_RESPONSE = {
  status: true,
  message: 'If this address can be registered, we have emailed it a link to continue.',
} as const;

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  ('code' in error ? (error as { code?: string }).code === '23505' : false);

interface IdentityAdapter {
  findUserByEmail(email: string): Promise<{ user: { id: string } } | null>;
  findCredentialAccount(userId: string): Promise<unknown>;
  createAccount(account: {
    userId: string;
    providerId: string;
    accountId: string;
    password: null;
  }): Promise<unknown>;
}

/** Makes sure the user has an email-and-password identity row (with no password yet). */
async function ensurePasswordPlaceholder(adapter: IdentityAdapter, email: string) {
  const found = await adapter.findUserByEmail(email);
  if (!found || (await adapter.findCredentialAccount(found.user.id))) return;
  try {
    await adapter.createAccount({
      userId: found.user.id,
      providerId: 'credential',
      accountId: found.user.id,
      password: null,
    });
  } catch (error) {
    if (!isUniqueViolation(error) && !isUniqueViolation((error as { cause?: unknown })?.cause)) {
      throw error;
    }
  }
}

export function verifyFirstRegistration(): BetterAuthPlugin {
  return {
    id: 'verify-first-registration',
    endpoints: {
      registerEmail: createAuthEndpoint(
        REGISTRATION_PATH,
        {
          method: 'POST',
          body: z.object({
            email: z.email(),
            name: z.string().max(200).optional(),
            redirectTo: z.string().optional(),
          }),
        },
        async (ctx) => {
          const email = ctx.body.email.trim().toLowerCase();
          const { internalAdapter } = ctx.context;

          if (!(await internalAdapter.findUserByEmail(email))) {
            try {
              await internalAdapter.createUser(
                { email, name: ctx.body.name?.trim() ?? '', emailVerified: false },
                { method: 'email-password' },
              );
            } catch (error) {
              // A simultaneous registration created it first: carry on as for an
              // existing address. Anything else is a real failure.
              if (
                !isUniqueViolation(error) &&
                !isUniqueViolation((error as { cause?: unknown })?.cause)
              ) {
                throw error;
              }
            }
          }

          await ensurePasswordPlaceholder(internalAdapter as unknown as IdentityAdapter, email);

          // New, pending and existing accounts all get the library's single-use link.
          // For an existing verified account this is an ordinary reset email: nothing
          // about the account changes unless its owner opens the link.
          await requestPasswordReset({
            ...ctx,
            body: { email, redirectTo: ctx.body.redirectTo },
          } as unknown as Parameters<typeof requestPasswordReset>[0]);

          return ctx.json(REGISTRATION_RESPONSE);
        },
      ),
    },
    hooks: {
      before: [
        {
          // The library's own reset request issues the same kind of link.
          matcher: (context) => context.path === '/request-password-reset',
          handler: createAuthMiddleware(async (ctx) => {
            const email = (ctx.body as { email?: unknown } | undefined)?.email;
            if (typeof email !== 'string') return;
            await ensurePasswordPlaceholder(
              ctx.context.internalAdapter as unknown as IdentityAdapter,
              email.trim().toLowerCase(),
            );
          }),
        },
      ],
    },
  };
}
