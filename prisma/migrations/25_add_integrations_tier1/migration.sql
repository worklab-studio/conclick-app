-- Tier-1 integrations: founder notification channels (Slack/Discord/Telegram),
-- per-website Google connections (Search Console + GA4), and imported historical
-- stats (GA4 backfill shown as an overlay on the Overview chart).

CREATE TABLE IF NOT EXISTS "notification_channel" (
    "channel_id"     UUID NOT NULL,
    "user_id"        UUID NOT NULL,
    "type"           VARCHAR(20) NOT NULL,
    "label"          VARCHAR(100),
    "config"         TEXT NOT NULL,
    "digest"         BOOLEAN NOT NULL DEFAULT true,
    "payment_alerts" BOOLEAN NOT NULL DEFAULT true,
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_channel_pkey" PRIMARY KEY ("channel_id")
);
CREATE INDEX IF NOT EXISTS "notification_channel_user_id_idx" ON "notification_channel"("user_id");

CREATE TABLE IF NOT EXISTS "google_connection" (
    "connection_id"   UUID NOT NULL,
    "website_id"      UUID NOT NULL,
    "email"           VARCHAR(255),
    "refresh_token"   TEXT NOT NULL,
    "access_token"    TEXT,
    "token_expires"   TIMESTAMPTZ(6),
    "gsc_site_url"    VARCHAR(255),
    "ga4_property_id" VARCHAR(50),
    "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(6),

    CONSTRAINT "google_connection_pkey" PRIMARY KEY ("connection_id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "google_connection_website_id_key" ON "google_connection"("website_id");

CREATE TABLE IF NOT EXISTS "imported_stat" (
    "website_id" UUID NOT NULL,
    "date"       DATE NOT NULL,
    "source"     VARCHAR(20) NOT NULL,
    "visitors"   INTEGER NOT NULL DEFAULT 0,
    "pageviews"  INTEGER NOT NULL DEFAULT 0,
    "sessions"   INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_stat_pkey" PRIMARY KEY ("website_id","date","source")
);
CREATE INDEX IF NOT EXISTS "imported_stat_website_id_date_idx" ON "imported_stat"("website_id","date");
