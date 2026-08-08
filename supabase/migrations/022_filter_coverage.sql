-- Migration 022: filter coverage — catalogue, applicability, sweep registry
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- Feeds the "Tous les filtres essayés sur cette stratégie" section on the concept
-- pages. Two sources that must not be conflated: the engine publishes its
-- INTENTION (catalogue, applicability, per-cell config count, and a dated
-- declaration that a matrix finished), and the verdicts already in base carry the
-- REALISED. The page shows the difference; that difference is the instrument.
--
-- ⚠️ EVERY `create table` HERE IS FOLLOWED BY AN EXPLICIT REVOKE.
-- Supabase ships ALTER DEFAULT PRIVILEGES on schema public, so a newly created
-- table is granted INSERT/UPDATE/DELETE/TRUNCATE to anon automatically. The
-- 2026-08-02 audit found all 35 existing tables open that way. Creating a table
-- without revoking re-opens the hole this project just spent an evening closing.
-- Note also that RLS never gates TRUNCATE: only the grant does.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.filter_catalog (
  key              text primary key,
  label_fr         text not null,
  plain_fr         text not null,
  family_tags      jsonb not null,
  tf_tags          jsonb not null,
  coded_state      text not null,
  narrowing_reason text,
  published_at     timestamptz not null
);

create table if not exists public.filter_applicability (
  base             text not null,
  tf               text not null,
  filter_key       text not null,
  applicable       boolean not null,
  exclusion_reason text,
  n_configs        bigint,
  primary key (base, tf, filter_key)
);

create table if not exists public.sweep_coverage (
  base            text not null,
  tf              text not null,
  kmax            integer not null,
  dataset_version text not null,
  completed_at    timestamptz not null,
  primary key (base, tf, dataset_version, kmax)
);

-- An inapplicable cell must say why, and an applicable one must not pretend to.
-- Without this the page cannot tell a deliberate exclusion from a hole, which is
-- the whole point of the section.
alter table public.filter_applicability
  drop constraint if exists filter_applicability_reason_check;
alter table public.filter_applicability
  add constraint filter_applicability_reason_check
  check ((applicable and exclusion_reason is null)
      or ((not applicable) and exclusion_reason is not null));

-- A count belongs to an applicable cell and to no other.
alter table public.filter_applicability
  drop constraint if exists filter_applicability_count_check;
alter table public.filter_applicability
  add constraint filter_applicability_count_check
  check ((applicable and n_configs is not null and n_configs >= 0)
      or ((not applicable) and n_configs is null));

alter table public.filter_catalog
  drop constraint if exists filter_catalog_coded_state_check;
alter table public.filter_catalog
  add constraint filter_catalog_coded_state_check
  check (coded_state in ('active', 'shadowed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Close the default grants THIS migration just handed out
-- ─────────────────────────────────────────────────────────────────────────────

revoke insert, update, delete, truncate, references, trigger
  on public.filter_catalog, public.filter_applicability, public.sweep_coverage
  from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row security: public read, no public write
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.filter_catalog       enable row level security;
alter table public.filter_applicability enable row level security;
alter table public.sweep_coverage       enable row level security;

drop policy if exists filter_catalog_select_public on public.filter_catalog;
create policy filter_catalog_select_public
  on public.filter_catalog for select to anon, authenticated using (true);

drop policy if exists filter_applicability_select_public on public.filter_applicability;
create policy filter_applicability_select_public
  on public.filter_applicability for select to anon, authenticated using (true);

drop policy if exists sweep_coverage_select_public on public.sweep_coverage;
create policy sweep_coverage_select_public
  on public.sweep_coverage for select to anon, authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- THE CONFIDENTIALITY BOUNDARY
-- ─────────────────────────────────────────────────────────────────────────────
-- Shape confirmed against production on 2026-08-02: engine_verdicts.survivors is
-- a jsonb array whose entries carry an object `filters`, keyed by filter name —
-- e.g. {"ma_stack": {"stack": "20-50"}, "mtf_align": {"depth": 3}}. The VALUES of
-- that object are the settings, which are the paid product; only the KEYS cross
-- this boundary.
--
-- Aggregated to (base, filter_key): one boolean per filter over the whole
-- strategy. Never per timeframe, never per survivor, never a count. A strategy
-- with a single survivor and three ticked rows would otherwise reveal that
-- survivor's exact triplet.

create or replace view public.filter_survivor_presence as
select v.base,
       f.key as filter_key,
       true  as present
from public.engine_verdicts v
cross join lateral jsonb_array_elements(v.survivors) s
cross join lateral jsonb_object_keys(s -> 'filters') f(key)
group by v.base, f.key;

-- Survivor count per base, for the k-anonymity rule (spec §7: below 3 survivors,
-- no row is ticked at all).
create or replace view public.survivor_counts as
select v.base,
       count(*)::bigint as n_survivors
from public.engine_verdicts v
cross join lateral jsonb_array_elements(v.survivors)
group by v.base;

-- Views are created by the migration owner and run with its rights, so they read
-- engine_verdicts regardless of what anon may hold on that table. That is what
-- lets a future migration revoke SELECT on engine_verdicts without breaking this.
grant select on public.filter_survivor_presence to anon, authenticated;
grant select on public.survivor_counts to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.filter_survivor_presence, public.survivor_counts
  from anon, authenticated;
