// D7 PROOF OF CONCEPT: Better Auth client for iOS and Android.
// - The session cookie is kept only in SecureStore (iOS Keychain / Android Keystore).
// - The client's session cache is off for the trial (S4), so every check hits the server.
// - The app sends its own Origin header, so the server-side expo() plugin (and its
//   authorization proxy, GHSA-4wq4-2ppv-q3hg) is not needed and stays off.
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { apiBaseUrl } from './api';

export const NATIVE_APP_ORIGIN = 'filmplatform://';

export const expoClientOptions = {
  scheme: 'filmplatform',
  storagePrefix: 'filmplatform',
  storage: SecureStore,
  disableCache: true,
};

export const authClient = createAuthClient({
  baseURL: apiBaseUrl(),
  fetchOptions: { headers: { origin: NATIVE_APP_ORIGIN } },
  plugins: [expoClient(expoClientOptions)],
});

/** Calls the protected /v1/me route with the stored session cookie. */
export async function fetchMe(): Promise<{ status: number; email?: string }> {
  const cookie = await authClient.getCookie();
  const response = await fetch(`${apiBaseUrl()}/v1/me`, {
    credentials: 'omit',
    headers: cookie ? { cookie } : {},
  });
  if (!response.ok) return { status: response.status };
  return { status: response.status, email: ((await response.json()) as { email: string }).email };
}

/**
 * Verify-first registration (F11): email only. The inbox owner sets the password from
 * the emailed link (Reset code + Set new password on the trial screen).
 */
export async function requestRegistration(email: string) {
  return authClient.$fetch<{ status: boolean; message: string }>('/register/email', {
    method: 'POST',
    body: { email: email.trim(), redirectTo: '/complete-registration' },
  });
}

/** Registration and reset codes are 24 letters and digits. Letter case matters. */
export const RESET_CODE_LENGTH = 24;

/** The API log shows codes in groups of four; spaces are not part of the code. */
export const normalizeResetCode = (code: string) => code.replace(/\s+/g, '');

/** Sets a password with a registration or reset code. */
export async function submitResetCode(code: string, newPassword: string) {
  return authClient.resetPassword({ token: normalizeResetCode(code), newPassword });
}
