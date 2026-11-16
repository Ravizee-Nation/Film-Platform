# Decision register

Living register of every product, architecture and external-account decision. It changes in the
same pull request as the code that makes or depends on a decision. Architecture decision records
(ADRs) hold the reasoning; this table holds the status.

Status values: **Open** (needs a decision), **Approved**, **Conditionally approved**,
**In progress** (being actioned outside the code), **Done**, **Superseded**.

Last updated: 2026-11-16 (D1 fully approved after Phase 0 closed).

## Decisions requiring the owner's approval

| ID     | Decision                                                                          | Status                                               | Needed by                              | Recommendation / notes                                                                                                                                                                                                                                                                  |
| ------ | --------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1     | Stack: React Native/Expo, Next.js, Node.js/TypeScript, PostgreSQL in one monorepo | **Approved**                                         | Phase 0                                | Fully approved by the owner on 2026-11-16, after the agreed iOS and Android proof-of-concept tests passed (criteria 13 and 14). Previously conditionally approved. [ADR 0001](0001-technology-stack.md)                                                                                 |
| D2     | Cloud provider and hosting model                                                  | Open                                                 | Phase 1 (staging)                      | Proposal in [costs/phase-1-staging.md](../costs/phase-1-staging.md). Nothing provisioned                                                                                                                                                                                                |
| D3     | App name, brand, bundle and application IDs, launch countries                     | Open (until the final product identity is confirmed) | Before the first store build (Phase 1) | Placeholder `com.filmplatform.app` used in Phase 0. Bundle IDs can't change after release                                                                                                                                                                                               |
| D4     | Membership tiers, prices and features                                             | Open                                                 | Phase 2                                | Not implemented. No billing code exists                                                                                                                                                                                                                                                 |
| D5     | Billing approach for each product category                                        | Open                                                 | Phase 3                                | Not implemented                                                                                                                                                                                                                                                                         |
| D6     | RevenueCat or a self-built receipt layer                                          | Open                                                 | Phase 3                                | Not implemented                                                                                                                                                                                                                                                                         |
| D7     | Auth approach: managed identity provider or self-hosted                           | Open                                                 | Before Phase 1                         | Comparison prepared ([D7 Authentication Options](https://claude.ai/artifact/UvGp7EEABFhLtegov5EZs4)): recommends self-hosted on an open-source library, with conditions; WorkOS AuthKit as the managed alternative. **Not approved.** Phase 0 has only the deny-by-default route policy |
| D8     | Enterprise SSO provider                                                           | Open                                                 | Phase 8                                | Not implemented                                                                                                                                                                                                                                                                         |
| D9     | Moderation policy and staffing                                                    | Open                                                 | Phase 5                                |                                                                                                                                                                                                                                                                                         |
| D10    | Terms, privacy policy, minors policy                                              | Open                                                 | Phase 1 draft, Phase 9 final           |                                                                                                                                                                                                                                                                                         |
| D11    | Budget for paid services                                                          | **Approved**                                         | Phase 0                                | $50/month ceiling for recurring infrastructure. Every expense needs separate approval. Apple ($99/yr) and Google ($25 one-time) are separate business setup costs. Phase 0 spend: $0                                                                                                    |
| SPEC-0 | Phase 0 implementation specification                                              | **Done**                                             | Phase 0                                | Implemented and merged into `main` as `23cdac5` on 2026-11-16; 17 of 17 acceptance criteria passed; exceptions X1 to X4 approved; deviations in [status/implementation.md](../status/implementation.md)                                                                                 |

## External accounts and services

| ID  | Account or service                                  | Status              | Needed by             | Notes                                                  |
| --- | --------------------------------------------------- | ------------------- | --------------------- | ------------------------------------------------------ |
| E1  | Write access to this repository (Claude GitHub App) | **Done**            | Phase 0               | Confirmed 2026-11-07                                   |
| E2  | Apple Developer Program (organization)              | In progress (owner) | Phase 1 device builds | Handled separately by the owner. Doesn't block Phase 0 |
| E3  | Google Play Console (organization)                  | In progress (owner) | Phase 1 device builds | Handled separately by the owner                        |
| E4  | Expo/EAS account                                    | Open                | Phase 1               | Free plan expected                                     |
| E5  | Cloud provider account and domain                   | Open                | Phase 1               | See D2                                                 |
| E6  | Stripe                                              | Open                | Phase 2               |                                                        |
| E7  | Store agreements, tax, banking                      | Open                | Phase 3               |                                                        |
| E8  | Firebase project and APNs key                       | Open                | Phase 6               |                                                        |
| E9  | Transactional email provider                        | Open                | Phase 1               | Free tier expected; needs approval                     |
| E10 | Device farm and penetration-test vendor             | Open                | Phase 4 / Phase 9     |                                                        |

## Architecture decision records

| ADR                                 | Title                                                | Status                            |
| ----------------------------------- | ---------------------------------------------------- | --------------------------------- |
| [0001](0001-technology-stack.md)    | Technology stack                                     | Accepted (D1 approved 2026-11-16) |
| [0002](0002-monorepo-boundaries.md) | Monorepo structure and import boundaries             | Accepted                          |
| [0003](0003-api-contract.md)        | Contract-first REST API generated from route schemas | Accepted                          |
| [0004](0004-database-migrations.md) | Database and migration rules                         | Accepted                          |
| [0005](0005-route-access-policy.md) | Deny-by-default route access policy                  | Accepted                          |
