-- 052_survivor_rows_read_switch.sql  (M3 of "one row per survivor": THE READ SWITCH)
--
-- ⚠️ WRITTEN AHEAD, NOT TO BE APPLIED YET. Preconditions, all verified LIVE, in this order
-- (supabase/migrations/README-survivor-rows.md has the queries):
--   1. 050 and 051 applied; the engine flag APEX_PUBLISH_CHILD_ROWS=1 on and the backfill
--      run, so units carry child rows at current_publish_seq.
--   2. select public.survivor_id_legacy_map_rebuild();  -> recipe_mismatch = 0 and
--      no_row_at_position = 0.
--   3. supabase/tests/survivor_rows_parity_live.sql: every unit with rows passes.
--   4. supabase/tests/survivor_rows_gate.sql, run against production (it rolls back):
--      outputs before/after this file identical, timings inside the anon/authenticated
--      budgets.
--
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
-- Rollback: supabase/manual/survivor_rows_rollback.sql, section M3 (lossless while the
-- jsonb lists are still written in full).
--
-- WHAT SWITCHES, AND AT WHAT GRAIN. Per unit: a unit reads its child rows iff
--   engine_verdicts.survivors_storage = 'rows' and current_publish_seq is not null
-- and its jsonb list otherwise. 050's guard makes that predicate mean "the rows of the
-- current publication are complete" (count = n_go + n_marginal, checked in the engine's
-- own transaction; a newer verdict row without its rows demotes the unit on the spot), so
-- no reader needs to count anything. The engine flips units as it publishes them; turning
-- a unit back is `update engine_verdicts set survivors_storage = null where <unit>`.
--
-- 1. survivor_family_member becomes a VIEW with the table's exact columns, over
--      the table, renamed survivor_family_member_jsonb, holding jsonb-mode units ONLY
--    UNION ALL
--      engine_verdict_survivor rows of rows-mode units at their current_publish_seq.
--    Every reader (catalog 049, detail/preview 043, all 048, strategy_summary 047) reads it
--    through the same name, unchanged: none of their bodies is copied here, so none of
--    them can be reverted by this file.
--
--    WHY BOTH BRANCHES ARE SINGLE-TABLE (no join to engine_verdicts in the view). The
--    family RPCs resolve each pair's newest dataset with a subquery CORRELATED on every
--    row (043), which PostgreSQL runs once per row: 047 measured 136 661 loops, each an
--    `Index Scan Backward ... Limit 1` on the member table's primary key. A UNION ALL of
--    two plain tables stays an append relation, so that min/max rewrite still applies
--    (a Merge Append of two backward index scans). A branch that JOINS is not flattened,
--    loses the rewrite, and every loop would aggregate a whole (base, tf) slice. So:
--      * the jsonb side needs no filter: the index trigger below keeps the rows of a
--        rows-mode unit out of the table (XOR by construction, maintained on write);
--      * the child side needs no filter either: 050 keeps child rows for rows-mode units
--        only, at their current seq (the engine writes rows, header and purge of the old
--        seq in one transaction; 050's purge trigger removes a unit's rows when it leaves
--        rows mode or is deleted). A member WITH a WHERE clause is not flattened into the
--        append relation at all (is_safe_append_member): the first draft of this view
--        filtered on publish_seq and took survivor_family_catalog from 0.37 s to more
--        than 60 s on a 219 k-survivor local replica.
--    published_at on the child side is unit_published_at: the UNIT's publication time,
--    stamped by 050's trigger, as in the 037 table. NOT the child row's own published_at
--    (the child write time): a unit published before the 2026-08-12 cutoff and backfilled
--    today would pass the readers' freshness filter with it -- the local gate caught
--    exactly that on its first run.
--
--    SURVIVOR IDS ON THE FAMILY PAGES. Rows-mode variants carry the engine's public HMAC
--    id instead of the positional one. Same format (^surv_[0-9a-f]{16}$), so no site change
--    is needed; /lab?survivor=<new id> resolves through step 1 of survivor_lab_preset below.
--    To keep emitting positional ids until a site change, replace `s.survivor_id` in the
--    view by `public.survivor_legacy_id(s.base, s.tf, s.kmax, s.position + 1)` -- step 3
--    of the resolver serves those too.
--
-- 2. dossier_payload: byte-identical to 044 except the source of `survivors`, which is the
--    jsonb list or the rebuilt entries of the unit's child rows (engine_verdict_survivor_
--    entry, 050). Allow-list, paid/teaser split, the per-pair generation rule, the unit
--    order and `order by md5(e::text)` are untouched.
--
--    ORDER. md5(e::text) of the REBUILT entry equals the jsonb one whenever the rebuilt
--    text is identical (same keys, same values). It is not when the engine wrote a float
--    as "2.0" (comes back "2") or while data_window is not written (050 header). The site
--    does not depend on that permutation, only on the order being neutral and stable:
--      * full arm: RecipeGroup re-sorts by neutralOrder(configKey(params/filters/exit)),
--        with the input index only as a tie-break on a 32-bit hash collision;
--      * teaser arm: neutralOrder keys on String(k) and falls back to input order among
--        equal k -- any content hash is as neutral as the old one, and it is still
--        computed here, never shipped.
--      (algolab web/components/pilot/RecipeGroup.tsx, web/lib/neutral-order.ts, 2026-09-19.)
--
-- 3. survivor_lab_preset resolves, in order:
--      a. a public HMAC id (child rows of rows-mode units), newest generation first: the id
--         names a RECIPE, stable across generations, so the freshest measurement of that
--         same recipe is served, and dataset_version says which one it is;
--      b. a positional id known to survivor_id_legacy_map: the exact source row while its
--         publication is current, else the same recipe (its HMAC id), newest generation;
--      c. a positional id the map does not know: 043's rule, unchanged -- the generation
--         that minted it, over BOTH storages (jsonb table rows, child rows through
--         survivor_legacy_id), earliest (published_at, dataset_version) first.
--    Output keys, types and the locked/missing constants are 043's. The unit header is
--    read as three columns instead of to_jsonb(whole row): same values, without detoasting
--    a multi-MB `survivors` on every Lab preload.
--
-- LOCKS. The rename takes ACCESS EXCLUSIVE on survivor_family_member for milliseconds;
-- family RPC calls queue behind it. lock_timeout makes it fail fast; re-run.

