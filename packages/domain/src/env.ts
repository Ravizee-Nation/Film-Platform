import { z } from 'zod';
import { appEnvSchema } from './system';

const commaList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

/** Server environment. The API refuses to start if this does not parse. */
export const apiEnvSchema = z.object({
  APP_ENV: appEnvSchema,
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CORS_ORIGINS: commaList,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MIN_CLIENT_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .default('0.1.0'),
  // D7 proof of concept: Better Auth settings.
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters; generate one with `openssl rand -base64 32`'),
  AUTH_BASE_URL: z.url().default('http://localhost:4000'),
  /** Non-production only: append outgoing auth emails to this file instead of printing them. */
  AUTH_TEST_OUTBOX_FILE: z.string().optional(),
});
export type ApiEnv = z.infer<typeof apiEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

export function parseApiEnv(source: Record<string, string | undefined>): ApiEnv {
  const result = apiEnvSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}
