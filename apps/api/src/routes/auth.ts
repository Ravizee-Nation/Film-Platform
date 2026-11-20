// D7 PROOF OF CONCEPT: mounts Better Auth's handler under /api/auth.
import type { FastifyInstance } from 'fastify';
import { AUTH_BASE_PATH, type Auth } from '../auth';

// Hop-by-hop or body-length headers that no longer match once the body is re-encoded.
const DROPPED_REQUEST_HEADERS = new Set([
  'content-length',
  'transfer-encoding',
  'connection',
  'x-forwarded-for',
]);

/**
 * Converts the Fastify request into a standard Request for Better Auth, and its
 * Response back. Library endpoints answer with the library's own error format
 * ({ code, message }), a documented exception to our standard error shape.
 */
export async function authRoutes(app: FastifyInstance, options: { auth: Auth }) {
  app.route({
    method: ['GET', 'POST'],
    url: `${AUTH_BASE_PATH}/*`,
    // Authentication endpoints are public by nature; the library enforces its own session rules.
    config: { access: 'public' },
    schema: { hide: true },
    handler: async (request, reply) => {
      const url = new URL(request.url, options.auth.options.baseURL);
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (value === undefined || DROPPED_REQUEST_HEADERS.has(name)) continue;
        headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
      }
      // Rate limiting keys on this. Use the socket address Fastify saw, never a client-supplied header.
      headers.set('x-forwarded-for', request.ip);

      const hasBody =
        request.method !== 'GET' && request.body !== undefined && request.body !== null;
      const response = await options.auth.handler(
        new Request(url, {
          method: request.method,
          headers,
          body: hasBody ? JSON.stringify(request.body) : undefined,
        }),
      );

      reply.status(response.status);
      response.headers.forEach((value, name) => {
        if (name !== 'set-cookie') reply.header(name, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header('set-cookie', cookies);
      const text = await response.text();
      return reply.send(text.length > 0 ? text : null);
    },
  });
}
