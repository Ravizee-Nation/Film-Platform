import { errorResponseSchema } from '@film/domain';

/** Adds the shared error shape for every 4xx/5xx a route does not define itself. */
export function withErrorResponses<T extends Record<number, unknown>>(responses: T) {
  return { ...responses, '4xx': errorResponseSchema, '5xx': errorResponseSchema };
}
