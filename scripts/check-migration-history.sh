#!/usr/bin/env bash
# Fails if migrations that already exist on the base ref were edited or deleted.
# Adding a migration is allowed, including the entry drizzle-kit appends to
# meta/_journal.json, provided every journal entry already on the base is unchanged.
# Usage: check-migration-history.sh <base-ref>   (run from the repository root)
set -euo pipefail

base="$1"
dir=packages/db/migrations
journal="$dir/meta/_journal.json"

changed="$(git diff --name-status "$base"...HEAD -- "$dir" | grep -v '^A' || true)"

if printf '%s\n' "$changed" | grep -qx "M[[:space:]]*$journal"; then
  merge_base="$(git merge-base "$base" HEAD)"
  if node -e '
    const [before, after] = process.argv.slice(1).map((text) => JSON.parse(text).entries);
    const unchanged = before.every((entry, i) => JSON.stringify(entry) === JSON.stringify(after[i]));
    process.exit(unchanged && after.length >= before.length ? 0 : 1);
  ' "$(git show "$merge_base:$journal")" "$(git show "HEAD:$journal")"; then
    changed="$(printf '%s\n' "$changed" | grep -vx "M[[:space:]]*$journal" || true)"
  fi
fi

if [ -n "$changed" ]; then
  echo "Merged migrations must not change. Write a new migration instead:" >&2
  echo "$changed" >&2
  exit 1
fi
