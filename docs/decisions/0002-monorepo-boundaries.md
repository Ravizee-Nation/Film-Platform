# ADR 0002: Monorepo structure and import boundaries

- Status: Accepted
- Date: 2026-11-07

## Decision

Three apps (`api`, `web`, `mobile`) and five packages (`contracts`, `domain`, `db`, `ui`,
`config`). Rules, enforced by `.dependency-cruiser.cjs` in CI:

- Web and mobile never import `packages/db` or `apps/api`; they use `@film/contracts`.
- Only `apps/api` depends on `packages/db`.
- Packages never import apps; apps never import each other.
- `packages/domain` and `packages/ui` depend on no other workspace package.
- Mobile app code imports no Node.js built-ins.
- Every import must resolve, and there are no circular dependencies.

`scripts/boundaries-selftest.sh` plants a forbidden import and proves the check fails.

`apps/workers` is not created until the first background job (Phase 4 or 6).
