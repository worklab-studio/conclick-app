-- Add payment_integration: per-website connected payment gateway with ENCRYPTED
-- credentials (replaces storing provider secret keys in plaintext columns).
--
-- relationMode = "prisma": relations are enforced in the Prisma client, so NO
-- foreign-key constraints are created here (only the indexes Prisma emits).
-- Statements are idempotent so this is safe to (re)run.

CREATE TABLE IF NOT EXISTS "payment_integration" (
    "integration_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "credentials" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "payment_integration_pkey" PRIMARY KEY ("integration_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_integration_website_id_provider_key"
    ON "payment_integration" ("website_id", "provider");

CREATE INDEX IF NOT EXISTS "payment_integration_website_id_idx"
    ON "payment_integration" ("website_id");
