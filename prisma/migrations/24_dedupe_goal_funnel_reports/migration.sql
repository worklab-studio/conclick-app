-- Goals/funnels could be saved twice (no uniqueness anywhere): the builder,
-- smart-setup "Add all", and save-as-funnel all bare-created reports. Delete the
-- duplicates (keeping the OLDEST of each identical goal/funnel — report_id breaks
-- created_at ties), then lock it in with a partial unique index. JSONB equality is
-- semantic, so key order/whitespace differences don't dodge the constraint.
DELETE FROM report a
USING report b
WHERE a.type = b.type
  AND a.website_id = b.website_id
  AND a.parameters = b.parameters
  AND a.type IN ('goal','funnel')
  AND (a.created_at > b.created_at
       OR (a.created_at = b.created_at AND a.report_id > b.report_id));

CREATE UNIQUE INDEX IF NOT EXISTS report_website_type_parameters_uniq
  ON report(website_id, type, parameters)
  WHERE type IN ('goal','funnel');
