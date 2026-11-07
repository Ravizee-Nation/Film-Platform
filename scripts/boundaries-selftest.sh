#!/usr/bin/env bash
# Proves the boundary check actually fails: plants a forbidden import of
# packages/db in apps/web, expects dependency-cruiser to reject it, then removes it.
set -euo pipefail
cd "$(dirname "$0")/.."

fixture="apps/web/lib/__boundary_selftest__.ts"
trap 'rm -f "$fixture"' EXIT
printf "import { runMigrations } from '../../../packages/db/src/index';\nexport const leak = runMigrations;\n" > "$fixture"

if pnpm exec depcruise apps/web --config .dependency-cruiser.cjs >/dev/null 2>&1; then
  echo "Boundary self-test FAILED: importing @film/db from apps/web was not rejected." >&2
  exit 1
fi
echo "Boundary self-test passed: forbidden import was rejected."
