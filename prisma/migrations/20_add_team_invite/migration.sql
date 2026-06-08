-- Add team_invite: email-based team invitations (token link → accept → join).
-- relationMode = "prisma": no FK constraints (only the indexes Prisma emits).
-- Idempotent + additive so it is safe to (re)run.

CREATE TABLE IF NOT EXISTS "team_invite" (
    "team_invite_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "invited_by_id" UUID,
    "accepted_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    CONSTRAINT "team_invite_pkey" PRIMARY KEY ("team_invite_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_invite_token_key" ON "team_invite" ("token");
CREATE INDEX IF NOT EXISTS "team_invite_team_id_idx" ON "team_invite" ("team_id");
CREATE INDEX IF NOT EXISTS "team_invite_email_idx" ON "team_invite" ("email");
