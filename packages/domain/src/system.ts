import { z } from 'zod';

export const healthResponseSchema = z
  .object({ status: z.literal('ok') })
  .meta({ id: 'HealthResponse' });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const dependencyStatusSchema = z.enum(['ok', 'error']);

export const readyResponseSchema = z
  .object({
    status: z.enum(['ok', 'unavailable']),
    checks: z.object({ database: dependencyStatusSchema }),
  })
  .meta({ id: 'ReadyResponse' });
export type ReadyResponse = z.infer<typeof readyResponseSchema>;

export const appEnvSchema = z.enum(['local', 'test', 'staging', 'production']);
export type AppEnv = z.infer<typeof appEnvSchema>;

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'must be a semantic version like 1.2.3');

export const metaResponseSchema = z
  .object({
    apiVersion: semverSchema,
    environment: appEnvSchema,
    minimumClientVersion: semverSchema,
  })
  .meta({ id: 'MetaResponse' });
export type MetaResponse = z.infer<typeof metaResponseSchema>;

/** Returns true when `version` is at least `minimum` (both "major.minor.patch"). */
export function isVersionSupported(version: string, minimum: string): boolean {
  const parse = (v: string) => semverSchema.parse(v).split('.').map(Number);
  const a = parse(version);
  const b = parse(minimum);
  for (let i = 0; i < 3; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
}
