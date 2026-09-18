-- survivor_strategy_summary_live.sql
--
-- Run this in the SQL editor AFTER applying 047, BEFORE wiring the page to it.
-- Read-only: it calls two functions and compares them. It writes nothing.
--
-- What it proves, and why a snapshot test could not: the new aggregate must produce the
-- same numbers the page produces today from survivor_family_catalog, ON THE LIVE CORPUS --
-- 136 661 rows, 11 563 families, two generations, whatever textual quirks the publication
-- trigger has actually written. Equivalence was already proven on crafted rows in a local
-- PostgreSQL (13 rows covering: a pair in two generations, a pair only in the old one, rows
-- outside the published window, a null published_at, two exit_keys_txt that are different
-- TEXTS and one single jsonb, and two bases differing only by case). That test proves the
-- SEMANTICS. This one proves the semantics hold on the data that exists.
--
-- Expected result of query 1: ZERO ROWS. Any row is a divergence and blocks the wiring.
--
-- Query 1 runs survivor_family_catalog, which took 18.30 s on 2026-09-18, hence the lifted
-- timeout. That is the last time anything has to pay for that call.

-- ---------------------------------------------------------------------------
-- 1. Same numbers, both paths, per (strategy, exit shape). Expect zero rows.
begin;
set local statement_timeout = '180s';

with ancien as (
  select f ->> 'strategy'                                     as strategy,
         f -> 'exit_keys'                                     as exit_keys,
         count(*)::int                                        as family_count,
         sum((f ->> 'survivor_count')::int)::int               as survivor_count
    from jsonb_array_elements(
           public.survivor_family_catalog(null) -> 'families') f
   group by 1, 2
), nouveau as (
  select s ->> 'strategy'                                     as strategy,
         s -> 'exit_keys'                                     as exit_keys,
         (s ->> 'family_count')::int                          as family_count,
         (s ->> 'survivor_count')::int                        as survivor_count
    from jsonb_array_elements(
           public.survivor_strategy_summary(null) -> 'strategies') s
)
select coalesce(a.strategy, n.strategy)   as strategy,
       coalesce(a.exit_keys, n.exit_keys) as exit_keys,
       a.family_count                     as familles_catalogue,
       n.family_count                     as familles_agregat,
       a.survivor_count                   as survivants_catalogue,
       n.survivor_count                   as survivants_agregat
  from ancien a
  full outer join nouveau n
    on n.strategy = a.strategy
   and n.exit_keys = a.exit_keys
 where a.family_count   is distinct from n.family_count
    or a.survivor_count is distinct from n.survivor_count
 order by 1, 2;

rollback;

-- ---------------------------------------------------------------------------
-- 2. What the page will actually render, and what it costs.
--    `survivants` and `strategies` here are the numbers the page shows once the
--    trailing mask has been applied -- the mask is `exit_keys ? 'trail_mult'`, written
--    here ONLY to check the arithmetic. The rule itself stays in TypeScript
--    (algolab web/lib/trailing-mask.ts); nothing in the migration duplicates it.
begin;
set local statement_timeout = '180s';

-- `materialized` is load-bearing: without it the CTE is inlined and the function runs
-- twice, so `duree` would measure two calls and `octets` a second one.
with brut as materialized (
  select public.survivor_strategy_summary(null) as payload
), agregat as (
  select s ->> 'strategy'              as strategy,
         s -> 'exit_keys'              as exit_keys,
         (s ->> 'survivor_count')::int as survivor_count,
         (s ->> 'family_count')::int   as family_count
    from brut, jsonb_array_elements(brut.payload -> 'strategies') s
)
select count(distinct strategy) filter (where not (exit_keys ? 'trail_mult')) as strategies_affichees,
       sum(survivor_count)      filter (where not (exit_keys ? 'trail_mult')) as survivants_affiches,
       sum(family_count)        filter (where not (exit_keys ? 'trail_mult')) as familles_affichees,
       count(*)                                                              as lignes_rendues,
       (select length(payload::text) from brut)                              as octets,
       clock_timestamp() - statement_timestamp()                             as duree
  from agregat;

rollback;

-- Numbers to beat, measured on 2026-09-18:
--   survivor_family_catalog(null) ... 18.30 s, 4 074 459 bytes
--   target for this aggregate ....... under 1 s before the covering index of 048,
--                                     a few hundred ms after it, and a few KB either way.
-- If `duree` is still seconds after 048 and a VACUUM, the index is not being used: check
-- for an Index Only Scan before assuming the plan improved.
