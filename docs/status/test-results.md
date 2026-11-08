# Test results

One entry per merged pull request, newest first. CI also writes a coverage summary to each run's
job summary and keeps coverage and Playwright artifacts for 14 days.

## Phase 0 pull request (`claude/phase-0-foundation`), 2026-11-07

### Automated

Recorded from a local run of the full gate before opening the pull request (Node.js 22.22,
pnpm 10.28, PostgreSQL 16.15), then confirmed in CI on commit `88a049f`:
[CI run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931) (all 9 jobs
passed, Postgres 17) and
[Security run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416362109) (CodeQL
and secrets passed). After the owner enabled the dependency graph on 2026-11-08, the Security
workflow was re-run on `930f430` and dependency-review passed.
Criterion-by-criterion status: [phase-0-acceptance.md](phase-0-acceptance.md).

| Gate                                                            | Result                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Lint (ESLint, zero warnings), Prettier, unlinked-TODO check     | Pass                                                                                       |
| Type-check, all 8 workspaces (TypeScript 6.0 strict)            | Pass                                                                                       |
| Unit tests                                                      | Pass: domain 15, contracts 1, API (unit project) 19, web 5, mobile 7                       |
| API integration tests (real Postgres)                           | Pass: 3 (all API tests: 22)                                                                |
| Migration tests (re-run, concurrent runs, extensions)           | Pass: 3                                                                                    |
| Coverage gate (80% lines)                                       | Pass: `apps/api` 93.84% lines, 84.37% branches; `packages/domain` 100% lines, 75% branches |
| Import boundaries + self-test                                   | Pass: 0 violations; planted forbidden import rejected                                      |
| Contract check (regenerated OpenAPI + client identical)         | Pass                                                                                       |
| Migration checks (metadata, drift, merged migrations unchanged) | Pass                                                                                       |
| Build (API bundle, Next.js)                                     | Pass                                                                                       |
| Playwright end-to-end (web shows "API: ok" from a live API)     | Pass: 1                                                                                    |
| Mobile bundle export (iOS and Android)                          | Pass: both Hermes bundles produced                                                         |
| `pnpm dev` starts API (`/ready` ok), web and Expo dev server    | Pass (manual smoke check)                                                                  |

### Manual and physical-device checks

| Check                                                   | iPhone                         | Android     |
| ------------------------------------------------------- | ------------------------------ | ----------- |
| 13: status screen shows "API: ok"                       | **Pending**                    | **Pending** |
| 14a: 1,000-item feed scroll performance                 | **Pending**                    | **Pending** |
| 14b: VoiceOver / TalkBack announce every control        | **Pending**                    | **Pending** |
| 15: branch protection, required checks, secret scanning | **Pending** (repository admin) |             |

Steps: `docs/testing/physical-devices.md` and `docs/github/branch-protection.md`.
