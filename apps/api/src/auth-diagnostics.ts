// D7 PROOF OF CONCEPT (branch poc/d7-better-auth; never merged).
// Safe diagnostics for password links (registration and recovery).
//
// Logged: the validation stage, the submitted code's length, and a "ref", the first 8
// hex characters of an HMAC of the code keyed with the auth secret. A ref lets a tester
// match the code a phone submitted against the code that was issued, without the log
// holding anything that can be used or reversed. Never logged: codes, passwords,
// cookies, secrets.
import { createHmac } from 'node:crypto';
import type { BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';

/** Better Auth issues 24-character alphanumeric codes (generateId(24)). */
export const PASSWORD_LINK_CODE_LENGTH = 24;

export type AuthDiagnosticFields = Record<string, string | number | boolean | undefined>;
export type AuthDiagnosticsLog = (event: string, fields: AuthDiagnosticFields) => void;

/** One JSON line per event in the API terminal (stderr, as the repository lint rules require). */
export const consoleDiagnostics: AuthDiagnosticsLog = (event, fields) => {
  console.warn(JSON.stringify({ auth: event, ...fields }));
};

export function codeRef(secret: string, code: string): string {
  return createHmac('sha256', secret).update(code).digest('hex').slice(0, 8);
}

export type CodeStage = 'missing' | 'malformed' | 'not-found' | 'expired' | 'valid';

/** Classifies a submitted code by its shape, before any lookup. */
export function codeShape(code: unknown): 'missing' | 'malformed' | 'well-formed' {
  if (typeof code !== 'string' || code.length === 0) return 'missing';
  return code.length === PASSWORD_LINK_CODE_LENGTH && /^[A-Za-z0-9]+$/.test(code)
    ? 'well-formed'
    : 'malformed';
}

interface VerificationReader {
  findOne(query: {
    model: string;
    where: { field: string; value: string }[];
  }): Promise<{ expiresAt: Date | string } | null>;
}

export function passwordLinkDiagnostics(secret: string, log: AuthDiagnosticsLog): BetterAuthPlugin {
  const submitted = (ctx: { body?: unknown; query?: unknown }) =>
    (ctx.body as { token?: unknown } | undefined)?.token ??
    (ctx.query as { token?: unknown } | undefined)?.token;

  return {
    id: 'password-link-diagnostics',
    hooks: {
      before: [
        {
          matcher: (context) => context.path === '/reset-password',
          handler: createAuthMiddleware(async (ctx) => {
            const code = submitted(ctx);
            const shape = codeShape(code);
            const fields: AuthDiagnosticFields = {
              length: typeof code === 'string' ? code.length : 0,
              ref: typeof code === 'string' && code ? codeRef(secret, code) : undefined,
            };
            let stage: CodeStage = shape === 'well-formed' ? 'valid' : shape;
            if (shape === 'well-formed') {
              // A read only: the library still validates and consumes the code itself.
              const row = await (ctx.context.adapter as unknown as VerificationReader).findOne({
                model: 'verification',
                where: [{ field: 'identifier', value: `reset-password:${code as string}` }],
              });
              if (!row) stage = 'not-found';
              else {
                const msLeft = new Date(row.expiresAt).getTime() - Date.now();
                stage = msLeft <= 0 ? 'expired' : 'valid';
                fields.minutesLeft = Math.max(0, Math.floor(msLeft / 60_000));
              }
            }
            log('password-link.check', { stage, ...fields });
          }),
        },
      ],
      after: [
        {
          matcher: (context) => context.path === '/reset-password',
          handler: createAuthMiddleware(async (ctx) => {
            const code = submitted(ctx);
            const returned = ctx.context.returned as
              { statusCode?: number; body?: { code?: string } } | undefined;
            const failed = typeof returned?.statusCode === 'number' && returned.statusCode >= 400;
            log('password-link.result', {
              outcome: failed ? 'refused' : 'accepted',
              status: failed ? returned!.statusCode : 200,
              code: failed ? returned?.body?.code : undefined,
              ref: typeof code === 'string' && code ? codeRef(secret, code) : undefined,
            });
          }),
        },
      ],
    },
  };
}
