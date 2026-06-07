-- Add revenue_event: the normalized, gateway-agnostic revenue ledger fed by
-- VERIFIED payment webhooks (Stripe, Dodo, Polar, Lemon Squeezy, Razorpay).
-- Each gateway adapter normalizes its native payload into this one shape.
--
-- Distinct from the legacy `revenue` table (client-side, self-reported). All
-- "Spent" / payment-journey views read ONLY from here.
--
--   * amount_minor is in the gateway's original minor units (cents, paise…).
--     Refunds/disputes are stored as NEGATIVE amounts (type='refund'|'dispute').
--   * Idempotency: UNIQUE (gateway, gateway_event_id) — webhook retries no-op.
--
-- relationMode = "prisma": no FK constraints (only the indexes Prisma emits).
-- Idempotent so it is safe to (re)run.

CREATE TABLE IF NOT EXISTS "revenue_event" (
    "revenue_event_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "distinct_id" VARCHAR(50),
    "session_id" UUID,
    "gateway" VARCHAR(30) NOT NULL,
    "gateway_event_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "amount_base_minor" BIGINT,
    "base_currency" VARCHAR(10),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revenue_event_pkey" PRIMARY KEY ("revenue_event_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "revenue_event_gateway_gateway_event_id_key" ON "revenue_event" ("gateway", "gateway_event_id");
CREATE INDEX IF NOT EXISTS "revenue_event_website_id_idx" ON "revenue_event" ("website_id");
CREATE INDEX IF NOT EXISTS "revenue_event_website_id_occurred_at_idx" ON "revenue_event" ("website_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "revenue_event_session_id_idx" ON "revenue_event" ("session_id");
CREATE INDEX IF NOT EXISTS "revenue_event_distinct_id_idx" ON "revenue_event" ("distinct_id");
CREATE INDEX IF NOT EXISTS "revenue_event_website_id_distinct_id_idx" ON "revenue_event" ("website_id", "distinct_id");
