-- Founder daily digest opt-out flag (additive, defaults on).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "daily_digest_enabled" BOOLEAN NOT NULL DEFAULT true;
