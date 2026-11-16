# ADR 0001: Technology stack

- Status: Accepted (decision D1 fully approved by the owner on 2026-11-16; conditionally approved
  from 2026-11-07 until the device proof of concept passed)
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
choice was to be revisited if the Phase 0 physical-device proof of concept failed its scroll or
screen-reader targets (Phase 0 completion criterion 14). It passed on iPhone and Android, so the
condition is met.

TypeScript is pinned to 6.0 because `typescript-eslint` does not yet support 7.x.
