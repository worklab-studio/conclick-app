-- Growth milestones ledger (first 100/500/1k/5k/10k…/1M visitors or revenue).
-- The unique index gives "celebrate once" for free; notified_at gates the
-- daily digest's exactly-once announcement. relationMode="prisma" → no FKs.
-- Idempotent so it's safe to re-apply.
CREATE TABLE IF NOT EXISTS "milestone" (
  "milestone_id" UUID NOT NULL,
  "website_id"   UUID NOT NULL,
  "type"         VARCHAR(20) NOT NULL,
  "threshold"    BIGINT NOT NULL,
  "reached_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notified_at"  TIMESTAMPTZ(6),
  CONSTRAINT "milestone_pkey" PRIMARY KEY ("milestone_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "milestone_website_id_type_threshold_key"
  ON "milestone" ("website_id", "type", "threshold");

CREATE INDEX IF NOT EXISTS "milestone_website_id_idx" ON "milestone" ("website_id");
