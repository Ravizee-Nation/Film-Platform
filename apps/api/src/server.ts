import { createDatabase } from '@film/db';
import { EnvValidationError, parseApiEnv } from '@film/domain';
import { buildApp } from './app';
import { createAuth, createDevelopmentMailer } from './auth';

let env;
try {
  env = parseApiEnv(process.env);
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

const database = createDatabase(env.DATABASE_URL);
const production = env.APP_ENV === 'production';
const auth = createAuth({
  db: database.db,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.AUTH_BASE_URL,
  webOrigins: env.CORS_ORIGINS,
  // The D7 trial never sends real email; a file outbox exists only outside production.
  mailer: createDevelopmentMailer(production ? undefined : env.AUTH_TEST_OUTBOX_FILE),
  production,
});
const app = await buildApp({ env, database, auth });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: env.HOST, port: env.PORT });