begin;

set local lock_timeout = '5s';

-- Refuse to run on a database where M1/M2 are missing: the view and the resolver name
-- their objects, and a half-applied switch is the one state nothing can read.
do $pre$
begin
  if to_regclass('public.engine_verdict_survivor') is null
     or to_regclass('public.survivor_id_legacy_map') is null
     or to_regprocedure('public.engine_verdict_survivor_entry(public.engine_verdict_survivor)') is null
     or to_regprocedure('public.survivor_legacy_id(text, text, integer, bigint)') is null then
    raise exception '052 needs 050 and 051 applied first';
  end if;
  if to_regclass('public.survivor_family_member_jsonb') is not null then
    raise exception '052 is already applied (survivor_family_member_jsonb exists)';
  end if;
end
$pre$;

-- ---------------------------------------------------------------------------
-- 1a. The jsonb-side table keeps its data, indexes, autovacuum settings and closed grants.
alter table public.survivor_family_member rename to survivor_family_member_jsonb;

comment on table public.survivor_family_member_jsonb is
  'Precomputed survivor -> functional family assignment for units whose survivors are read '
  'from the jsonb list (survivors_storage is not ''rows''). Maintained by trigger from '
  'engine_verdicts; never written by hand. Read through the view survivor_family_member. '
  'Closed to anon and authenticated: it holds paid recipes verbatim.';

