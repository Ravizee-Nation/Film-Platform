// D7 PROOF OF CONCEPT: the smallest protected route, used to prove that every
// client (web, iOS, Android) resolves to the same user through a server-side session.
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { meResponseSchema } from '@film/domain';
import { withErrorResponses } from '../schemas';

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/v1/me',
    {
      config: { access: 'authenticated' },
      schema: {
        operationId: 'getMe',
        tags: ['identity'],
        summary: 'The signed-in user. Requires a valid server-side session.',
        response: withErrorResponses({ 200: meResponseSchema }),
      },
    },
    async (request) => {
      // The access policy guarantees `request.user` for authenticated routes.
      const user = request.user!;
      return { userId: user.userId, email: user.email, emailVerified: user.emailVerified };
    },
  );
};
