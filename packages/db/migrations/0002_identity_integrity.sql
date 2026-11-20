ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE citext;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_provider_account_unique" UNIQUE("provider_id","account_id");--> statement-breakpoint
-- Hand-written (ADR 0004 allows raw SQL for triggers). drizzle-kit printed the citext
-- type as "undefined"."citext" above; corrected by hand.
-- Better Auth never writes rate_limits.updated_at, so keep it current here.
CREATE FUNCTION "set_updated_at"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "rate_limits_set_updated_at" BEFORE UPDATE ON "rate_limits"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
