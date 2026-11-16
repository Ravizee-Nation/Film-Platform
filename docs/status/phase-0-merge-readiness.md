# Phase 0 merge-readiness report

**Recommendation: ready to merge, pending the owner's explicit authorization.** Every Phase 0
acceptance criterion is recorded as passed, all required checks pass, and nothing outside the
approved Phase 0 scope or budget is included.

- Pull request: [#1](https://github.com/Ravizee-Nation/Film-Platform/pull/1), branch
  `claude/phase-0-foundation`, open and not merged
- Evidence commit: `bf51ec5` (2026-11-16). Later commits on the branch change documentation only;
  the latest CI run on the pull request is authoritative.
- Prepared: 2026-11-16

## Readiness checklist

| Condition                                        | Status                                | Evidence                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17 of 17 acceptance criteria passed              | **Met**                               | [phase-0-acceptance.md](phase-0-acceptance.md): 17 passed, 0 pending, 0 failed                                                                                                                                                                                                                                                                      |
| Physical-device verification, iPhone and Android | **Met (owner-attested)**              | Android 2026-11-13 and 2026-11-16, iPhone 2026-11-16: live API, unavailable and recovered states, 1,000-item feed on the optimized bundle, VoiceOver and TalkBack. The owner chose attestation as the evidence; no screenshots or recordings were posted ([test-results.md](test-results.md))                                                       |
| Exceptions X1 to X4                              | **Approved** by the owner, 2026-11-16 | [phase-0-acceptance.md, Exceptions](phase-0-acceptance.md#exceptions)                                                                                                                                                                                                                                                                               |
| Branch protection on `main`                      | **Active**                            | Ruleset `Protect main` (#26780354): active on the default branch, no bypass actors, pull request required (0 approvals, code-owner review off, conversation resolution on), 12 required checks with branches up to date, linear history, force pushes and deletion blocked. Unchanged since 2026-11-08 ([snapshot](evidence/ruleset-26780354.json)) |
| Repository security settings                     | **Met**                               | Dependency graph, secret scanning, push protection, Dependabot security updates, private vulnerability reporting verified through the API; Dependabot alerts and Actions permissions confirmed by owner screenshots                                                                                                                                 |
| CI failures                                      | **Zero**                              | `bf51ec5`: [CI run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/43816099747) and [Security run](https://github.com/Ravizee-Nation/Film-Platform/actions/runs/43816099748), 13 of 13 checks passed                                                                                                                                  |
| Merge conflicts and review threads               | **None**                              | GitHub `mergeable_state: clean`; no open review threads                                                                                                                                                                                                                                                                                             |
| Unauthorized paid infrastructure                 | **None**                              | See below                                                                                                                                                                                                                                                                                                                                           |
| Scope                                            | **Phase 0 only**                      | No accounts, sign-in, billing, entitlements, enterprise features or third-party integrations                                                                                                                                                                                                                                                        |

## Paid infrastructure

Recurring infrastructure spend: **$0 per month** against the approved $50 ceiling.

| Service                                                | Used                                           | Cost                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GitHub repository, Actions, CodeQL, secret scanning    | Yes                                            | $0 while the repository is public (Linux runners only)                                                                       |
| Cloud hosting, managed database, domain                | No; nothing provisioned                        | $0                                                                                                                           |
| Expo EAS builds                                        | No; testing used Expo Go                       | $0                                                                                                                           |
| Email, payments, push, device farm                     | No                                             | $0                                                                                                                           |
| Docker Desktop (owner's Mac)                           | Owner's machine                                | Free for personal use, education and small businesses (under 250 employees and $10M revenue); the owner confirms eligibility |
| Apple Developer ($99/year), Google Play ($25 one-time) | Owner enrollment, separate business setup cost | Outside the ceiling by owner decision                                                                                        |

## Remaining limitations

These don't block the merge, but readers of the record should know them.

1. **Device evidence is owner-attested.** Criteria 13 and 14 rest on the owner's reports and two
   photos of the Android status screen; no screenshot or recording files were posted.
2. **iPhone scroll performance was judged visually.** The Android run was measured with Profile
   HWUI rendering, with every frame inside the 60 fps budget. The iPhone run had no frame-rate meter
   and was assessed as smooth.
3. **Testing ran in Expo Go**, not a development or store build. Native configuration (bundle IDs,
   permissions, release cleartext policy, exception X1) is first exercised in Phase 1 builds.
4. **Bundle IDs and brand tokens are placeholders** (`com.filmplatform.app`) until decision D3.
5. **Phone-to-laptop testing needs a network that allows it.** Public Wi-Fi blocked it; the phone's
   hotspot worked. This affects local testing only.
6. **Two settings were verified by screenshot, not API** (Dependabot alerts and Actions workflow
   permissions), because the build session's proxy can't read them.
7. **CodeQL and secret scanning are free only while the repository is public.** If it becomes
   private, switch to Semgrep OSS and gitleaks at $0 (risk R10).
8. **Toolchain lifecycle:** Node.js 22 LTS reaches end of life in April 2027; TypeScript is pinned to
   6.0 until `typescript-eslint` supports 7.x.
9. **Phase 1 staging prices are unverified.** Provider pricing pages were blocked from the build
   environment ([phase-1-staging.md](../costs/phase-1-staging.md)).

## Phase 1 dependencies

Phase 1 (identity, accounts, device builds) doesn't start until the owner approves it. It depends on:

| Dependency                                                      | Type                        | Status                                                                            |
| --------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| D7: authentication approach                                     | Owner decision              | Open; comparison prepared, recommendation self-hosted on an open-source library   |
| D3: app name, bundle and application IDs                        | Owner decision              | Open until the product identity is confirmed; needed before the first store build |
| D2 and staging budget                                           | Owner decision and approval | Open; about $5 to $8 per month estimated, prices to be verified                   |
| D10: terms, privacy policy, minors policy (draft)               | Owner and legal             | Open; sign-up shouldn't go live without them                                      |
| E2 Apple Developer, E3 Google Play (organization)               | External accounts           | In progress (owner)                                                               |
| E4 Expo account, E5 cloud account and domain, E9 email provider | External accounts           | Open; free tiers expected, each needs approval                                    |

## How to merge (owner)

1. Open PR #1 and choose **Rebase and merge** (recommended: keeps each commit, including
   the iOS header and `APP_VARIANT` fixes) or **Squash and merge**. A merge commit is rejected by the
   linear-history rule.
2. Don't delete the branch yet: the evidence links in these reports point to it. After the merge,
   the links are repointed to `main`, and then the branch can be deleted.
