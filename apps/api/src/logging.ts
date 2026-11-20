// Request-log hygiene. Password and verification links carry single-use codes in their
// URLs (/api/auth/reset-password/<code>, /api/auth/verify-email?token=<code>); the
// request log must never contain them.
import type { FastifyRequest } from 'fastify';

export function redactSecretsInUrl(url: string): string {
  return url
    .replace(/(\/reset-password\/)[^/?#]+/g, '$1[redacted]')
    .replace(/([?&](?:token|code)=)[^&#]*/gi, '$1[redacted]');
}

/** Fastify's default request fields, with the URL redacted. */
export function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: redactSecretsInUrl(request.url),
    host: request.headers?.host,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort,
  };
}
