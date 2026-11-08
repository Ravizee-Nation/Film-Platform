# Film Platform

One platform for iOS, Android and web: a single API, a single PostgreSQL database, and one
identity, permissions and entitlement model shared by every client.

> **Status: Phase 0 (foundations).** This repository contains the monorepo, an API skeleton,
> web and mobile shells, the database migration pipeline, CI and the living registers. No
> user-facing features exist yet. See [docs/status/implementation.md](docs/status/implementation.md).

## Repository layout

| Path                 | What it is                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| `apps/api`           | Fastify API: the only backend service and the only code that touches the database |
| `apps/web`           | Next.js web app                                                                   |
| `apps/mobile`        | Expo (React Native) app for iOS and Android                                       |
| `packages/contracts` | OpenAPI spec generated from the API, plus the typed client every app uses         |
| `packages/domain`    | Pure TypeScript business rules and Zod schemas                                    |
| `packages/db`        | Drizzle schema, SQL migrations, migration runner, test-database helpers           |
| `packages/ui`        | Design tokens shared by web and mobile                                            |
| `packages/config`    | Shared TypeScript and ESLint presets                                              |
| `infra/`             | Docker Compose for local Postgres                                                 |
| `docs/`              | Decision register, risk register, status, test results, security, runbooks        |

Import rules are enforced in CI by dependency-cruiser (`.dependency-cruiser.cjs`): web and
mobile reach the backend only through `@film/contracts` over HTTPS.

## Prerequisites

- Node.js 22 LTS (`.nvmrc`), with Corepack enabled: `corepack enable`
- pnpm 10 (installed by Corepack from `packageManager` in `package.json`)
- Docker, for local Postgres (or any Postgres 16+ you can reach)
- For the mobile app on a phone: the **Expo Go** app from the App Store or Google Play

## Set up

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose -f infra/compose.yml up -d     # Postgres 17 on localhost:5432
pnpm db:migrate                                # needs DATABASE_URL (read from your shell)
```

`pnpm db:migrate` reads `DATABASE_URL` from the environment. Export it first, or run
`set -a; source .env; set +a` in your shell.

## Run

```bash
pnpm dev
```

This starts the API on http://localhost:4000, the web app on http://localhost:3000 and the Expo
dev server (scan the QR code with Expo Go). The web page and the app's status screen both show
`API: ok` when everything is connected.

To run one app: `pnpm --filter @film/api dev`, `pnpm --filter @film/web dev` or
`pnpm --filter @film/mobile start`.

## Scripts

| Command                                   | What it does                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm build`                              | Builds the API bundle and the web app                                                     |
| `pnpm lint` / `pnpm format:check`         | ESLint and Prettier, zero warnings allowed                                                |
| `pnpm typecheck`                          | TypeScript in strict mode across every workspace                                          |
| `pnpm test`                               | Unit tests (Vitest, Jest for mobile); no database needed                                  |
| `pnpm test:integration`                   | API and migration tests against Postgres (`TEST_DATABASE_URL`)                            |
| `pnpm test:coverage`                      | All API and domain tests with the 80% line-coverage gate                                  |
| `pnpm test:e2e`                           | Playwright: starts the built API and web app and checks the page (run `pnpm build` first) |
| `pnpm boundaries`                         | Import-boundary rules plus a self-test proving they fail when broken                      |
| `pnpm contract:generate`                  | Regenerates `packages/contracts` from the API's route schemas                             |
| `pnpm contract:check`                     | Fails if the committed contract differs from what the API generates                       |
| `pnpm db:migrate`                         | Applies pending migrations (advisory-locked)                                              |
| `pnpm db:generate`                        | Generates a migration from schema changes in `packages/db/src/schema.ts`                  |
| `pnpm db:check`                           | Migration metadata, schema drift and merged-migration checks                              |
| `pnpm --filter @film/mobile export:check` | Bundles the mobile app for iOS and Android                                                |

## Changing the API

1. Change or add a route in `apps/api/src/routes`, with Zod schemas and a `config.access`
   declaration (`'public'`, `'authenticated'` or `{ entitlement }`). A route without one fails
   at startup.
2. Run `pnpm contract:generate` and commit the updated `packages/contracts` files.
3. Web and mobile pick up the new types through `@film/contracts`.

## Changing the database

Edit `packages/db/src/schema.ts`, run `pnpm db:generate`, review the SQL and commit it.
Migrations only move forward. Never edit a migration that has been merged; follow the rules in
[docs/decisions/0004-database-migrations.md](docs/decisions/0004-database-migrations.md).

## Testing on a physical phone

See [docs/testing/physical-devices.md](docs/testing/physical-devices.md).

## Contributing

All changes go through a pull request to `main`. CI (`.github/workflows/ci.yml` and
`security.yml`) must pass and an approving review is required before merging. Setup steps for
these protections are in [docs/github/branch-protection.md](docs/github/branch-protection.md).

## Troubleshooting

| Symptom                              | Fix                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API exits with `Invalid environment` | It lists each missing or malformed variable. Compare your `.env` with `.env.example`                                                                   |
| `/ready` returns 503                 | Postgres isn't reachable at `DATABASE_URL`: `docker compose -f infra/compose.yml ps`                                                                   |
| Phone shows `API: unavailable`       | `EXPO_PUBLIC_API_URL` must be your computer's LAN IP, not `localhost`, and the phone must be on the same Wi-Fi. Restart `expo start` after changing it |
| Playwright can't find a browser      | `pnpm --filter @film/web exec playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`                                                    |
| `contract:check` fails in CI         | Run `pnpm contract:generate` locally and commit the result                                                                                             |
