-- 047_survivor_strategy_summary.sql
--
-- The exhaustive view asks for 4 MB to draw forty chips.
--
-- Measured on the live database on 2026-09-18, with the anon key and then in the SQL
-- editor with the statement timeout lifted:
--
--   survivor_family_catalog(null)            18.30 s, 4 074 459 bytes
--   survivor_family_all(null,'EMAcross')     teaser branch: over 3 s, never rendered
--   survivor_family_all(null,'EMAcross')     paid branch:   1.49 s, 2 290 423 bytes
--
-- anon gets 3 s per statement, authenticated 8 s. The catalog exceeds BOTH, and
-- /cockpit/survivants/tous calls it FIRST, with no access branch of any kind. So that
-- page is dead for every visitor, paying members and the author included -- the healthy
-- paid branch below it is never reached. The page renders `fail()`'s null as "Donnee
-- indisponible pour le moment", which is the same screen it shows for an empty corpus.
--
-- And here is what the page does with those 4 MB (web/app/(cockpit)/cockpit/survivants/
-- tous/page.tsx:34-49): it derives the list of ~40 strategy names, one survivor count per
-- strategy, and a grand total. Nothing else. The whole family catalog is materialised,
-- serialised, shipped and parsed so that three aggregates can be computed in JavaScript.
--
-- This migration adds the aggregate the page actually needs. It is ADDITIVE: no existing
-- function, grant, policy or row is touched, and dropping this function restores the
-- previous state exactly.
--
-- ---------------------------------------------------------------------------
-- 1. Why the grouping is (strategy, exit_keys) and not strategy alone
--
-- The trailing mask (algolab web/lib/trailing-mask.ts, 2026-09-13) hides every family
-- whose published exit shape contains `trail_mult`, because the re-judgement on the
-- corrected engine showed that NOT ONE trailing recipe keeps its verdict. That module
-- argues at length that the rule is a PROPERTY OF THE ROW rather than a list of names,
-- and that it lives on the read side, in TypeScript.
--
-- A `group by strategy` would destroy the property the mask reads. The page would then
-- display counts LARGER than the list it renders -- on the storefront, next to a paid
-- button. Grouping by exit_keys as well keeps the property intact: the caller applies the
-- SAME TypeScript predicate to each aggregate row and sums what survives. One
-- implementation of the rule, in the place that already owns it.
--
-- The consequence, stated so nobody has to rediscover it: if the mask ever reads another
-- field, that field must enter this GROUP BY. What fails if it does not is the parity check
-- in supabase/tests/survivor_strategy_summary_live.sql, and it compares the two counters
-- SEPARATELY and in their own units: sum(family_count) here against the number of families
-- the catalog publishes, and sum(survivor_count) here against the sum of the catalog's
-- survivor_count. Survivors and families are not interchangeable, and a check that mixed
-- them would pass while being wrong.
--
-- ---------------------------------------------------------------------------
-- 2. Why the generation resolution is written as a join here
--
-- 043 resolves "the current generation OF THIS PAIR" with a correlated scalar subquery.
-- It is the right SEMANTICS and this migration keeps it exactly: a pair yields to its own
-- newer generation and to nothing else, so a pair that has not been recomputed keeps
-- showing what we know about it.
--
-- But PostgreSQL cannot turn a correlated scalar subquery into a join; it runs it once per
-- row. Measured on the live plan for that predicate alone:
--
--   Seq Scan on survivor_family_member  ... rows=122111
--     Filter: dataset_version = COALESCE((SubPlan 2))
--     SubPlan 2 -> Index Scan Backward using survivor_family_member_pkey ... loops=136661
--   Buffers: shared hit=569984
--
-- 569 984 buffers -- about 4.5 GB of buffer traffic -- to return one integer. The SubPlan
-- itself is already optimal: an index scan backward on the primary key at 0.015 ms each.
-- NOTHING NEEDS INDEXING FOR THE CORRELATION. Its repetition is the whole cost.
--
-- The `current_generation` CTE below computes the same max once per pair, in one pass, and
-- joins it. The inner join cannot change the result set: every row the outer query can
-- return already satisfies the published_at window, so its own (base, tf) is necessarily
-- present in the CTE.
--
-- This function is where that form gets proven in production. Rewriting the four existing
-- functions the same way is a separate, later migration, and it will carry an equivalence
-- test against a restored snapshot -- this one cannot break them because it does not
-- touch them.
--
-- ---------------------------------------------------------------------------
-- 3. What it does NOT do
--
-- * It does not replace survivor_family_catalog, whose per-family payload other callers
--   may still want. It gives the page a cheaper question to ask.
-- * It does not move the paid boundary: family counts and strategy names are already
--   public on /cockpit/survivants, and no recipe, parameter, filter value, pf, dd or
--   trade count crosses this function.
-- * It does not read `recipe` or `signature`, the two jsonb columns that make the table
--   182 MB for 136 661 rows. That is deliberate: it is what makes the covering index of
--   supabase/manual/2026-09-18_survivor_family_member_aggregate_index.sql able to answer
--   this function without the heap. Whether the planner actually chooses an index-only scan
--   is measured there, not assumed here.
--
-- One thing this function does NOT fix on its own: without that index it still makes two
-- passes over the heap, and one pass alone was measured at 2.29 s. Do not wire the page to
-- it until it has been timed under the real anon budget -- `set local role anon; set local
-- statement_timeout = '3s'` -- because the 18.30 s above was measured with the timeout
-- lifted, and a function that merely fails faster is not a fix.

