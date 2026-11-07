# ADR 0003: Contract-first REST API generated from route schemas

- Status: Accepted
- Date: 2026-11-07

## Decision

Routes declare Zod schemas for params, body and every response. `@fastify/swagger` with
`fastify-type-provider-zod` produces `packages/contracts/openapi.json` (OpenAPI 3.1);
`openapi-typescript` turns it into types; `openapi-fetch` provides the typed client. CI
regenerates both and fails on any difference.

- Routes are versioned under `/v1` (system routes `/health` and `/ready` are unversioned).
- One error shape everywhere: `{ error: { code, message, requestId, details? } }`, codes defined in
  `packages/domain`. 4xx/5xx responses are declared on every route.
- `GET /v1/meta` returns `minimumClientVersion` for forced upgrades from Phase 1.
