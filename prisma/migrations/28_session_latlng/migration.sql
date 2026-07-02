-- Persist geoip lat/lng on the session so the live-visitor map can plot real
-- pins instead of falling back to a hardcoded city table / Null Island.
-- Populated going forward at ingestion (no backfill — IPs aren't stored).
-- Idempotent so it's safe to re-apply. relationMode="prisma" → plain columns.
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
