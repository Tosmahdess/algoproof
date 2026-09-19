-- survivor_rows_rollback.sql -- undo 052, 051, 050 ("one row per survivor"), one step each.
--
-- ⚠️ NOT A MIGRATION, AND DELIBERATELY NOT IN supabase/migrations/: replaying the folder
-- would apply it right after the migrations it undoes. Run ONE section at a time, in the
-- SQL editor or psql, newest step first (M3, then M2, then M1). Each section is its own
-- transaction. Context and order: supabase/migrations/README-survivor-rows.md.
--
-- The function bodies restored below are extracted mechanically from 037, 043 and 044 by
-- supabase/tests/generate_survivor_rows_sql.py (`--check` verifies they still match).


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SECTION M3 -- undo 052 (the read switch). Readers go back to the 037 table and the jsonb.
--
-- LOSSLESS ONLY WHILE THE JSONB LISTS ARE STILL WRITTEN IN FULL: step 3 re-explodes the
-- rows-mode units from engine_verdicts.survivors. A unit whose jsonb list was deferred by
-- the 8 MB breaker (or cut later) comes back with the list it has in jsonb -- empty.
-- The engine keeps writing rows; nothing reads them until 052 is applied again.
-- ═══════════════════════════════════════════════════════════════════════════════════════
begin;
set local lock_timeout = '5s';

drop view if exists public.survivor_family_member;
alter table public.survivor_family_member_jsonb rename to survivor_family_member;

comment on table public.survivor_family_member is
  'Precomputed survivor -> functional family assignment. Maintained by trigger from '
  'engine_verdicts; never written by hand. Closed to anon and authenticated by RLS '
  'with no policy AND by revoked grants: it holds paid recipes verbatim.';

