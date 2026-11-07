import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { healthResponseSchema, metaResponseSchema, readyResponseSchema } from '@film/domain';
import { withErrorResponses } from '../schemas';

export interface SystemRouteOptions {
  apiVersion: string;
  environment: 'local' | 'test' | 'staging' | 'production';
  minimumClientVersion: string;
  pingDatabase: () => Promise<void>;
}

export const systemRoutes: FastifyPluginAsyncZod<SystemRouteOptions> = async (app, options) => {
  app.get(
    '/health',
    {
      config: { access: 'public' },
      schema: {
        operationId: 'getHealth',
        tags: ['system'],
        summary: 'Liveness: the process is up. Checks no dependencies.',
        response: withErrorResponses({ 200: healthResponseSchema }),
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  app.get(
    '/ready',
    {
      config: { access: 'public' },
      schema: {
        operationId: 'getReady',
        tags: ['system'],
        summary: 'Readiness: the API can serve traffic (database reachable).',
        response: withErrorResponses({ 200: readyResponseSchema, 503: readyResponseSchema }),
      },
    },
    async (request, reply) => {
      try {
        await options.pingDatabase();
        return { status: 'ok' as const, checks: { database: 'ok' as const } };
      } catch (error) {
        request.log.warn({ err: error }, 'readiness check failed: database');
        return reply.code(503).send({ status: 'unavailable', checks: { database: 'error' } });
      }
    },
  );

  app.get(
    '/v1/meta',
    {
      config: { access: 'public' },
      schema: {
        operationId: 'getMeta',
        tags: ['system'],
        summary: 'API version and the minimum client version allowed to connect.',
        response: withErrorResponses({ 200: metaResponseSchema }),
      },
    },
    async () => ({
      apiVersion: options.apiVersion,
      environment: options.environment,
      minimumClientVersion: options.minimumClientVersion,
    }),
  );
};
