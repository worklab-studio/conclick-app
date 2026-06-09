-- Per-website autocapture toggle (opt-in; default off). Additive + idempotent.
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "autocapture_enabled" BOOLEAN NOT NULL DEFAULT false;
