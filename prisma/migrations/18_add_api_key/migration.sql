-- Add api_key: hashed, revocable programmatic access tokens (for the MCP server
-- and any agent / script). Only the SHA-256 hash is stored — never the key.
--
-- relationMode = "prisma": no FK constraints (only the indexes Prisma emits).
-- Idempotent so it is safe to (re)run.

CREATE TABLE IF NOT EXISTS "api_key" (
    "api_key_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "scope" VARCHAR(20) NOT NULL DEFAULT 'all',
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    CONSTRAINT "api_key_pkey" PRIMARY KEY ("api_key_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_key_key_hash_key" ON "api_key" ("key_hash");

CREATE INDEX IF NOT EXISTS "api_key_user_id_idx" ON "api_key" ("user_id");
