-- Migration 007: Update family check constraint to 3 canonical families
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new

ALTER TABLE bots
  DROP CONSTRAINT IF EXISTS bots_family_check;

ALTER TABLE bots
  ADD CONSTRAINT bots_family_check
  CHECK (family IN ('trend', 'breakout', 'mean-reversion'));