create or replace function public.survivor_strategy_summary(
  p_dataset text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with current_generation as (
    select m.base,
           m.tf,
           pg_catalog.max(m.dataset_version) as dataset_version
      from public.survivor_family_member m
     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
     group by m.base, m.tf
  ), corpus as (
    select m.base,
           m.family_id,
           m.exit_keys_txt
      from public.survivor_family_member m
      join current_generation g
        on g.base = m.base
       and g.tf = m.tf
     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and m.dataset_version = coalesce(p_dataset, g.dataset_version)
  ), families as (
    -- Mirrors survivor_family_catalog exactly: it groups by family_id and takes
    -- min(base) / min(exit_keys_txt), so a family_id that somehow spanned two bases
    -- would be counted here the way the catalog counts it, not a different way.
    --
    -- The cast to jsonb is NOT cosmetic, and it was found by running both forms against
    -- crafted rows: `["atr_mult","rr"]` and `[ "atr_mult", "rr" ]` are two different TEXTS
    -- and one single jsonb value. Grouping on the text would split one exit shape into two
    -- aggregate rows, which the caller's mask would then judge twice. The catalog publishes
    -- `exit_keys` as `exit_keys_txt::jsonb`, so grouping on the jsonb is what makes this
    -- function's rows line up with the catalog's families one for one.
    select family_id,
           pg_catalog.min(base) as strategy,
           pg_catalog.min(exit_keys_txt)::jsonb as exit_keys,
           pg_catalog.count(*)::integer as survivor_count
      from corpus
     group by family_id
  )
  select pg_catalog.jsonb_build_object(
    'strategies', coalesce(
      (
        select pg_catalog.jsonb_agg(
                 pg_catalog.jsonb_build_object(
                   'strategy', strategy,
                   'exit_keys', exit_keys,
                   'family_count', family_count,
                   'survivor_count', survivor_count
                 )
                 order by strategy, exit_keys::text
               )
          from (
            select strategy,
                   exit_keys,
                   pg_catalog.count(*)::integer as family_count,
                   pg_catalog.sum(survivor_count)::integer as survivor_count
              from families
             group by strategy, exit_keys
          ) rows_by_exit_shape
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.survivor_strategy_summary(text) is
  'Strategy names and survivor counts for the exhaustive view, grouped by (strategy, '
  'exit_keys) so the caller can apply the trailing mask without the rule being duplicated '
  'in SQL. Replaces a 4 MB survivor_family_catalog call that took 18.3 s on 2026-09-18 and '
  'exceeded both the anon (3 s) and authenticated (8 s) statement timeouts.';

revoke all on function public.survivor_strategy_summary(text) from public;
grant execute on function public.survivor_strategy_summary(text) to anon, authenticated;
