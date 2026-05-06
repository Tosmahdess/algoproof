-- Migration 001: Add family column to bots table
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new

ALTER TABLE bots
  ADD COLUMN IF NOT EXISTS family text
  CHECK (family IN ('trend','breakout','multi-signal','multi-asset','leveraged'));

UPDATE bots
SET family = 'trend'
WHERE slug IN ('v1-spot', 'v1-hl')
  AND family IS NULL;
