// D7 trial — L4 mobile session (client side). Proves the native client keeps its
// session in SecureStore, sends Origin: filmplatform:// and never browser cookies.
const mockMemory = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItem: (key: string) => mockMemory.get(key) ?? null,
  setItem: (key: string, value: string) => void mockMemory.set(key, value),
  getItemAsync: async (key: string) => mockMemory.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void mockMemory.set(key, value),
  deleteItemAsync: async (key: string) => void mockMemory.delete(key),
}));
// Jest has no Expo app manifest; the plugin only uses createURL to build callback URLs.
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `filmplatform://${path.replace(/^\//, '')}`,
}));

import type * as AuthClientModule from '../auth-client';
import type * as SecureStoreModule from 'expo-secure-store';

type FakeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// The client captures the global fetch when it is created, so install a delegating
// fake before loading it, and point the delegate at each test's implementation.
let fetchImpl: FakeFetch = async () => {
  throw new Error('no fetch implementation for this test');
};
const realFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
let client: typeof AuthClientModule;
let SecureStore: typeof SecureStoreModule;

beforeAll(() => {
  Object.defineProperty(globalThis, 'fetch', {
    value: (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init),
    configurable: true,
    writable: true,
  });
  // Loaded here, after the fake fetch exists (a static import would load it first).
  /* eslint-disable @typescript-eslint/no-require-imports */
  client = require('../auth-client') as typeof AuthClientModule;
  SecureStore = require('expo-secure-store') as typeof SecureStoreModule;
  /* eslint-enable @typescript-eslint/no-require-imports */
});

afterAll(() => {
  if (realFetch) Object.defineProperty(globalThis, 'fetch', realFetch);
});

afterEach(() => mockMemory.clear());

interface SeenRequest {
  url: string;
  headers: Headers;
  credentials?: RequestCredentials;
}

function recordRequests(respond: (url: string) => Response): SeenRequest[] {
  const seen: SeenRequest[] = [];
  fetchImpl = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    seen.push({ url, headers: new Headers(init?.headers), credentials: init?.credentials });
    return respond(url);
  };
  return seen;
}

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });

