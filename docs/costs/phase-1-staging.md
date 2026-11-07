# Phase 1 staging costs (proposal, not approved, nothing provisioned)

Budget: $50/month ceiling for recurring infrastructure; every expense needs the owner's approval
(decision D11). Phase 0 spend: **$0**.

## Verification status

Requirement: verify prices against current provider documentation before presenting them. The
build environment's network policy **blocked direct access** to the providers' pricing pages
(fly.io, render.com, neon.com, railway.com, resend.com, expo.dev). The figures below come from web
search results on 2026-10-15, some quoting the providers' own pages and some from third-party
summaries. **They are not yet verified.** Before approval, someone must confirm each figure on the
provider's live pricing page (links below) and update this table.

| Service                                      | Purpose                      | Price found (unverified)                                                                      | Proposed plan                    | Est. USD/month |
| -------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------- | -------------- |
| [Fly.io](https://fly.io/docs/about/pricing/) | Staging API + web            | shared-cpu-1x: ~$1.94/mo (256 MB), ~$3.19-3.32/mo (512 MB), Ashburn; regional variation       | Two small machines               | ~$4-7          |
| [Neon](https://neon.com/pricing)             | Staging Postgres             | Free: 100 CU-hours/project, scale to zero; storage 0.5 GB (possibly raised to 1 GB)           | Free                             | $0             |
| [Render](https://render.com/pricing)         | Alternative host             | Free web services sleep after ~15 min; Starter $7/mo; **free Postgres deleted after 30 days** | Not recommended for the database | n/a            |
| [Expo EAS](https://expo.dev/pricing)         | Builds and submission        | Free: 15 iOS + 15 Android builds/month, low-priority queue; Starter $19/mo                    | Free                             | $0             |
| [Resend](https://resend.com/pricing)         | Verification and reset email | Free: 3,000/month, 100/day, 1 domain                                                          | Free                             | $0             |
| Domain registrar                             | Staging hostnames, email DNS | ~$10-15/year                                                                                  | One domain                       | ~$1            |
| **Total**                                    |                              |                                                                                               |                                  | **~$5-8**      |

Apple Developer ($99/year) and Google Play ($25 one-time) are separate business setup costs,
handled by the owner, and not counted against the ceiling.

Sources consulted (search): Fly.io pricing; findstack, temps.sh and costbench comparisons (Render);
Neon pricing and the releases.sh digest of 2026-09-28; Expo pricing and plans docs; wpmailsmtp and
costbench (Resend).