-- 1b. The index trigger, 037's body with two changes: the table's new name, and a unit
--     whose child rows are authoritative is NOT exploded (its rows live in the child
--     table; this is what keeps the two view branches disjoint). It now also fires when the
--     storage columns move, so a promotion removes the unit's jsonb rows and a demotion
--     re-explodes the jsonb list, in the same statement.
create or replace function public.survivor_family_index_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.survivor_family_member_jsonb m
     where m.base = old.base
       and m.tf = old.tf
       and m.dataset_version = old.dataset_version
       and m.kmax = old.kmax;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- 052: rows-mode units are served from engine_verdict_survivor.
  if new.survivors_storage is not distinct from 'rows'
     and new.current_publish_seq is not null then
    return new;
  end if;

  insert into public.survivor_family_member_jsonb (
    base, tf, dataset_version, kmax, ordinality, published_at,
    family_id, signature, survivor_id,
    eligible, sample_sufficient, pf, dd, n_trades, recipe,
    filter_keys_txt, exit_keys_txt, name_suffix)
  select new.base,
         new.tf,
         new.dataset_version,
         new.kmax,
         e.ordinality,
         new.published_at,
         'fam_' || pg_catalog.substr(pg_catalog.md5(s.signature::text), 1, 16),
         s.signature,
         'surv_' || pg_catalog.substr(pg_catalog.md5(
           pg_catalog.lower(new.base) || ':' || new.tf || ':' ||
           new.kmax::text || ':' || e.ordinality::text), 1, 16),
         coalesce((e.recipe ->> 'verdict') = 'GO_PAPER', false),
         coalesce((e.recipe ->> 'n_trades')::integer >= 20, false),
         (e.recipe ->> 'pf')::numeric,
         (e.recipe ->> 'dd')::numeric,
         (e.recipe ->> 'n_trades')::integer,
         e.recipe,
         (s.signature -> 'filters')::text,
         coalesce(
           (select pg_catalog.jsonb_agg(exit_key order by exit_key)
              from pg_catalog.jsonb_object_keys(s.signature -> 'exit_shape') as keys(exit_key)),
           '[]'::jsonb)::text,
         case
           when pg_catalog.jsonb_array_length(s.signature -> 'filters') > 0
             then ' + ' || pg_catalog.array_to_string(
                    array(select pg_catalog.jsonb_array_elements_text(s.signature -> 'filters')),
                    ' + ')
           else ' sans filtre actif'
         end
    from pg_catalog.jsonb_array_elements(
           coalesce(new.survivors, '[]'::jsonb)) with ordinality as e(recipe, ordinality)
    -- LATERAL, so the signature is computed once per survivor. Referencing
    -- survivor_family_signature(...) directly in several output columns would have
    -- the planner evaluate it once per reference — that is the exact mistake 036
    -- made on the read path.
    cross join lateral (
      select public.survivor_family_signature(new.base, e.recipe) as signature
    ) s;

  return new;
end;
$$;

drop trigger if exists survivor_family_index_sync on public.engine_verdicts;
create trigger survivor_family_index_sync
  after insert
     or update of base, tf, dataset_version, kmax, published_at, survivors,
                  survivors_storage, current_publish_seq
     or delete
  on public.engine_verdicts
  for each row execute function public.survivor_family_index_sync();

-- 1c. Units already in rows mode leave the jsonb side now (the trigger does it from here on).
delete from public.survivor_family_member_jsonb m
 using public.engine_verdicts v
 where v.base = m.base
   and v.tf = m.tf
   and v.dataset_version = m.dataset_version
   and v.kmax = m.kmax
   and v.survivors_storage is not distinct from 'rows'
   and v.current_publish_seq is not null;

-- 1d. The view. Column names, order and types are the table's (037), so `select m.*`,
--     positional INTO and every column reference in the RPCs keep their meaning.
create view public.survivor_family_member as
select m.base,
       m.tf,
       m.dataset_version,
       m.kmax,
       m.ordinality,
       m.published_at,
       m.family_id,
       m.signature,
       m.survivor_id,
       m.eligible,
       m.sample_sufficient,
       m.pf,
       m.dd,
       m.n_trades,
       m.recipe,
       m.filter_keys_txt,
       m.exit_keys_txt,
       m.name_suffix
  from public.survivor_family_member_jsonb m
union all
select s.base,
       s.tf,
       s.dataset_version,
       s.kmax,
       s.position + 1,
       s.unit_published_at,
       s.family_id,
       s.signature,
       s.survivor_id,
       s.eligible,
       s.sample_sufficient,
       -- 037 reads (entry ->> 'pf')::numeric; the entry's number is float8out's shortest
       -- exact text, so the same value is float8 -> text -> numeric. NOT a direct
       -- float8 -> numeric cast, which rounds to 15 significant digits.
       s.pf::text::numeric,
       s.dd::text::numeric,
       s.n_trades,
       public.engine_verdict_survivor_entry(s),
       s.filter_keys_txt,
       s.exit_keys_txt,
       s.name_suffix
  from public.engine_verdict_survivor s;

