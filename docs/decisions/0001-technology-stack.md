# ADR 0001: Technology stack

- Status: Accepted, conditionally (decision D1)
- Date: 2026-11-07

## Context

The platform must ship on iOS, Android and web from one backend with one identity and entitlement
model. The team has no existing codebase.

## Decision

- Mobile: React Native with Expo (SDK 58), Expo Router.
- Web: Next.js (App Router).
- Backend: Node.js 22 LTS, TypeScript, Fastify.
- Database: PostgreSQL (17 in CI and Docker; 16+ supported), Drizzle ORM.
- Monorepo: pnpm workspaces and Turborepo, TypeScript strict mode everywhere.

## Consequences

One language across every app and the backend; shared schemas and a generated API client. The
choice is revisited if the Phase 0 physical-device proof of concept fails its scroll or
screen-reader targets (Phase 0 completion criterion 14).

TypeScript is pinned to 6.0 because `typescript-eslint` does not yet support 7.x.
