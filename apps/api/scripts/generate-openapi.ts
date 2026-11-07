// Writes packages/contracts/openapi.json from the API's route schemas.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app';

const app = await buildApp({
  env: { APP_ENV: 'local', CORS_ORIGINS: [], LOG_LEVEL: 'silent', MIN_CLIENT_VERSION: '0.1.0' },
  database: { ping: async () => {}, close: async () => {} },
});
const spec = app.swagger();
await app.close();

const target = fileURLToPath(new URL('../../../packages/contracts/openapi.json', import.meta.url));
writeFileSync(target, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`Wrote ${target}`);