-- A view runs with its owner's rights, so the grants are the boundary. Supabase's default
-- privileges hand new relations in `public` to anon and authenticated: revoke both.
revoke all on table public.survivor_family_member from public;
revoke all on table public.survivor_family_member from anon, authenticated;

comment on view public.survivor_family_member is
  'Survivor -> family rows for every unit: jsonb-mode units from survivor_family_member_jsonb, '
  'rows-mode units (survivors_storage = ''rows'') from engine_verdict_survivor at their '
  'current_publish_seq. Same columns as the 037 table. Closed to anon and authenticated.';

-- ---------------------------------------------------------------------------
-- 2. dossier_payload -- 044's body, extracted mechanically, one hunk changed
--    (supabase/tests/generate_survivor_rows_sql.py; `--check` verifies it).
-- >>> generated: 044 dossier_payload + survivors hunk
create or replace function public.dossier_payload(
  p_base text,
  p_dataset text default null
)
returns jsonb
language plpgsql
volatile
security definer
-- An empty search_path forces every name below to be schema-qualified. Without it a
-- SECURITY DEFINER function resolves unqualified names against the CALLER's path,
-- which is the classic privilege-escalation route for definer functions.
set search_path = ''
as $$
declare
  -- Mirrors CORRECTED_ENGINE_SINCE in algolab web/lib/engine-freshness.ts:31.
  -- Verdicts produced before the pandas 3.0 fix are not publishable. The two
  -- constants are pinned together by a test in that repo.
  c_cutoff constant timestamptz := '2026-08-12T19:38:00Z';
  -- THE FREE SAMPLE. A PRODUCT RULE, NOT A HOLE IN THE GATE.
  --
  -- One base is a permanent free sample: its dossier is complete and open to everyone,
  -- before the paywall flips and after it. That is the whole point of it. This site sells
  -- the CONTENT of a proof, so a reader has to be able to read one entire proof — the
  -- parameters, the filters, the exit, the cause, the shape of the whole thing — and judge
  -- the FORMAT for themselves before paying for the other nine. A locked corpus with no
  -- readable specimen is "trust me", which is the one thing this site exists to refuse.
  --
  -- The old page implemented this implicitly, by only ever existing for this one base. When
  -- the dossier became /cockpit/dossier/[base] over the whole corpus, the rule was left
  -- behind and the gate started treating all ten bases identically — so the sample would
  -- have been withdrawn from the public the day this migration applied, while /membre still
  -- advertised it. Nothing published is withdrawn now; the other nine become teasers, which
  -- costs no reader anything, because until the case-insensitive fix above they resolved to
  -- 404 for everybody.
  --
  -- WHY A CONSTANT AND NOT A LITERAL IN THE PREDICATE. Which base plays this part is an
  -- OPEN QUESTION, deferred to a later lot: EMAcross is the incumbent because /membre has
  -- always named it, and its corpus is being re-swept as this ships. The value is therefore
  -- expected to change. Naming it once, here, is what makes that a one-line edit instead of
  -- a hunt through the predicates.
  c_free_sample constant text := 'EMAcross';
  v_uid uuid := auth.uid();
  v_paid boolean := false;
  v_units jsonb;
