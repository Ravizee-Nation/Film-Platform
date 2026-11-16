#!/usr/bin/env bash
# Proves scripts/check-migration-history.sh in a throwaway git repository:
# adding a migration (with its journal entry) passes; editing or deleting an
# existing migration file, or editing or removing an existing journal entry, fails.
set -euo pipefail
cd "$(dirname "$0")/.."
check="$PWD/scripts/check-migration-history.sh"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q -b main
git config user.email selftest@example.test
git config user.name "Migration self-test"
mkdir -p packages/db/migrations/meta

journal() { # journal <tag>... : writes a drizzle-style journal with these entries
  node -e '
    const entries = process.argv.slice(1).map((tag, idx) => ({ idx, version: "7", when: 1000 + idx, tag, breakpoints: true }));
    process.stdout.write(JSON.stringify({ version: "7", dialect: "postgresql", entries }, null, 2));
  ' "$@" > packages/db/migrations/meta/_journal.json
}

echo "create extension if not exists citext;" > packages/db/migrations/0000_init.sql
journal 0000_init
git add -A && git commit -qm base

failures=0
expect() { # expect <pass|fail> <description> : runs the check against main on the current branch
  if bash "$check" main >/dev/null 2>&1; then result=pass; else result=fail; fi
  if [ "$result" = "$1" ]; then
    echo "ok   - $2 ($result)"
  else
    echo "FAIL - $2: expected $1, got $result" >&2
    failures=$((failures + 1))
  fi
}

scenario() { # scenario <name> : fresh branch from main
  git checkout -q main && git checkout -q -b "$1"
}

scenario add-migration
echo "create table films (id uuid primary key);" > packages/db/migrations/0001_films.sql
journal 0000_init 0001_films
git add -A && git commit -qm add
expect pass "adding a migration and its journal entry"

scenario edit-migration
echo "-- edited" >> packages/db/migrations/0000_init.sql
git add -A && git commit -qm edit
expect fail "editing an existing migration file"

scenario delete-migration
git rm -q packages/db/migrations/0000_init.sql && git commit -qm delete
expect fail "deleting an existing migration file"

scenario edit-journal-entry
journal 0000_renamed
git add -A && git commit -qm rename
expect fail "editing an existing journal entry"

scenario remove-journal-entry
echo "create table films (id uuid primary key);" > packages/db/migrations/0001_films.sql
journal 0001_films
git add -A && git commit -qm drop-entry
expect fail "removing an existing journal entry while adding another"

if [ "$failures" -gt 0 ]; then
  echo "Migration history self-test FAILED ($failures case(s))." >&2
  exit 1
fi
echo "Migration history self-test passed."
