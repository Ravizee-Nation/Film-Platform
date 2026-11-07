import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildAppOptions, type DatabaseHandle } from '../src/app';

export const testEnv: BuildAppOptions['env'] = {
  APP_ENV: 'test',
  CORS_ORIGINS: ['http://allowed.test'],
  LOG_LEVEL: 'silent',
  MIN_CLIENT_VERSION: '0.1.0',
};

export function fakeDatabase(overrides: Partial<DatabaseHandle> = {}): DatabaseHandle {
  return { ping: async () => {}, close: async () => {}, ...overrides };
}

export function createTestApp(
  options: {
    database?: DatabaseHandle;
    register?: (app: FastifyInstance) => void | Promise<void>;
  } = {},
) {
  return buildApp({
    env: testEnv,
    database: options.database ?? fakeDatabase(),
    register: options.register,
  });
}