begin
  if v_uid is not null then
    v_paid := public.has_live_subscription(v_uid);
  end if;

  -- The second way to be entitled, and the only one that does not involve an identity.
  -- Scoped to THIS CALL's p_base, never to a row: one invocation asks about one base, every
  -- row the select below returns is that base, so a request for the free sample cannot
  -- widen anything past the sample itself. Same case-insensitive comparison as the row
  -- predicate below, and for the same reason — the URL is `/cockpit/dossier/emacross` and
  -- the corpus says `EMAcross`.
  if pg_catalog.lower(p_base) = pg_catalog.lower(c_free_sample) then
    v_paid := true;
  end if;

  select coalesce(
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'base', v.base,
               'tf', v.tf,
               'dataset_version', v.dataset_version,
               'kmax', v.kmax,
               'search_mode', v.search_mode,
               'n_behaviors', v.n_behaviors,
               'n_go', v.n_go,
               'n_marginal', v.n_marginal,
               -- 034: the payload carried n_go and n_marginal but never n_no_go, so no
               -- consumer could compute judged = n_go + n_marginal + n_no_go. The lab's
               -- dossier page printed n_behaviors under the label "réglages jugés"
               -- instead, and n_behaviors is the SWEPT corpus: since the top-K finalize
               -- of 2026-08-06 only the top 20 000 per unit are judged, so on a large
               -- unit the public figure was an order of magnitude too high. Migration
               -- 030 already computes n_judged this exact way for the public view.
               'n_no_go', v.n_no_go,
               'published_at', v.published_at,
               -- TEASER-SIDE, never paid. This feeds HonestyNote, the permanent caveat
               -- that says what these verdicts do NOT prove. Its own header states it must
               -- never render nothing — "a page of 152 recipes with no caveat is exactly
               -- what this note exists to prevent" — so hiding it behind the paywall would
               -- put the sales screen in the one state the component was written to forbid.
               -- Four named fields, never `v.selection_control` whole: the column is jsonb
               -- and carries engine prose (`note`, `alpha`, `corrected`, `n_null_ran`) that
               -- reached the served HTML once already through a spread.
               'selection_control', case
                 when v.selection_control is null then null
                 else pg_catalog.jsonb_build_object(
                   'n_behaviors',            v.selection_control -> 'n_behaviors',
                   'bonferroni_bar',         v.selection_control -> 'bonferroni_bar',
                   'resolution_ceiling',     v.selection_control -> 'resolution_ceiling',
                   'bonferroni_expressible', v.selection_control -> 'bonferroni_expressible'
                 )
               end,
               'survivors', (
                 select coalesce(
                          pg_catalog.jsonb_agg(
                            -- Allow-list. The seven teaser keys, plus the recipe only
                            -- when v_paid. `dd` is NOT optional: no survivor is ever
                            -- rendered without its drawdown (spec §3.4).
                            pg_catalog.jsonb_build_object(
                              'k',        e -> 'k',
                              'dd',       e -> 'dd',
                              'pf',       e -> 'pf',
                              'wf',       e -> 'wf',
                              'n_trades', e -> 'n_trades',
                              'eligible', ((e ->> 'verdict') = 'GO_PAPER'),
                              -- Cause KEY only. The raw reason carries its threshold
                              -- ("wf_oos 0.77<1.15"); migration 024 redacts to the key
                              -- and so does this.
                              'cause', case
                                when pg_catalog.jsonb_array_length(
                                       coalesce(e -> 'reasons', '[]'::jsonb)) > 0
                                then pg_catalog.split_part(e -> 'reasons' ->> 0, ' ', 1)
                                else null
                              end
                            )
                            || case when v_paid then pg_catalog.jsonb_build_object(
                                 'params',  e -> 'params',
                                 'filters', e -> 'filters',
                                 'exit',    e -> 'exit'
                               ) else '{}'::jsonb end
                            -- NEUTRAL ORDER, DECIDED HERE AND NOT IN THE CLIENT.
                            --
                            -- The engine stores survivors in its own (-null_pct, -pf) order and
                            -- jsonb_agg preserves input order, so without this the anonymous,
                            -- indexable half of the conversion screen renders a profit-factor
                            -- leaderboard. That is the exact thing neutral-order.ts was written
                            -- to kill and the 31/07 note forbids by name: a default ranking by
                            -- performance is an implicit recommendation, and the top of such a
                            -- ranking is mechanically the small-sample lucky tail. The client
                            -- cannot fix it on the teaser arm — its hash needs `filters`, which
                            -- a teaser entry does not carry, so it ties and falls back to input
                            -- order.
                            --
                            -- ⚠️ DO NOT "improve" this by publishing the hash as a row id.
                            -- One unit's space is ~36 million enumerable configurations, so a
                            -- published hash of the entry is brute-forceable offline and hands
                            -- over the whole paid corpus. The ordering is computed here and
                            -- never leaves the database; that is the point.
                            order by pg_catalog.md5(e::text)
                          ),
                          '[]'::jsonb)
                   -- 052: THE ONLY CHANGE TO 044. `e` is the unit's jsonb list entry, or
                   -- the same entry rebuilt from its child row when the unit's rows are
                   -- authoritative (survivors_storage = 'rows', current_publish_seq set;
                   -- 050's guard makes that mean "complete"). Exactly one branch runs per
                   -- unit: each is gated by a predicate on `v` alone (a one-time filter).
                   from (
                     select j.e
                       from pg_catalog.jsonb_array_elements(
                              coalesce(v.survivors, '[]'::jsonb)) j(e)
                      where not (v.survivors_storage is not distinct from 'rows'
                                 and v.current_publish_seq is not null)
                     union all
                     select public.engine_verdict_survivor_entry(s)
                       from public.engine_verdict_survivor s
                      where v.survivors_storage is not distinct from 'rows'
                        and v.current_publish_seq is not null
                        and s.base = v.base
                        and s.tf = v.tf
                        and s.dataset_version = v.dataset_version
                        and s.kmax = v.kmax
                        and s.publish_seq = v.current_publish_seq
                   ) src(e)
               )
             )
           ),
           '[]'::jsonb)
    into v_units
    from public.engine_verdicts v
   -- CASE-INSENSITIVE ON PURPOSE. DO NOT "OPTIMISE" THIS BACK TO `v.base = p_base`.
   --
   -- The corpus stores base names in camelCase (EMAcross, WilliamsVolBreak,
   -- DonchianBreakout, KeltnerBreak, TEMAcross, ATRChannel, HMAcross, ORB, KAMAcross,
   -- HeikinAshiTrend) while every URL the site produces is LOWERCASE by construction:
   -- the links on /cockpit/survivants, the entries in sitemap.ts and the page's own
   -- canonical all call .toLowerCase(), and the route hands its raw segment straight to
   -- this function. A case-sensitive comparison therefore matched NOTHING for every real
   -- visitor: dossier_payload('emacross') returned units=[] and the page 404'd — all ten
   -- dossiers, on every URL the site itself advertises.
   --
   -- Lowercasing in the application instead would not do: the mapping lowercase ->
   -- camelCase is not derivable (TEMAcross vs KeltnerBreak vs ORB), so the join has to
   -- happen where the stored spelling lives. Both predicates below need it — the
   -- max(dataset_version) sub-select filters on `base` independently, and a
   -- case-sensitive sub-select would return NULL and eliminate every row through the
   -- coalesce even with the main predicate fixed.
   where pg_catalog.lower(v.base) = pg_catalog.lower(p_base)
     and v.published_at is not null
     and v.published_at >= c_cutoff
     -- ONE DATASET PER (base, tf), NOT ONE PER BASE — migration 044, 2026-09-04.
     --
     -- This sub-select used to take the freshest generation THIS BASE has, anywhere.
     -- During a tour that republishes one (base, tf) pair at a time, the first timeframe
     -- to land under data_20260831 raised the max for the whole base, and the outer
     -- predicate then dropped every timeframe still on data_20260802: a dossier that
     -- had D1, H4, H1 and M30 would have shown ONLY D1, for the weeks it took the other
     -- three to follow — amputated, with nothing on the page saying so.
     --
     -- It is the same defect migration 043 fixed for the survivor families, at one
     -- granularity's distance, and the fix is the same one: correlate the sub-select on
     -- the outer row's timeframe so a pair yields to its OWN newer generation and to
     -- nothing else. `w.base` needs no extra predicate — it is already pinned to
     -- p_base, which the outer row equals.
     --
     -- What this DELIBERATELY gives up: the old comment argued for one dataset per page,
     -- so figures measured on different data are never put side by side under one
     -- heading. That argument was right and it does not survive contact with a tour that
     -- takes three weeks — the alternative it defends is not "one coherent page" but "a
     -- page missing three of its four timeframes". The honesty debt moves to the page,
     -- which now MUST name every generation it shows: `dossier_payload` returns
     -- `dataset_version` per unit precisely so it can. See the front half below.
     and v.dataset_version = coalesce(
           p_dataset,
           (select pg_catalog.max(w.dataset_version)
              from public.engine_verdicts w
             -- Same case-insensitive rule as the main predicate above, and for the same
             -- reason: this sub-select filters on `base` on its own.
             where pg_catalog.lower(w.base) = pg_catalog.lower(p_base)
               -- THE WHOLE CHANGE OF MIGRATION 044. Correlated on the outer row's
               -- timeframe; without it the max is per base and amputates the dossier.
               and w.tf = v.tf
               and w.published_at is not null
               and w.published_at >= c_cutoff)
         );

  return pg_catalog.jsonb_build_object(
    'access', case when v_paid then 'full' else 'teaser' end,
    'units', v_units
  );
