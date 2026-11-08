-- Baseline extensions. No domain tables until Phase 1.
-- pgcrypto: gen_random_bytes() and digest() for tokens; citext: case-insensitive email columns.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;
