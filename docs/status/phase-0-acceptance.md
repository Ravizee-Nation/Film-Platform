# Phase 0 final acceptance report

Status of every Phase 0 completion criterion in the approved specification.
Statuses: **Passed**, **Pending**, **Failed**, **Exception Approved**.

- Pull request: [#1](https://github.com/Ravizee-Nation/Film-Platform/pull/1), branch `claude/phase-0-foundation`, not merged
- Evidence run: commit `88a049f`, [CI run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931) and [Security run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416362109).
  Later commits on this branch change documentation only. The latest run on the pull request is authoritative.
- Last updated: 2026-11-08 (criterion 12 passed after the dependency graph was enabled)

## Summary

| Status             | Count | Criteria                                           |
| ------------------ | ----- | -------------------------------------------------- |
| Passed             | 13    | 1, 3-12, 16, 17                                    |
| Pending            | 4     | 2, 13, 14, 15                                      |
| Failed             | 0     |                                                    |
| Exception Approved | 0     | Four exceptions await the owner's decision (below) |

**Merge readiness: not ready.** Four criteria are pending, and none of them needs a code change
unless a test fails.

## Automated criteria (CI)

| #   | Criterion                                                                                           | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Frozen-lockfile install and build succeed on a clean clone, Node.js 22                              | Passed      | Every CI job installs with `--frozen-lockfile`; [web job](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233065) builds the API and web                                                                                                                                                                                                                                                      |
| 2   | `docker compose up` then `pnpm dev` starts Postgres, API (4000), web (3000) and Expo, as documented | **Pending** | `pnpm dev` was verified with a local Postgres 16 (API `/ready` ok, web up, Expo packager running), but `infra/compose.yml` hasn't been run: the build environment had no Docker. Covered by the setup section of the [device checklist](../testing/physical-device-checklist.md)                                                                                                                                                 |
| 3   | Lint, Prettier and type-check pass with zero errors                                                 | Passed      | [lint](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233061), [typecheck](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535232984)                                                                                                                                                                                                                        |
| 4   | Zero boundary violations; a fixture proves `packages/db` from `apps/web` fails                      | Passed      | [boundaries](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233092): 0 violations, self-test rejected the planted import                                                                                                                                                                                                                                                                     |
| 5   | `/health` 200; `/ready` 200 with database up, 503 with it down; `/v1/meta` returns the version      | Passed      | [api-integration](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233074) (real Postgres) and [unit](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535232814); tests in [`apps/api/test`](https://github.com/Ravizee-Nation/Film-Platform/blob/claude/phase-0-foundation/apps/api/test)                                                                     |
| 6   | An undeclared route fails startup; an `authenticated` route returns 401 in the standard shape       | Passed      | [`policy.unit.test.ts`](https://github.com/Ravizee-Nation/Film-Platform/blob/claude/phase-0-foundation/apps/api/test/policy.unit.test.ts) in the [unit job](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535232814)                                                                                                                                                                           |
| 7   | Regenerated OpenAPI spec identical; web and mobile compile against the client                       | Passed      | [contract](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233064), [typecheck](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535232984)                                                                                                                                                                                                                    |
| 8   | Migration `0000` applies to an empty database; no drift                                             | Passed      | [migrations](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233116) (Postgres 17)                                                                                                                                                                                                                                                                                                            |
| 9   | Playwright: web renders "API: ok" from a live API                                                   | Passed      | [web](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233065): 1 passed                                                                                                                                                                                                                                                                                                                       |
| 10  | Mobile Jest passes; `expo export` succeeds for iOS and Android                                      | Passed      | [mobile](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233274)                                                                                                                                                                                                                                                                                                                              |
| 11  | Line coverage at least 80% in `apps/api` and `packages/domain`                                      | Passed      | [api-integration](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42416361931/job/128535233074): api 93.84%, domain 100%                                                                                                                                                                                                                                                                                            |
| 12  | CodeQL, gitleaks and dependency review: no high or critical findings                                | Passed      | Security workflow re-run on `930f430` after the dependency graph was enabled (2026-11-08): [codeql](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42417555548/job/128576809638), [secrets](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42417555548/job/128576768794), [dependency-review](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/42417555548/job/128576767218), all passed |

## Manual criteria

| #   | Criterion                                                                                            | Status      | Evidence                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Physical iPhone and Android phone show "API: ok" through Expo Go                                     | **Pending** | Awaiting the [device checklist](../testing/physical-device-checklist.md), section A                                                                                                                                                                     |
| 14  | 1,000-item list scrolls smoothly; VoiceOver and TalkBack announce every control; recordings attached | **Pending** | Awaiting checklist sections B and C. Behaviour is unit-tested in [`screens.test.tsx`](https://github.com/Ravizee-Nation/Film-Platform/blob/claude/phase-0-foundation/apps/mobile/src/__tests__/screens.test.tsx), which doesn't replace the device test |
| 15  | Branch protection, required checks and secret scanning on                                            | **Pending** | Owner is applying them; steps and ruleset in [branch-protection.md](../github/branch-protection.md). CODEOWNERS recommendation below                                                                                                                    |

## Documentation criteria

| #   | Criterion                                                                                            | Status | Evidence                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16  | README covers prerequisites, setup, scripts, troubleshooting; four registers and threat model seeded | Passed | [README](https://github.com/Ravizee-Nation/Film-Platform/blob/claude/phase-0-foundation/README.md), [decisions](../decisions/README.md), [risks](../risks.md), [status](implementation.md), [test results](test-results.md), [threat model](../security/threat-model.md) |
| 17  | Pull request lists each item with a status label and every deviation                                 | Passed | [PR #1 description](https://github.com/Ravizee-Nation/Film-Platform/pull/1)                                                                                                                                                                                              |

## Exceptions awaiting the owner's decision

Each deviation from the specification needs the owner to mark it **Exception Approved**, or to ask
for a change.

| #   | Deviation                                                                            | Effect                                                                    | Recommendation                                                  |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| X1  | Android `usesCleartextTraffic` isn't set in app config (not a valid Expo key)        | None in Phase 0: release builds block plain HTTP by default on Android 9+ | Approve; set it explicitly with the first store build (Phase 1) |
| X2  | `test-results.md` is updated in each pull request, not committed by CI               | CI keeps read-only permissions                                            | Approve                                                         |
| X3  | Local verification used Postgres 16; CI and Docker use 17                            | None: CI ran every database test on 17                                    | Approve                                                         |
| X4  | An empty "Initialize repository" commit was pushed to `main` to create a base branch | No files changed on `main`                                                | Approve                                                         |

## CODEOWNERS and approval settings (criterion 15)

Evidence of the current ownership: PR #1, and every commit pushed from this session, are attributed to
the GitHub account **`patchworkeducation-lab`**, which belongs to the owner. The repository belongs
to the `Ravizee-Nation` organization. No second maintainer is visible.

Recommended now, while there is one maintainer:

- `.github/CODEOWNERS`: `* @patchworkeducation-lab`, once the owner confirms the handle. This
  records ownership and auto-requests review.
- Ruleset on `main`: pull request required; **required approvals: 0**; **Require review from
  Code Owners: off**; all 12 status checks required, with branches up to date; linear history; no
  force pushes or deletions; **no bypass actors**.
- Reason: GitHub doesn't let an author approve their own pull request. Pull requests from this
  session are authored by the owner's account, so a required approval would block every merge.
  Required checks still enforce every quality gate, and merging stays a deliberate act by the owner.

When a second person with write access joins, either a person or a team such as
`@Ravizee-Nation/maintainers`: change CODEOWNERS to that team, set **required approvals to 1**, turn
on **Require review from Code Owners** and **Dismiss stale approvals**.
