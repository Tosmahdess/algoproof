-- 009_growth_universe_sell_pct.sql
-- Expose the take-profit sell amounts on /wealth (and the fiche panel):
-- "TP1 +25% → vendre 25%". Written by apex-wealth growth_dip_alert.py snapshot,
-- synced as-is by algoproof_sync.sync_growth_universe (SELECT * → dict(row)).
-- Idempotent; apply via Supabase SQL editor (project avdegocswrhzdnvsyiui).

ALTER TABLE growth_universe ADD COLUMN IF NOT EXISTS tp1_sell_pct REAL;
ALTER TABLE growth_universe ADD COLUMN IF NOT EXISTS tp2_sell_pct REAL;
