#!/usr/bin/env bash
# 1. drizzle-kit reports consistent migration metadata.
# 2. The schema has no changes that lack a migration (generate creates nothing).
# 3. Migrations already on the base branch were not edited or deleted.
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm --filter @film/db drizzle:check

pnpm --filter @film/db generate >/dev/null
if [ -n "$(git status --porcelain -- packages/db/migrations)" ]; then
  echo "Schema drift: drizzle-kit generated a migration. Commit it with your schema change." >&2
  git status --porcelain -- packages/db/migrations >&2
  exit 1
fi

base="${MIGRATION_BASE_REF:-origin/main}"
if git rev-parse --verify --quiet "$base" >/dev/null; then
  changed="$(git diff --name-status "$base"...HEAD -- packages/db/migrations | grep -v '^A' || true)"
  if [ -n "$changed" ]; then
    echo "Merged migrations must not change. Write a new migration instead:" >&2
    echo "$changed" >&2
    exit 1
  fi
else
  echo "Base ref $base not found; skipping the merged-migration check."
fi
echo "Migration checks passed."
