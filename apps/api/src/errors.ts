import type { FastifyError, FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { buildError, type ErrorCode } from '@film/domain';

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_FAILED';
  }
}

/** Sends every error in one JSON shape and never leaks stack traces. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        path: issue.instancePath,
        message: issue.message,
      }));
      return reply
        .code(400)
        .send(
          buildError(
            'VALIDATION_FAILED',
            'Request does not match the schema.',
            request.id,
            details,
          ),
        );
    }

    if (isResponseSerializationError(error)) {
      request.log.error(
        { err: error, issues: error.cause.issues },
        'response failed schema validation',
      );
      return reply
        .code(500)
        .send(buildError('INTERNAL_ERROR', 'Internal server error.', request.id));
    }

    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    if (status >= 500) {
      request.log.error({ err: error }, 'unhandled error');
      return reply
        .code(status)
        .send(buildError(codeForStatus(status), 'Internal server error.', request.id));
    }
    return reply.code(status).send(buildError(codeForStatus(status), error.message, request.id));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send(buildError('NOT_FOUND', 'Route not found.', request.id)),
  );
}
