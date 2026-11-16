// D7 PROOF OF CONCEPT (branch poc/d7-better-auth; never merged).
// Wording and per-address limits for authentication emails (Gate B follow-up to F11/F12).

/** At most this many password links (registration or recovery) per address per hour. */
export const PASSWORD_LINKS_PER_ADDRESS_PER_HOUR = 3;

export type AuthEmailKind = 'verify-email' | 'reset-password' | 'complete-registration';

/** Every message says what happens if the recipient did nothing. */
export const NOT_REQUESTED_NOTICE = 'If you did not request this, you can ignore this email.';

export function authEmailContent(
  kind: AuthEmailKind,
  url: string,
  linkMinutes: number,
): { subject: string; text: string } {
  switch (kind) {
    case 'complete-registration':
      return {
        subject: 'Finish creating your Film Platform account',
        text: [
          'Someone asked to create a Film Platform account for this email address.',
          `To finish, choose a password using this link within ${linkMinutes} minutes. It works once:`,
          url,
          '',
          `${NOT_REQUESTED_NOTICE} Nobody can use an account for this address without this link.`,
        ].join('\n'),
      };
    case 'reset-password':
      return {
        subject: 'Reset your Film Platform password',
        text: [
          'Someone asked to reset the password for this address, or tried to register it again.',
          `To choose a new password, use this link within ${linkMinutes} minutes. It works once, and signs you out everywhere:`,
          url,
          '',
          `${NOT_REQUESTED_NOTICE} Your password has not changed and nobody can change it without this link.`,
        ].join('\n'),
      };
    case 'verify-email':
      return {
        subject: 'Confirm your email address for Film Platform',
        text: [
          'Confirm this email address for your Film Platform account using this link:',
          url,
          '',
          `${NOT_REQUESTED_NOTICE} Nothing changes unless the link is used.`,
        ].join('\n'),
      };
  }
}