describe('mobile auth client', () => {
  it('keeps the session only in SecureStore, with the client session cache off', () => {
    const { storage } = client.expoClientOptions;
    expect(storage.getItem).toBe(SecureStore.getItem);
    expect(storage.setItem).toBe(SecureStore.setItem);
    expect(client.expoClientOptions.disableCache).toBe(true);
    expect(client.expoClientOptions.scheme).toBe('filmplatform');
  });

  it('uses the native origin the server trusts (and the app scheme)', () => {
    expect(client.NATIVE_APP_ORIGIN).toBe(`${client.expoClientOptions.scheme}://`);
  });

  it('sends Origin: filmplatform:// and never browser credentials on auth requests', async () => {
    const seen = recordRequests(() => json(null));
    await client.authClient.getSession();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toContain('/api/auth/get-session');
    expect(seen[0]!.headers.get('origin')).toBe(client.NATIVE_APP_ORIGIN);
    // The client plugin always adds expo-origin too; the server ignores it because its
    // expo() plugin is off (asserted in apps/api auth-sessions L4 tests).
    expect(seen[0]!.headers.get('expo-origin')).toBe(client.NATIVE_APP_ORIGIN);
    expect(seen[0]!.credentials).toBe('omit');
  });

  it('stores the cookie returned at sign-in in SecureStore and sends it back', async () => {
    const seen = recordRequests((url) =>
      url.includes('/sign-in/')
        ? json(
            { token: 't', user: { id: 'u', email: 'a@example.test' } },
            {
              'set-cookie': 'better-auth.session_token=abc123.sig; Path=/; HttpOnly; SameSite=Lax',
            },
          )
        : json(null),
    );
    await client.authClient.signIn.email({
      email: 'a@example.test',
      password: 'correct-horse-battery-staple',
    });
    expect([...mockMemory.values()].join(' ')).toContain('abc123.sig');
    expect(await client.authClient.getCookie()).toContain('better-auth.session_token=abc123.sig');

    await client.authClient.getSession();
    const last = seen.at(-1)!;
    expect(last.url).toContain('/api/auth/get-session');
    expect(last.headers.get('cookie')).toContain('better-auth.session_token=abc123.sig');
    expect(last.headers.get('origin')).toBe(client.NATIVE_APP_ORIGIN);
  });

  it('signing out clears the stored cookie', async () => {
    recordRequests((url) =>
      url.includes('/sign-in/')
        ? json(
            { token: 't', user: { id: 'u', email: 'a@example.test' } },
            { 'set-cookie': 'better-auth.session_token=abc123.sig; Path=/' },
          )
        : url.includes('/sign-out')
          ? json(
              { success: true },
              { 'set-cookie': 'better-auth.session_token=; Max-Age=0; Path=/' },
            )
          : json(null),
    );
    await client.authClient.signIn.email({
      email: 'a@example.test',
      password: 'correct-horse-battery-staple',
    });
    await client.authClient.signOut();
    expect(await client.authClient.getCookie()).not.toContain('abc123.sig');
  });

  it('fetchMe sends the stored session cookie to the protected /v1/me route', async () => {
    const seen = recordRequests((url) =>
      url.includes('/sign-in/')
        ? json(
            { token: 't', user: { id: 'u', email: 'a@example.test' } },
            { 'set-cookie': 'better-auth.session_token=abc123.sig; Path=/' },
          )
        : json({ userId: 'u', email: 'a@example.test', emailVerified: true }),
    );
    await client.authClient.signIn.email({
      email: 'a@example.test',
      password: 'correct-horse-battery-staple',
    });
    expect(await client.fetchMe()).toEqual({ status: 200, email: 'a@example.test' });
    const last = seen.at(-1)!;
    expect(last.url).toMatch(/\/v1\/me$/);
    expect(last.headers.get('cookie')).toContain('better-auth.session_token=abc123.sig');
    expect(last.credentials).toBe('omit');
  });

  it('recovery: the reset request and the new password go to the API with the native origin', async () => {
    const seen = recordRequests(() => json({ status: true }));
    await client.authClient.requestPasswordReset({ email: 'a@example.test', redirectTo: '/reset' });
    await client.authClient.resetPassword({
      token: 'reset-token',
      newPassword: 'a-new-passphrase',
    });
    expect(seen.map((request) => new URL(request.url).pathname)).toEqual([
      '/api/auth/request-password-reset',
      '/api/auth/reset-password',
    ]);
    expect(
      seen.every((request) => request.headers.get('origin') === client.NATIVE_APP_ORIGIN),
    ).toBe(true);
  });

  it('registration sends the email only (no password) with the native origin', async () => {
    const seen: { url: string; body: string; origin: string | null }[] = [];
    fetchImpl = async (input, init) => {
      seen.push({
        url: input instanceof Request ? input.url : String(input),
        body: String(init?.body ?? ''),
        origin: new Headers(init?.headers).get('origin'),
      });
      return json({ status: true, message: 'ok' });
    };
    await client.requestRegistration(' new@example.test ');
    expect(new URL(seen[0]!.url).pathname).toBe('/api/auth/register/email');
    expect(JSON.parse(seen[0]!.body)).toEqual({
      email: 'new@example.test',
      redirectTo: '/complete-registration',
    });
    expect(seen[0]!.origin).toBe(client.NATIVE_APP_ORIGIN);
  });

  it('reset codes: spaces from the grouped display are removed; letter case is kept', async () => {
    expect(client.normalizeResetCode(' AbCd eF12 \n3456 ')).toBe('AbCdeF123456');
    const seen = recordRequests(() => json({ status: true }));
    await client.submitResetCode('AbCd EfGh 1234 5678 IjKl 90Mn', 'a-new-passphrase');
    expect(new URL(seen[0]!.url).pathname).toBe('/api/auth/reset-password');
    expect(seen[0]!.headers.get('origin')).toBe(client.NATIVE_APP_ORIGIN);
  });

  it('reset codes: the submitted body carries exactly the normalized code', async () => {
    const bodies: string[] = [];
    fetchImpl = async (_input, init) => {
      bodies.push(String(init?.body ?? ''));
      return json({ status: true });
    };
    await client.submitResetCode('AbCd EfGh 1234 5678 IjKl 90Mn', 'a-new-passphrase');
    expect(JSON.parse(bodies[0]!)).toEqual({
      token: 'AbCdEfGh12345678IjKl90Mn',
      newPassword: 'a-new-passphrase',
    });
    expect(client.RESET_CODE_LENGTH).toBe(24);
  });
});