-- 037's trigger function, verbatim (it explodes every unit again).
-- >>> generated: 037 survivor_family_index_sync
create or replace function public.survivor_family_index_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.survivor_family_member m
     where m.base = old.base
       and m.tf = old.tf
       and m.dataset_version = old.dataset_version
       and m.kmax = old.kmax;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  insert into public.survivor_family_member (
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
-- <<< end generated

-- 050's trigger form (fires only when an input of the function is in the SET list).
drop trigger if exists survivor_family_index_sync on public.engine_verdicts;
create trigger survivor_family_index_sync
  after insert
     or update of base, tf, dataset_version, kmax, published_at, survivors
     or delete
  on public.engine_verdicts
  for each row execute function public.survivor_family_index_sync();

-- 052 kept rows-mode units out of the table; put their jsonb lists back (037's backfill,
-- restricted to those units).
-- >>> generated: 037 backfill for rows-mode units
insert into public.survivor_family_member (
  base, tf, dataset_version, kmax, ordinality, published_at,
  family_id, signature, survivor_id,
  eligible, sample_sufficient, pf, dd, n_trades, recipe,
  filter_keys_txt, exit_keys_txt, name_suffix)
select v.base,
       v.tf,
       v.dataset_version,
       v.kmax,
       e.ordinality,
       v.published_at,
       'fam_' || pg_catalog.substr(pg_catalog.md5(s.signature::text), 1, 16),
       s.signature,
       'surv_' || pg_catalog.substr(pg_catalog.md5(
         pg_catalog.lower(v.base) || ':' || v.tf || ':' ||
         v.kmax::text || ':' || e.ordinality::text), 1, 16),
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
  from public.engine_verdicts v
  cross join lateral pg_catalog.jsonb_array_elements(
         coalesce(v.survivors, '[]'::jsonb)) with ordinality as e(recipe, ordinality)
  cross join lateral (
    select public.survivor_family_signature(v.base, e.recipe) as signature
  ) s
 -- rollback of 052: only the units 052 kept out of this table
 where v.survivors_storage is not distinct from 'rows'
   and v.current_publish_seq is not null;
-- <<< end generated

analyze public.survivor_family_member;

-- 044's dossier_payload, verbatim.
-- >>> generated: 044 dossier_payload
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
                   from pg_catalog.jsonb_array_elements(
                          coalesce(v.survivors, '[]'::jsonb)) e
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

-- 043's survivor_lab_preset, verbatim.
-- >>> generated: 043 survivor_lab_preset
create or replace function public.survivor_lab_preset(p_survivor_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.survivor_family_member%rowtype;
  v_unit jsonb := '{}'::jsonb;
  v_asset_metrics jsonb;
  v_metric_scope text;
begin
  if p_survivor_id is null
     or p_survivor_id !~ '^surv_[0-9a-f]{16}$' then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  select m.*
    into v_member
    from public.survivor_family_member m
   where m.survivor_id = p_survivor_id
     and m.published_at is not null
   -- ASC, 2026-09-04 (migration 043). survivor_id hashes (base, tf, kmax,
   -- ordinality) and NOT dataset_version, so one id exists once per generation.
   -- Under DESC a link shared before a tour silently re-pointed at the NEW
   -- generation's survivor at the same rank -- a different recipe, no 404, no
   -- notice. A permalink promises what the person who shared it saw, so it
   -- resolves to the generation in which it was first minted.
   order by m.published_at asc, m.dataset_version asc,
            m.base, m.tf, m.kmax, m.ordinality
   limit 1;

  if not found then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  if v_uid is null or not public.has_live_subscription(v_uid) then
    -- Keep this response deliberately constant. In particular, do not construct a
    -- recipe and remove it afterward: protected bytes must never enter the result.
    return pg_catalog.jsonb_build_object('access', 'locked');
  end if;

  select pg_catalog.to_jsonb(e)
    into v_unit
    from public.engine_verdicts e
   where e.base = v_member.base
     and e.tf = v_member.tf
     and e.dataset_version = v_member.dataset_version
     and e.kmax = v_member.kmax
   limit 1;

  v_unit := coalesce(v_unit, '{}'::jsonb);

  if pg_catalog.jsonb_typeof(v_member.recipe -> 'per_asset') = 'object' then
    v_asset_metrics := v_member.recipe -> 'per_asset';
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
    'survivor_id', v_member.survivor_id,
    'strategy', v_member.base,
    'timeframe', v_member.tf,
    'dataset_version', v_member.dataset_version,
    'recipe', v_member.recipe,
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
-- <<< end generated

revoke all on function public.survivor_family_index_sync() from public, anon, authenticated;
revoke all on function public.dossier_payload(text, text) from public;
grant execute on function public.dossier_payload(text, text) to anon, authenticated;
revoke all on function public.survivor_lab_preset(text) from public;
grant execute on function public.survivor_lab_preset(text) to anon, authenticated;

commit;
notify pgrst, 'reload schema';
-- Check: select relkind from pg_class where oid = 'public.survivor_family_member'::regclass;  -- r


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SECTION M2 -- undo 051 (the legacy map). Only with 052 NOT applied (or undone above):
-- 052's survivor_lab_preset reads the map. Dropping it loses the recorded positional-id ->
-- recipe mappings; rebuilding them later needs the jsonb lists still in full.
-- ═══════════════════════════════════════════════════════════════════════════════════════
begin;
drop function if exists public.survivor_id_legacy_map_rebuild(text, boolean);
drop table if exists public.survivor_id_legacy_map;
commit;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SECTION M1 -- undo 050. Only with 051 and 052 undone.
--
-- FIRST turn the engine flag off (APEX_PUBLISH_CHILD_ROWS unset on the box): with the table
-- gone the engine's child write fails -- harmlessly, it never breaks the verdict
-- publication -- but it would log every unit. This drops every child row.
-- ═══════════════════════════════════════════════════════════════════════════════════════
begin;
set local lock_timeout = '5s';

drop trigger if exists engine_verdicts_survivor_rows_guard on public.engine_verdicts;
drop trigger if exists engine_verdicts_survivor_rows_demoted on public.engine_verdicts;
drop trigger if exists engine_verdicts_survivor_rows_deleted on public.engine_verdicts;

-- 037's trigger form: every update.
drop trigger if exists survivor_family_index_sync on public.engine_verdicts;
create trigger survivor_family_index_sync
  after insert or update or delete on public.engine_verdicts
  for each row execute function public.survivor_family_index_sync();

drop function if exists public.engine_verdict_survivor_entry(public.engine_verdict_survivor);
drop table if exists public.engine_verdict_survivor;
drop function if exists public.engine_verdict_survivor_family();
drop function if exists public.engine_verdicts_survivor_rows_guard();
drop function if exists public.engine_verdicts_survivor_rows_purge();
drop function if exists public.survivor_legacy_id(text, text, integer, bigint);

drop index if exists public.engine_verdicts_current_publish_seq_uq;
alter table public.engine_verdicts drop constraint if exists engine_verdicts_survivors_storage_check;
alter table public.engine_verdicts
  drop column if exists current_publish_seq,
  drop column if exists survivors_storage;

commit;
