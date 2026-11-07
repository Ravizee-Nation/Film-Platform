# Implementation status

Every feature and component carries exactly one label:

- **Complete**: built, tested to its acceptance criteria, merged and running against the real backend.
- **Prototype**: works for demonstration, but isn't production-hardened or fully tested.
- **Mock**: uses fake data or a simulated external service; says what it stands in for.
- **Scaffold**: structure only (folder, config, empty shell), no behaviour yet.
- **Planned**: designed in the docs, no code yet.

Last updated: 2026-11-07 (Phase 0 pull request, not yet merged). "Complete" below means complete
on the Phase 0 branch with CI green; it becomes final when the pull request is merged.

## Phase 0

| Component                                                                                                   | Label       | Notes                                                                 |
| ----------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| Monorepo (pnpm, Turborepo, TypeScript strict, ESLint, Prettier)                                             | Complete    |                                                                       |
| Import-boundary enforcement                                                                                 | Complete    | dependency-cruiser + self-test                                        |
| CI (`ci.yml`) and security workflows (`security.yml`), Dependabot                                           | Complete    | Branch protection must be switched on by an admin: pending            |
| API skeleton: `/health`, `/ready`, `/v1/meta`, error model, request IDs, security headers, CORS, body limit | Complete    |                                                                       |
| Deny-by-default route access policy                                                                         | Complete    | Non-public routes return 401 until Phase 1                            |
| OpenAPI contract generation and typed client                                                                | Complete    |                                                                       |
| Database: migration pipeline, migration `0000`, advisory-locked runner, test databases                      | Complete    | No domain tables (by design)                                          |
| Environment validation and `.env.example`                                                                   | Complete    | staging/production defined, not provisioned                           |
| Web app shell (status page)                                                                                 | Scaffold    | Renders live API status; no product features                          |
| Mobile app shell (status screen, Expo Router, environment variants)                                         | Scaffold    | Placeholder bundle IDs until D3                                       |
| Mobile proof-of-concept screens (1,000-item feed, screen-reader form)                                       | Prototype   | Synthetic data; nothing is sent anywhere                              |
| Design tokens (`packages/ui`)                                                                               | Scaffold    | Placeholder brand values until D3                                     |
| Living registers and threat model                                                                           | Complete    |                                                                       |
| Physical-device verification (criteria 13 and 14)                                                           | **Pending** | Needs a person with an iPhone and an Android phone                    |
| Repository settings: branch protection, required checks, secret scanning, CODEOWNERS (criterion 15)         | **Pending** | Needs a repository admin; steps in `docs/github/branch-protection.md` |

## Deviations from the approved Phase 0 specification

| Spec said                                                                   | What was built                                                                                        | Why                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android `usesCleartextTraffic` off in non-development builds via app config | Not set in `app.config.ts`                                                                            | Not a valid Expo config key. Android release builds already block cleartext HTTP by default (API 28+); an explicit setting via `expo-build-properties` can be added with the first store build in Phase 1 |
| `docs/status/test-results.md` generated by CI on every merge                | CI writes coverage to the job summary and uploads artifacts; the file is updated in each pull request | CI has read-only permissions by design; letting it commit to branches would need write tokens                                                                                                             |
| Local Postgres 17                                                           | Docker Compose and CI use Postgres 17; the code is tested on 16 and 17                                | The build environment for this pull request had Postgres 16 available, not Docker                                                                                                                         |
| `CODEOWNERS` naming the owner as required reviewer                          | Placeholder with instructions                                                                         | The owner's GitHub username isn't visible to the build environment                                                                                                                                        |

## Later phases

Phases 1 to 9 are **Planned**. See the implementation roadmap. Nothing in Phase 0 implements
accounts, billing, entitlements, enterprise features or any third-party integration.
