-- Sync Conclick-specific schema drift into the migration history.
--
-- The columns/tables below were added to dev and to the Fly production database via
-- `prisma db push` without ever generating migration files. As a result, building a
-- database purely from migrations 01-15 produces a schema that is missing them, and the
-- app crashes with `column ... does not exist` on user queries (this caused a post-login
-- redirect loop on the Fly production DB, which was patched live with `db push`).
--
-- This migration reconciles a migrations-only database with prisma/schema.prisma. It was
-- derived from:
--   prisma migrate diff --from-migrations prisma/migrations \
--     --to-schema-datamodel prisma/schema.prisma --shadow-database-url <local pg> --script
--
-- Every statement is idempotent (IF NOT EXISTS) so it can also be safely (re)run against a
-- database that already received these objects via `db push`.
--
-- relationMode = "prisma": relations are enforced in the Prisma client, so NO foreign key
-- constraints are created here (only the indexes Prisma emits), matching `migrate diff`.

-- AlterTable: "user" — subscription (Lemon Squeezy), trial, and password-reset columns (all nullable)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_id"        VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_status"    VARCHAR(50);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_plan"      VARCHAR(50);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_ends_at"   TIMESTAMPTZ(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "customer_id"            VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lemon_order_id"         VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "current_period_ends_at" TIMESTAMPTZ(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ends_at"                TIMESTAMPTZ(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "email"                  VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_started_at"       TIMESTAMPTZ(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_ends_at"          TIMESTAMPTZ(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_reset_token"   VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMPTZ(6);

-- AlterTable: "website" — per-website Stripe connection columns (all nullable)
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "stripe_id"              VARCHAR(50);
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "stripe_secret_key"      VARCHAR(255);
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "stripe_publishable_key" VARCHAR(255);

-- CreateTable: "notification"
CREATE TABLE IF NOT EXISTS "notification" (
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable: "webhook_event"
CREATE TABLE IF NOT EXISTS "webhook_event" (
    "event_id" UUID NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_user_id_idx" ON "notification"("user_id");
