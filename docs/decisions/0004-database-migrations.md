# ADR 0004: Database and migration rules

- Status: Accepted
- Date: 2026-11-07

## Decision

- Drizzle schema in `packages/db/src/schema.ts`; `drizzle-kit generate` writes SQL migrations that
  are committed and reviewed. Raw SQL is allowed for RLS policies, triggers and indexes.
- Migrations only move forward. Undo with a new migration.
- Expand and contract: add, backfill, switch reads, remove in a later release, so a deployed API
  and older mobile apps keep working during rollouts.
- Every table gets `id uuid` (v7), `created_at` and `updated_at`. Tenant tables get `org_id`
  from Phase 8. snake_case names. Every foreign key has an index.
- `pnpm db:migrate` runs under a Postgres advisory lock. The API never migrates on boot.
- CI applies migrations to an empty database and fails on schema drift or on edits to migrations
  that already exist on the base branch (`scripts/check-migrations.sh`).
- Integration tests each get a throwaway database cloned from a migrated template.

Migration `0000_init_extensions` enables `pgcrypto` and `citext` only.