end;
$$;
-- <<< end generated

-- ---------------------------------------------------------------------------
-- 3. survivor_lab_preset.
create or replace function public.survivor_lab_preset(p_survivor_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_map public.survivor_id_legacy_map%rowtype;
  v_base text;
  v_tf text;
  v_dataset text;
  v_kmax integer;
  v_recipe jsonb;
  v_unit jsonb := '{}'::jsonb;
  v_asset_metrics jsonb;
  v_metric_scope text;
begin
  if p_survivor_id is null
     or p_survivor_id !~ '^surv_[0-9a-f]{16}$' then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  -- a. A public HMAC id: it names a recipe, stable across generations. Newest first.
  select s.base, s.tf, s.dataset_version, s.kmax, public.engine_verdict_survivor_entry(s)
    into v_base, v_tf, v_dataset, v_kmax, v_recipe
    from public.engine_verdict_survivor s
    join public.engine_verdicts v
      on v.base = s.base
     and v.tf = s.tf
     and v.dataset_version = s.dataset_version
     and v.kmax = s.kmax
     and v.current_publish_seq = s.publish_seq
   where s.survivor_id = p_survivor_id
     and v.survivors_storage = 'rows'
     and v.published_at is not null
   order by v.published_at desc, s.dataset_version desc, s.base, s.tf, s.kmax
   limit 1;

  -- b. A positional id the map knows: the exact source row while its publication is
  --    current, else the same recipe in its newest generation.
  if v_base is null then
    select x.* into v_map
      from public.survivor_id_legacy_map x
     where x.legacy_survivor_id = p_survivor_id;

    if v_map.legacy_survivor_id is not null then
      select s.base, s.tf, s.dataset_version, s.kmax, public.engine_verdict_survivor_entry(s)
        into v_base, v_tf, v_dataset, v_kmax, v_recipe
        from public.engine_verdict_survivor s
        join public.engine_verdicts v
          on v.base = s.base
         and v.tf = s.tf
         and v.dataset_version = s.dataset_version
         and v.kmax = s.kmax
         and v.current_publish_seq = s.publish_seq
       where v.survivors_storage = 'rows'
         and v.published_at is not null
         and s.survivor_id = v_map.survivor_id
       -- coalesce: a DESC sort puts NULL first, and src_* are nullable.
       order by coalesce(s.base = v_map.src_base
                         and s.tf = v_map.src_tf
                         and s.dataset_version = v_map.src_dataset_version
                         and s.kmax = v_map.src_kmax
                         and s.config_hash = v_map.src_config_hash, false) desc,
                v.published_at desc, s.dataset_version desc,
                s.base, s.tf, s.kmax
       limit 1;
    end if;
  end if;

  -- c. A positional id the map does not know: 043's rule, over both storages. The jsonb
  --    side holds jsonb-mode units only (see the index trigger), the child side adds the
  --    rows-mode ones by their positional id; `src` prefers the jsonb row on a full tie.
  if v_base is null then
    select c.base, c.tf, c.dataset_version, c.kmax, c.recipe
      into v_base, v_tf, v_dataset, v_kmax, v_recipe
      from (
        select m.base, m.tf, m.dataset_version, m.kmax, m.ordinality::bigint as ordinality,
               m.published_at, m.recipe, 0 as src
          from public.survivor_family_member_jsonb m
         where m.survivor_id = p_survivor_id
           and m.published_at is not null
        union all
        select s.base, s.tf, s.dataset_version, s.kmax, (s.position + 1)::bigint,
               v.published_at, public.engine_verdict_survivor_entry(s), 1
          from public.engine_verdict_survivor s
          join public.engine_verdicts v
            on v.base = s.base
           and v.tf = s.tf
           and v.dataset_version = s.dataset_version
           and v.kmax = s.kmax
           and v.current_publish_seq = s.publish_seq
         where public.survivor_legacy_id(s.base, s.tf, s.kmax, s.position + 1) = p_survivor_id
           and v.survivors_storage = 'rows'
           and v.published_at is not null
      ) c
     -- ASC, 2026-09-04 (migration 043). A permalink promises what the person who shared
     -- it saw, so a positional id resolves to the generation in which it was first minted.
     order by c.published_at asc, c.dataset_version asc,
              c.base, c.tf, c.kmax, c.ordinality, c.src
     limit 1;
  end if;

  if v_base is null then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  if v_uid is null or not public.has_live_subscription(v_uid) then
    -- Keep this response deliberately constant. In particular, do not construct a
    -- recipe and remove it afterward: protected bytes must never enter the result.
    return pg_catalog.jsonb_build_object('access', 'locked');
  end if;

  -- 043 took to_jsonb(the whole engine_verdicts row) and read three keys from it, which
  -- detoasted the unit's entire `survivors` value on every call. Same three values.
  select pg_catalog.jsonb_build_object(
           'per_asset', e.per_asset,
           'taker_fee', e.taker_fee,
           'slippage', e.slippage)
    into v_unit
    from public.engine_verdicts e
   where e.base = v_base
     and e.tf = v_tf
     and e.dataset_version = v_dataset
     and e.kmax = v_kmax
   limit 1;

  v_unit := coalesce(v_unit, '{}'::jsonb);

  if pg_catalog.jsonb_typeof(v_recipe -> 'per_asset') = 'object' then
    v_asset_metrics := v_recipe -> 'per_asset';
    v_metric_scope := 'survivor';
  else
    v_asset_metrics := case
      when pg_catalog.jsonb_typeof(v_unit -> 'per_asset') = 'object'
        then v_unit -> 'per_asset'
      else null
    end;
    v_metric_scope := 'unit_champion';
  end if;

  return pg_catalog.jsonb_build_object(
    'access', 'full',
    'survivor_id', p_survivor_id,
    'strategy', v_base,
    'timeframe', v_tf,
    'dataset_version', v_dataset,
    'recipe', v_recipe,
    'asset_metrics', v_asset_metrics,
    'metric_scope', v_metric_scope,
    'taker_fee', case
      when pg_catalog.jsonb_typeof(v_unit -> 'taker_fee') = 'number'
        then (v_unit ->> 'taker_fee')::numeric
      else null
    end,
    'slippage', case
      when pg_catalog.jsonb_typeof(v_unit -> 'slippage') = 'number'
        then (v_unit ->> 'slippage')::numeric
      else null
    end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The boundary, restated. create-or-replace keeps grants; a reader of this file alone
--    must still see them.
revoke all on function public.survivor_family_index_sync() from public, anon, authenticated;
revoke all on function public.dossier_payload(text, text) from public;
grant execute on function public.dossier_payload(text, text) to anon, authenticated;
revoke all on function public.survivor_lab_preset(text) from public;
grant execute on function public.survivor_lab_preset(text) to anon, authenticated;

commit;

-- The relation behind a name PostgREST caches changed kind (table -> view). Nothing here
-- is exposed through PostgREST, but the notify costs nothing. Outside the transaction on
-- purpose: the listener must see a committed schema.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VERIFICATION, after applying:
--   select relkind from pg_class where oid = 'public.survivor_family_member'::regclass; -- v
--   select has_table_privilege('anon', 'public.survivor_family_member', 'select'),
--          has_table_privilege('authenticated', 'public.survivor_family_member', 'select');
--                                                                                  -- f, f
--   -- the two branches are disjoint:
--   select count(*) from public.survivor_family_member_jsonb m join public.engine_verdicts v
--     using (base, tf, dataset_version, kmax)
--    where v.survivors_storage = 'rows' and v.current_publish_seq is not null;       -- 0
--   -- every rows-mode unit shows exactly n_go + n_marginal members:
--   select v.base, v.tf, v.dataset_version, v.kmax, v.n_go + v.n_marginal, count(m.*)
--     from public.engine_verdicts v
--     left join public.survivor_family_member m using (base, tf, dataset_version, kmax)
--    where v.survivors_storage = 'rows'
--    group by 1, 2, 3, 4, 5 having count(m.*) <> v.n_go + v.n_marginal;              -- 0 rows
--   -- then the page checks of the README (catalog md5 / jsonb, a dossier, a Lab link).
