/*
# Add price_per_hour to resources

1. Changes
- Add `price_per_hour` column to `resources` table: numeric(10,2), nullable, default 0.
  Represents the hourly booking cost of a resource in INR.
2. Security
- No new tables. Existing RLS policies and grants on `resources` still apply.
- Re-grant UPDATE on resources to anon, authenticated to ensure the new column
  is covered by any column-restricted grants from earlier demo policies.
*/

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS price_per_hour numeric(10,2) DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON resources TO anon, authenticated;
