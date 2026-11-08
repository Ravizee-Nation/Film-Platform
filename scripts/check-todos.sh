#!/usr/bin/env bash
# Every TODO/FIXME must link to an issue, e.g. "TODO(#42): ..." or a full issue URL.
set -euo pipefail
cd "$(dirname "$0")/.."

matches="$(git grep -n -I -E '\b(TODO|FIXME)\b' -- ':!scripts/check-todos.sh' ':!pnpm-lock.yaml' ':!docs/**' \
  | grep -v -E '(TODO|FIXME)\((#[0-9]+|https://github\.com/[^)]+/issues/[0-9]+)\)' || true)"
if [ -n "$matches" ]; then
  echo "TODO/FIXME without an issue link:" >&2
  echo "$matches" >&2
  exit 1
fi
echo "No unlinked TODOs."
