import { createDatabase } from '@film/db';
import { EnvValidationError, parseApiEnv } from '@film/domain';
import { buildApp } from './app';

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

const app = await buildApp({ env, database: createDatabase(env.DATABASE_URL) });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: env.HOST, port: env.PORT });
