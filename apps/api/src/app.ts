import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { ApiEnv } from '@film/domain';
import packageJson from '../package.json' with { type: 'json' };
import { registerAccessPolicy } from './access';
import type { Auth } from './auth';
import { authRoutes } from './routes/auth';
import { meRoutes } from './routes/me';
import { registerErrorHandling } from './errors';
import { systemRoutes } from './routes/system';
import { serializeRequest } from './logging';

export interface DatabaseHandle {
  ping(): Promise<void>;
  close(): Promise<void>;
}

export interface BuildAppOptions {
  env: Pick<ApiEnv, 'APP_ENV' | 'CORS_ORIGINS' | 'LOG_LEVEL' | 'MIN_CLIENT_VERSION'>;
  database: DatabaseHandle;
  /** D7 proof of concept: Better Auth. Without it every non-public route is refused (Phase 0 behaviour). */
  auth?: Auth;
  /** Extra routes, used by tests to exercise the access policy. */
  register?: (app: FastifyInstance) => void | Promise<void>;
}

export const API_VERSION = packageJson.version;
export const BODY_LIMIT_BYTES = 1_048_576;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export async function buildApp({ env, database, auth, register }: BuildAppOptions) {
  const app = Fastify({
    bodyLimit: BODY_LIMIT_BYTES,
    requestIdHeader: false,
    genReqId: (request) => {
      const incoming = request.headers['x-request-id'];
      return typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
        ? incoming
        : randomUUID();
    },
    logger: {
      level: env.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      serializers: { req: serializeRequest },
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  app.addHook('onClose', async () => {
    await database.close();
  });

  registerErrorHandling(app);

  await app.register(helmet);
  // @fastify/cors adds an internal `OPTIONS *` preflight route, so it is
  // registered before the access policy starts checking route declarations.
  await app.register(cors, {
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
    // Browsers send the session cookie cross-origin (web on :3000, API on :4000) only with credentials.
    credentials: true,
  });
  registerAccessPolicy(app, auth);
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Film Platform API',
        version: API_VERSION,
        description: 'The single API shared by the iOS, Android and web clients.',
      },
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(systemRoutes, {
    apiVersion: API_VERSION,
    environment: env.APP_ENV,
    minimumClientVersion: env.MIN_CLIENT_VERSION,
    pingDatabase: () => database.ping(),
  });
  await app.register(meRoutes);
  if (auth) await app.register(authRoutes, { auth });

  if (register) await register(app);

  await app.ready();
  return app;
}
