-- Google moved from per-user OAuth to a single service account ("invite our
-- reader"). Connections now store only a property selection — no tokens — so the
-- refresh_token column must be nullable. Existing columns are kept (nullable)
-- for backward compatibility; no data is dropped.
ALTER TABLE "google_connection" ALTER COLUMN "refresh_token" DROP NOT NULL;
