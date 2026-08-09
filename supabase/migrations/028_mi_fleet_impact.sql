-- 028_mi_fleet_impact.sql
-- The weekly fleet-impact replay (algolab scripts/mi_impact_report.py) summarised for
-- publication on algoproof.fr/intelligence.
--
-- One row per run, keyed by run_date. History is KEPT, never overwritten: a singleton
-- row would make "republishing silently replaces the previous one" possible, which is
-- the 2026-08-02 incident (two catalogues published on the same key, the first replaced
-- without a trace). The site reads the most recent row.
--
-- Every figure the site prints comes from here, INCLUDING THE WINDOW: the period is
-- derived from window_start/window_end and never typed into copy. A number that moves on
-- its own (this is a weekly cron) has to be derived, or it goes false without anyone
-- touching it.
--
-- UNITS: dd_* are FRACTIONS as the report emits them (-0.0913), not percents. Format to a
-- percent once, at render. Doing it in both places is how a figure gets multiplied by 100
-- twice.
--
-- HONESTY: these are BACKTEST REPLAY figures on paper presets, never live trading. Any
-- public rendering must say so, must state the period, and must never aggregate them with
-- live results (Code de la consommation L121-2).

create table if not exists public.mi_fleet_impact (
  run_date          date primary key,
  window_start      timestamptz not null,
  window_end        timestamptz not null,
  n_presets         integer     not null,
  n_trades          integer     not null,
  n_small_sample    integer     not null,   -- presets with <20 trades in ANY variant
  blocked_red       integer     not null,   -- RED-gate blocks under the 'both' variant
  constant_mult     numeric     not null,
  pnl_baseline      numeric     not null,
  pnl_both          numeric     not null,
  pnl_constant      numeric     not null,
  dd_baseline       numeric     not null,   -- fraction, negative
  dd_both           numeric     not null,
  dd_constant       numeric     not null,
  generated_at      timestamptz not null,
  created_at        timestamptz not null default now()
);

comment on table public.mi_fleet_impact is
  'Weekly MI fleet-impact replay summary. Backtest replay on paper presets, never live '
  'trading: any public rendering must say so (L121-2). One row per run; read the latest. '
  'dd_* are fractions, not percents.';

-- Supabase grants ALL privileges to anon by default on schema public, so the default is
-- open for WRITES, not merely for reads (found in production 2026-08-02: anon held
-- INSERT/UPDATE/DELETE/TRUNCATE on two engine tables). Close it explicitly, then verify
-- from outside with the publishable key — the grant statement running without an error is
-- not the same claim as the table being closed.
revoke all on public.mi_fleet_impact from anon, authenticated;
grant select on public.mi_fleet_impact to anon, authenticated;
