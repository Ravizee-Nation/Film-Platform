import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { buildError } from '@film/domain';

/**
 * Every route must declare who may call it. Undeclared routes fail at startup,
 * so access control can never be forgotten.
 */
export type RouteAccess = 'public' | 'authenticated' | { entitlement: string };

declare module 'fastify' {
  interface FastifyContextConfig {
    access?: RouteAccess;
  }
}

export class MissingRouteAccessError extends Error {
  constructor(method: string | string[], url: string) {
    super(`Route ${String(method)} ${url} has no access declaration (config.access).`);
    this.name = 'MissingRouteAccessError';
  }
}

export function registerAccessPolicy(app: FastifyInstance): void {
  app.addHook('onRoute', (route) => {
    const access = (route.config as { access?: RouteAccess } | undefined)?.access;
    if (access === undefined) {
      throw new MissingRouteAccessError(route.method, route.url);
    }
  });

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Unknown routes fall through to the not-found handler.
    if (request.is404) return;
    const access = request.routeOptions.config.access;
    if (access === 'public') return;
    // Phase 0 has no sign-in, so every non-public route is refused.
    // Phase 1 replaces this with session verification; entitlement checks follow in Phase 2.
    return reply
      .code(401)
      .send(buildError('UNAUTHENTICATED', 'Authentication required.', request.id));
  });
}
