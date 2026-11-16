// Drizzle table definitions.
//
// D7 PROOF OF CONCEPT (branch poc/d7-better-auth, never merged): the tables
// below are the identity tables Better Auth 1.7.25 requires, mapped to our
// conventions (plural snake_case names, uuid keys, indexed foreign keys).
// Property names must match Better Auth's field names; the database client
// and drizzle-kit both use `casing: 'snake_case'` for the column names.
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Case-insensitive text (the citext extension, enabled in migration 0000). Email
 * uniqueness is enforced by the database, not only by the library lowercasing input.
 */
const citext = customType<{ data: string }>({ dataType: () => 'citext' });

// With `generateId: 'uuid'` Better Auth omits ids on insert and the database
// generates them (gen_random_uuid, UUID v4). ADR 0004 asks for v7; PostgreSQL 17
// has no built-in v7 generator, so this is recorded as a trial finding.
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

/** One row per person. Every sign-in method and session points here. */
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: citext().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  ...timestamps,
});

/** Server-side sessions: one per signed-in device; deleting a row revokes it. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps,
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

/** Sign-in methods ("identities"): email+password, Apple, Google. */
export const accounts = pgTable(
  'accounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
    // One provider identity (e.g. one Apple subject) can belong to only one user,
    // even when two link or sign-in requests race.
    unique('accounts_provider_account_unique').on(table.providerId, table.accountId),
  ],
);

/** Single-use tokens: email verification and password reset. */
export const verifications = pgTable(
  'verifications',
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

/**
 * Database-backed rate-limit counters (shared across API instances).
 * `lastRequest` is owned by the library and must stay epoch milliseconds (it does
 * arithmetic on it); `created_at`/`updated_at` follow ADR 0004, and a trigger in
 * migration 0002 keeps `updated_at` current because the library never writes it.
 */
export const rateLimits = pgTable('rate_limits', {
  id: uuid().primaryKey().defaultRandom(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: 'number' }).notNull(),
  ...timestamps,
});
