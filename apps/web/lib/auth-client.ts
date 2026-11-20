// D7 PROOF OF CONCEPT: browser client for Better Auth. The session lives in an
// HttpOnly cookie set by the API; page scripts never see it.
import { createAuthClient } from 'better-auth/react';

export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const authClient = createAuthClient({
  baseURL: PUBLIC_API_URL,
  fetchOptions: { credentials: 'include' },
});
