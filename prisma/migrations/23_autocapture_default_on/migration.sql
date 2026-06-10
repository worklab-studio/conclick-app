-- Autocapture (and the privacy-first friction signals it gates) on by default for
-- all sites; owners can still turn it off per site. Flips the column default and
-- enables it on existing, non-deleted websites.
ALTER TABLE "website" ALTER COLUMN "autocapture_enabled" SET DEFAULT true;
UPDATE "website" SET "autocapture_enabled" = true
  WHERE "autocapture_enabled" = false AND "deleted_at" IS NULL;
