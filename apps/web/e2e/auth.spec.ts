// D7 trial — L3 web session in a real browser.
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { AUTH_OUTBOX_FILE } from '../playwright.config';

const API = 'http://localhost:4000';
const WEB_ORIGIN = 'http://localhost:3000';
const PASSWORD = 'correct-horse-battery-staple';

/** The token from the latest complete-registration link sent to this address. */
function registrationToken(email: string): string {
  if (!existsSync(AUTH_OUTBOX_FILE)) throw new Error('no auth outbox file');
  const emails = readFileSync(AUTH_OUTBOX_FILE, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { kind: string; to: string; token: string });
  const match = emails
    .reverse()
    .find((item) => item.kind === 'complete-registration' && item.to === email);
  if (!match) throw new Error(`no registration email for ${email}`);
  return match.token;
}

test('web session: HttpOnly cookie, scripts cannot read it, sign-out ends it', async ({
  page,
  request,
  context,
}) => {
  const email = `browser-${randomUUID().slice(0, 8)}@example.test`;
  // Verify-first registration: email only, then the password from the emailed link.
  const register = await request.post(`${API}/api/auth/register/email`, {
    headers: { origin: WEB_ORIGIN },
    data: { email, name: 'Browser Test', redirectTo: '/complete-registration' },
  });
  expect(register.ok()).toBe(true);
  await expect
    .poll(() => {
      try {
        return registrationToken(email);
      } catch {
        return '';
      }
    })
    .not.toBe('');
  const complete = await request.post(`${API}/api/auth/reset-password`, {
    headers: { origin: WEB_ORIGIN },
    data: { token: registrationToken(email), newPassword: PASSWORD },
  });
  expect(complete.ok()).toBe(true);

  await page.goto('/poc/auth');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('status')).toHaveText('Signed in');

  await page.getByRole('button', { name: 'Who am I' }).click();
  await expect(page.getByRole('status')).toHaveText(`Signed in as ${email}`);

  const cookies = await context.cookies(API);
  const session = cookies.find((cookie) => cookie.name.includes('session_token'));
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Lax');
  const scriptVisible = await page.evaluate(() => document.cookie);
  expect(scriptVisible).not.toContain('session_token');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('status')).toHaveText('Signed out');
  await page.getByRole('button', { name: 'Who am I' }).click();
  await expect(page.getByRole('status')).toHaveText('Not signed in (401)');
});
