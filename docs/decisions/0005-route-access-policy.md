# ADR 0005: Deny-by-default route access policy

- Status: Accepted
- Date: 2026-11-07

## Decision

Every API route declares `config.access` as `'public'`, `'authenticated'` or
`{ entitlement: string }`. A route without a declaration throws `MissingRouteAccessError` at
startup. Until Phase 1 adds sign-in, every non-public route returns 401 `UNAUTHENTICATED`.
Entitlement checks are added in Phase 2 and run on the server only.

The CORS plugin's internal preflight route is registered before the policy and answers in
`onRequest`, so it never reaches a handler.
