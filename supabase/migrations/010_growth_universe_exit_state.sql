-- 010_growth_universe_exit_state.sql
-- Tactical residual exit state for /wealth fiches: 'hold' | 'intact' | 'broken'.
-- Written by apex-wealth growth_dip_alert.py snapshot (_compute_exit_state),
-- synced as-is by algoproof_sync.sync_growth_universe (SELECT * -> dict(row)).
-- Drives sellPlanLines: replaces the circular "solder le reste a la sortie" with
-- a real trend-break rule (close below a falling MA50) and a live broken state.
-- Idempotent; applied 2026-06-03 via psycopg2 (project avdegocswrhzdnvsyiui).

ALTER TABLE growth_universe ADD COLUMN IF NOT EXISTS exit_state TEXT;
