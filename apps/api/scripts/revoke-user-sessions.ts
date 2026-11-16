// D7 proof of concept: operator security action (S5). Signs a user out of every device.
// Usage: pnpm --filter @film/api auth:revoke-user <user-id>
import { createDatabase } from '@film/db';
import { parseApiEnv } from '@film/domain';
import { createAuth, createDevelopmentMailer, revokeAllSessionsForUser } from '../src/auth';

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: auth:revoke-user <user-id>');
  process.exit(1);
}

const env = parseApiEnv(process.env);
const database = createDatabase(env.DATABASE_URL, { max: 1 });
const auth = createAuth({
  db: database.db,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.AUTH_BASE_URL,
  webOrigins: env.CORS_ORIGINS,
  mailer: createDevelopmentMailer(),
  production: env.APP_ENV === 'production',
});
await revokeAllSessionsForUser(auth, userId);
console.log(`Revoked every session for user ${userId}.`);
await database.close();
