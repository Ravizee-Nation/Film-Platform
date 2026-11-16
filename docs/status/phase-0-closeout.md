# Phase 0 closeout

**Phase 0 is complete and closed.** PR [#1](https://github.com/Ravizee-Nation/Film-Platform/pull/1)
was merged into `main` on 2026-11-16 by rebase and merge, with the owner's explicit authorization,
at the approved head `f5df1d0`. Phase 1 has not started.

## Closeout record

| Item                | Result                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization       | Owner approved a rebase-and-merge at head `f5df1d0d62377ba7a89d71d9015397479b6b719c`, conditional on an unchanged head and passing checks; both conditions were verified immediately before merging                                                            |
| Merge               | `main` at [`23cdac5`](https://github.com/Ravizee-Nation/Film-Platform/commit/23cdac54cbbbb5ee3a2268e34db946ae8562e707), 18 commits rebased onto the base commit. Rebasing changes commit IDs; the file tree is identical to the approved head (tree `759eb38`) |
| Acceptance          | 17 of 17 criteria passed ([phase-0-acceptance.md](phase-0-acceptance.md)); criteria 13 and 14 owner-attested                                                                                                                                                   |
| Exceptions          | X1 to X4 approved by the owner on 2026-11-16 and preserved in the acceptance report                                                                                                                                                                            |
| Branch protection   | Ruleset `Protect main` (#26780354) active after the merge, unchanged since 2026-11-08                                                                                                                                                                          |
| Paid infrastructure | None; recurring spend $0 per month                                                                                                                                                                                                                             |
| Evidence links      | Pinned to the merge commit, so they stay valid after the Phase 0 branch is deleted                                                                                                                                                                             |

**Post-merge checks on `main` (`23cdac5`):**
[CI run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/43817555706) and
[Security run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/43817555761). 11 of the
12 required checks passed. `dependency-review` was skipped by design: it compares dependency changes
in a pull request, so it doesn't run on pushes to `main`. It passed on the approved head `f5df1d0`.
The first Dependabot update check also succeeded.

## Phase 1 starting baseline

**Final Phase 1 baseline: `main` at [`77ce0b7`](https://github.com/Ravizee-Nation/Film-Platform/commit/77ce0b742c31f6da14003d01aeef890b8014fba0)** (the Phase 0 closeout
merge, 2026-11-16), or any later commit on `main`. Post-merge checks at `77ce0b7`:
[CI run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/43818375244) and
[Security run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/43818375245); 11 of 12
required checks passed, with `dependency-review` skipped by design (pull requests only).

| Area                     | Baseline                                                                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime and tooling      | Node.js 22 LTS, pnpm 10.28, Turborepo 2.11, TypeScript 6.0 (strict)                                                                                                                                                         |
| Mobile                   | Expo SDK 58, React Native 0.88.1, Expo Router 58, React 19.3; variant selected by `APP_VARIANT`; placeholder bundle IDs `com.filmplatform.app[.dev/.staging]`                                                               |
| Web                      | Next.js 16.4, React 19.3; server-only `API_URL`                                                                                                                                                                             |
| API                      | Fastify 5, Zod 4, OpenAPI 3.1 contract generated into `packages/contracts`; deny-by-default route policy (non-public routes return 401 until sign-in exists)                                                                |
| Database                 | PostgreSQL 17 (Docker and CI), Drizzle; migration `0000` (extensions only), no domain tables                                                                                                                                |
| Quality gates            | 12 required checks on `main`: lint, typecheck, boundaries, unit, api-integration (80% coverage gate), contract, migrations, web (Playwright), mobile (Jest + iOS/Android bundle export), codeql, secrets, dependency-review |
| Governance               | `main` protected (pull request, 12 checks, up-to-date branches, linear history, conversation resolution, no force pushes or deletion, no bypass); CODEOWNERS `* @patchworkeducation-lab`                                    |
| Registers                | Decisions, risks, implementation status, test results, threat model, all under `docs/`                                                                                                                                      |
| Local and device testing | Docker Compose + `pnpm dev`; device checklist in `docs/testing/`; public Wi-Fi may block phone-to-laptop traffic, so use a phone hotspot                                                                                    |

## Phase 1 decision requirements

Phase 1 implementation, paid services and any change to the authentication architecture wait for
these owner decisions. The full brief, with security requirements and sequencing, is the Phase 1
Readiness Brief.

| Decision                                                                    | Needed before                                     | Recommendation                                                                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Approve the Phase 1 Readiness Brief                                         | Any Phase 1 work                                  | Approve                                                                                                                      |
| **D7**: authentication approach                                             | First Phase 1 pull request (**blocks the start**) | Self-hosted on a maintained open-source library, with conditions; WorkOS AuthKit as the managed alternative                  |
| Password and session policy                                                 | Email sign-up pull request                        | At least 10 characters plus a breached-password check; 15-minute access tokens; refresh sessions expire after 30 days unused |
| Launch sign-in methods                                                      | Apple and Google pull request                     | Email, Sign in with Apple and Google sign-in in Phase 1; passkeys and two-factor before public launch                        |
| **D10** drafts: terms, privacy, minimum age                                 | Staging sign-up                                   | Minimum age 18 at launch                                                                                                     |
| **D3**: app name, bundle and application IDs                                | First store build                                 | Settle before any TestFlight or Play upload                                                                                  |
| **D2** and staging budget                                                   | Staging deploy                                    | About $5 to $8 per month (Fly.io + Neon + domain), prices verified on live pages first                                       |
| **E9** email provider, **E4** Expo account, **E5** cloud account and domain | Staging and device builds                         | Free tiers; each needs approval                                                                                              |
| **E2 / E3** Apple and Google developer accounts                             | Apple sign-in keys, TestFlight, Play testing      | Owner enrollment in progress                                                                                                 |
| Independent security review of the auth code                                | Before real users sign up                         | Budget a one-off review                                                                                                      |

## Housekeeping (owner, optional)

- The `claude/phase-0-foundation` branch can be deleted once this closeout is merged; every evidence
  link now points to the merge commit instead.
- Decision D1 (technology stack) was fully approved by the owner on 2026-11-16, after the device
  proof of concept passed (criteria 13 and 14).
