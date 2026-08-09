-- 030_engine_search_space_public.sql
--
-- Publishes the SIZE OF THE SEARCH SPACE per engine unit, so the strategy explainer on
-- algoproof.fr/strategies stops carrying it as six numbers typed by hand.
--
-- WHY A SEPARATE VIEW rather than extending engine_verdicts_public: that view is the
-- redaction surface built by migration 024 after 599 of its 622 finalists were found to
-- carry the complete recipe in clear. Rebuilding it to append three columns means
-- restating its whole SELECT from a file that its own banner warns not to reason from.
-- A small dedicated view is the same result at a fraction of the risk, and it is a
-- different concern anyway: how big the search was, not what the verdicts were.
--
-- The three counts are not secret: they describe how wide the sweep is, which is exactly
-- what the explainer publishes on purpose. They carry no parameter VALUES, so nothing
-- here leaks a recipe.
--
-- ⚠️ The columns are added EMPTY. The engine publisher does not emit them yet (that needs
-- an orchestrator restart at a unit boundary), so they are backfilled from the reports on
-- the box for units already published. Until a unit has them, the site renders its
-- sentence WITHOUT the figures rather than with a stale constant.

alter table public.engine_verdicts
  add column if not exists n_params        integer,
  add column if not exists n_filter_configs integer,
  add column if not exists n_exits         integer;

comment on column public.engine_verdicts.n_params is
  'Size of the parameter grid swept for this base. Backfilled from output/phase2b reports.';
comment on column public.engine_verdicts.n_filter_configs is
  'Number of entry-filter combinations swept (bounded-K library).';
comment on column public.engine_verdicts.n_exits is
  'Number of exit policies swept.';

create or replace view public.engine_search_space_public as
select
  v.base,
  v.tf,
  v.dataset_version,
  v.kmax,
  v.n_params,
  v.n_filter_configs,
  v.n_exits,
  v.n_behaviors,
  (v.n_go + v.n_marginal + v.n_no_go) as n_judged,
  v.published_at
from public.engine_verdicts v
where v.published_at is not null;

comment on view public.engine_search_space_public is
  'Search-space size per published engine unit, for the public strategy explainer. '
  'Carries counts only, never parameter values. n_behaviors is the DEDUPLICATED corpus; '
  'n_judged is the top-K actually sent to the gauntlet.';

-- Supabase grants every privilege to anon by default on schema public: the default is
-- open for WRITES, not just reads (found in production 2026-08-02). Close it, then verify
-- from outside with the publishable key — a grant statement that ran without error is not
-- the same claim as the object answering correctly.
revoke all on public.engine_search_space_public from anon, authenticated;
grant select on public.engine_search_space_public to anon, authenticated;
