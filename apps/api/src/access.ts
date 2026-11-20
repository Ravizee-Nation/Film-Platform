import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { buildError } from '@film/domain';
import { FRESH_AGE_SECONDS, type Auth } from './auth';

/**
 * Every route must declare who may call it. Undeclared routes fail at startup,
 * so access control can never be forgotten.
 *
 * - 'public': anyone.
 * - 'authenticated': a valid server-side session.
 * - 'recent-auth': a session created within the fresh-session window (D7 S11).
 * - { entitlement }: Phase 2; refused until entitlements exist.
 */
export type RouteAccess = 'public' | 'authenticated' | 'recent-auth' | { entitlement: string };

export interface AuthenticatedUser {
  userId: string;
  email: string;
  emailVerified: boolean;
  sessionCreatedAt: Date;
}

declare module 'fastify' {
  interface FastifyContextConfig {
    access?: RouteAccess;
  }
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export class MissingRouteAccessError extends Error {
  constructor(method: string | string[], url: string) {
    super(`Route ${String(method)} ${url} has no access declaration (config.access).`);
    this.name = 'MissingRouteAccessError';
  }
}

export function registerAccessPolicy(app: FastifyInstance, auth?: Auth): void {
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

    const refuse = () =>
      reply.code(401).send(buildError('UNAUTHENTICATED', 'Authentication required.', request.id));

    // Without an auth instance (Phase 0 behaviour) every non-public route is refused.
    if (!auth) return refuse();

    // The session is read from the database on every request (no cookie cache).
    const current = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!current) return refuse();

    request.user = {
      userId: current.user.id,
      email: current.user.email,
      emailVerified: current.user.emailVerified,
      sessionCreatedAt: new Date(current.session.createdAt),
    };

    if (access === 'recent-auth') {
      const age = Date.now() - request.user.sessionCreatedAt.getTime();
      if (age >= FRESH_AGE_SECONDS * 1000) {
        return reply.code(403).send(
          buildError('FORBIDDEN', 'Sign in again to make this change.', request.id, {
            reason: 'SESSION_NOT_FRESH',
          }),
        );
      }
      return;
    }
    if (typeof access === 'object') {
      // Entitlements arrive in Phase 2; until then no route can be entitled.
      return reply
        .code(403)
        .send(buildError('FORBIDDEN', 'This feature is not available.', request.id));
    }
  });
}
