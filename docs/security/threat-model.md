# Threat model

Updated whenever a phase adds a new type of data. Last updated: 2026-11-07 (Phase 0).

## Phase 0 scope

No user data is stored. The API exposes three public, read-only endpoints (`/health`, `/ready`,
`/v1/meta`). There are no credentials, sessions or third-party integrations.

## Assets

| Asset                   | Phase 0 exposure                                                           |
| ----------------------- | -------------------------------------------------------------------------- |
| Database contents       | None yet (extensions only)                                                 |
| Infrastructure secrets  | None exist; `.env` is gitignored and gitleaks scans history                |
| Source and supply chain | Public repository; lockfile, pinned Actions, Dependabot, dependency review |

## Baseline controls in place

- Deny-by-default route access policy: undeclared routes fail at startup (ADR 0005).
- Zod validation of every request and response; one error shape; no stack traces in responses.
- 1 MB request body limit; security headers (`@fastify/helmet`); CORS allowlist per environment.
- Authorization and cookie headers redacted from logs.
- Environment validated at startup; the API refuses to boot on bad configuration.
- Only `EXPO_PUBLIC_*` and `NEXT_PUBLIC_*` values reach client bundles (web uses a server-only `API_URL`).
- CI: CodeQL (security-extended), gitleaks over full history, dependency review failing on high or critical.

## Threats to address in later phases

| Threat                                                    | Phase | Planned control                                                                             |
| --------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| Credential stuffing, account takeover                     | 1     | Argon2id, breached-password check, rate limits, refresh-token rotation with reuse detection |
| Token theft on device                                     | 1     | Keychain / Keystore via `expo-secure-store`; short-lived access tokens                      |
| Paying without entitlement, or entitlement without paying | 2-3   | Server-side receipt validation and store notifications into one entitlements table          |
| Malicious uploads                                         | 4     | Signed direct uploads, type checks, malware scanning, EXIF stripping                        |
| Harassment and abusive content                            | 5     | Blocking, reporting, moderation queue (Apple guideline 1.2)                                 |
| Cross-tenant access                                       | 8     | Policy layer plus Postgres row-level security and a generated permission test matrix        |
