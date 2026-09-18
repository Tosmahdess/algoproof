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
  -- The GROUP BY is defensive, not decorative. 047 groups on `exit_keys_txt::jsonb`, so it
  -- cannot emit two rows for one exit shape today. Should that ever change -- someone
  -- grouping on the raw text again -- `["a","b"]` and `[ "a", "b" ]` would arrive as two
  -- rows against the catalog's one, and this check would report a divergence that is an
  -- artefact of its own join rather than a real difference in the numbers.
  select s ->> 'strategy'                                     as strategy,
         s -> 'exit_keys'                                     as exit_keys,
         sum((s ->> 'family_count')::int)::int                as family_count,
         sum((s ->> 'survivor_count')::int)::int              as survivor_count
    from jsonb_array_elements(
           public.survivor_strategy_summary(null) -> 'strategies') s
   group by 1, 2
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
--   this aggregate ................. a few KB, and fast enough for query 3 below to pass.
-- If it is still seconds after the covering index and the vacuum, the index is not being
-- used: read `Heap Fetches` in the acceptance EXPLAIN of the manual file before assuming
-- the plan improved.

-- ---------------------------------------------------------------------------
-- 3. THE GATE. Everything above ran with the statement timeout lifted, which is exactly how
--    one convinces oneself that a slow function is fine. This runs it as the role and under
--    the budget a visitor with no account actually gets.
--
--    Expected: one row, a few thousand bytes, well under 3 s.
--    On error 57014, the page must NOT be wired to this function: it would fail the same
--    way it fails today, only faster.
begin;
set local statement_timeout = '3s';
set local role anon;

select length(public.survivor_strategy_summary(null)::text) as octets,
       clock_timestamp() - statement_timestamp()            as duree;

rollback;

-- And the same under a member's 8 s, to know whether the margin is real or whether the page
-- would merely have stopped failing for the people who already pay.
begin;
set local statement_timeout = '8s';
set local role authenticated;

select length(public.survivor_strategy_summary(null)::text) as octets,
       clock_timestamp() - statement_timestamp()            as duree;

rollback;
