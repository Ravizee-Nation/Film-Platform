import createClient, { type ClientOptions } from 'openapi-fetch';
import type { components, paths } from './schema';

export type { components, paths } from './schema';
export type ApiSchemas = components['schemas'];
export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Typed client for the Film Platform API. Generated types come from the
 * committed OpenAPI spec, so a server change that breaks clients fails CI.
 */
export function createApiClient(baseUrl: string, options: Omit<ClientOptions, 'baseUrl'> = {}) {
  return createClient<paths>({ ...options, baseUrl });
}
