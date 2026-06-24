-- Migration 011: Allow 'archived' bot status
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- 'archived' bots stay listed on /strategies (with a badge) but are excluded from
-- performance and aggregate stats. Distinct from 'frozen', which is hidden everywhere.

ALTER TABLE bots
  DROP CONSTRAINT IF EXISTS bots_status_check;

ALTER TABLE bots
  ADD CONSTRAINT bots_status_check
  CHECK (status IN ('paper', 'live', 'backtest', 'frozen', 'archived'));
