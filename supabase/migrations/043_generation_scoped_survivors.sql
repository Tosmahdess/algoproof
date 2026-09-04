-- 043_generation_scoped_survivors.sql
--
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- TWO GENERATIONS NOW COEXIST, AND THREE READERS DISAGREED ABOUT WHICH ONE IS "THE" ONE.
--
-- engine_verdicts is keyed (base, tf, dataset_version, kmax). On 2026-09-04 a tour started
-- that re-runs 30 already-published (base, tf) pairs under dataset data_20260831, alongside
-- 36 new ones. Each re-run INSERTS a second row beside the data_20260802 one -- nothing is
-- overwritten, nothing is deleted, and that is deliberate: the two generations are the only
-- way to say "this recipe survived two data windows".
--
-- The storage was never the problem. The readers were. This migration fixes the two that
-- are pure SQL and therefore need no deployment of either site.
--
-- ── 1. The survivor families resolved their dataset with a GLOBAL max ────────────────────
-- survivor_family_catalog / _detail / _all / _preview each carried, inlined:
--
--     m.dataset_version = coalesce(p_dataset,
--        (select max(latest.dataset_version) from survivor_family_member latest
--          where latest.published_at >= '2026-08-12T19:38:00Z'))
--
-- Global, not per pair. So the FIRST verdict published under data_20260831 -- one unit out of
-- 66 -- would have flipped every family page to that dataset, where only that one unit
-- exists. The 29 other pairs' families would have disappeared from /cockpit/survivants and
-- come back one at a time over the ~3 weeks the tour lasts. Correlating the subquery on
-- (base, tf) makes a pair yield to its OWN newer generation and to nothing else: a pair that
-- has not been recomputed keeps showing what we actually know about it.
--
-- ── 2. The Lab permalink resolved to the NEWEST generation ───────────────────────────────
-- survivor_id = 'surv_' || md5(base : tf : kmax : ordinality) -- it does NOT hash
-- dataset_version, so the same id exists once per generation, and there is no unique index on
-- it. survivor_lab_preset resolved with `order by published_at desc, dataset_version desc`,
-- so the day a pair re-published, every /lab?survivor=surv_... link already shared silently
-- started resolving to the NEW generation's survivor at the same RANK -- almost certainly a
-- different recipe. No 404, no notice, no way for the reader to know. ASC resolves a link to
-- the generation in which its id was first minted, which is what the person who shared it
-- saw. Every link shared before today was minted under data_20260802, so ASC is exactly
-- right for all of them.
--
--   KNOWN RESIDUAL, deliberately not fixed here: once the site starts minting links under
--   data_20260831, an id that ALSO exists under data_20260802 will resolve to the old one.
--   Closing that needs the permalink to carry its generation, which changes the function
--   signature and the call site in algolab -- a deploy, not a migration. Until then the
--   failure mode is "an old recipe under a new link", which is visible and inert, instead of
--   "a new recipe under an old link", which is silent and misleading. That asymmetry is the
--   reason to ship the ASC now rather than wait.
--
-- ── What this migration deliberately does NOT change ─────────────────────────────────────
-- * The public counters on algoproof.fr (funnel.ts::verdictTotals) sum n_behaviors and
--   n_go+n_marginal+n_no_go across ALL generations with no dataset filter. That is CORRECT
--   and stays: EMAcross D1 swept under data_20260802 and again under data_20260831 with a
--   42-cell exit grid instead of 30 is two genuinely different sets of configurations, both
--   really computed. Summing them measures work done. What would be wrong is counting two
--   STRATEGIES where there is one -- and nothing does that: the "N strategies" on the home
--   comes from a static list, not from these rows.
-- * The engine write path. run_phase2b/telemetry.py upsert on (base, tf, dataset_version,
--   kmax) is untouched, and must be: the engine tree is frozen for the length of the tour.
-- * The cockpit's dataset selector (algolab web/lib/engine-filters.ts), which still defaults
--   to "the newest dataset that has BEGUN publishing" and so still collapses the view to the
--   new generation. That one is TypeScript, needs a deploy, and is tracked separately.
--
-- BODIES BELOW ARE THE LIVE ONES, COPIED VERBATIM, WITH ONLY THE HUNKS DESCRIBED ABOVE.
--   survivor_family_catalog -> from 037 (its latest definition)
--   survivor_family_detail  -> from 040   ⚠ NOT from 037: migration 040 redefined it for the
--   survivor_family_all     -> from 040     paid-status single source. Copying 037's body
--   survivor_lab_preset     -> from 040     here would have silently REVERTED 040.
--   survivor_family_preview -> from 038
--

create or replace function public.survivor_family_catalog(
  p_dataset text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with corpus as (
    select m.base,
           m.tf as timeframe,
           m.ordinality,
           m.kmax,
           m.family_id,
           m.filter_keys_txt,
           m.exit_keys_txt,
           m.name_suffix,
           m.eligible,
           m.sample_sufficient,
           m.pf,
           m.dd,
           m.n_trades
      from public.survivor_family_member m
     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and m.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.survivor_family_member latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
              -- CORRELATED, 2026-09-04 (migration 043). Was a GLOBAL max: the first
              -- verdict of a new dataset flipped every family to it, so every pair
              -- that had not been recomputed yet vanished from the cockpit until it
              -- was -- progressively, over the weeks a tour lasts. Scoped per (base,
              -- tf), a pair yields to its own newer generation and to nothing else.
              and latest.base = m.base
              and latest.tf = m.tf
         )
       )
  ), ranked as (
    select *,
           pg_catalog.row_number() over (
             partition by family_id
             order by eligible desc,
                      sample_sufficient desc,
                      pf desc nulls last,
                      dd asc nulls last,
                      n_trades desc,
                      timeframe,
                      ordinality,
                      -- kmax closes the tie-break. 036 stopped at ordinality, which
                      -- leaves two survivors from different units of the same
                      -- (base, tf) fully tied. No family is in that state today
                      -- (measured: 0 groups), so this changes nothing now and stops
                      -- the representative from drifting between runs later.
                      kmax
           ) as representative_rank
      from corpus
  ), grouped as (
    select family_id,
           pg_catalog.min(base) as strategy,
           pg_catalog.min(filter_keys_txt) as filter_keys_txt,
           pg_catalog.min(exit_keys_txt) as exit_keys_txt,
           pg_catalog.min(name_suffix) as name_suffix,
           case
             when pg_catalog.count(distinct timeframe) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct timeframe) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end as robustness,
           pg_catalog.jsonb_agg(distinct timeframe order by timeframe) as timeframes,
           pg_catalog.count(*)::integer as survivor_count,
           pg_catalog.count(*) = 1 as isolated,
           pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max(pf) filter (where representative_rank = 1),
             'dd', pg_catalog.max(dd) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max(n_trades) filter (where representative_rank = 1)
           ) as representative
      from ranked
     group by family_id
  )
  select pg_catalog.jsonb_build_object(
    'families', coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', family_id,
          'strategy', strategy,
          'name', strategy || name_suffix,
          'robustness', robustness,
          'timeframes', timeframes,
          'filter_keys', filter_keys_txt::jsonb,
          'exit_keys', exit_keys_txt::jsonb,
          'survivor_count', survivor_count,
          'isolated', isolated,
          'representative', representative
        )
        order by
          case robustness
            when 'multi_horizon' then 0
            when 'single_horizon' then 1
            else 2
          end,
          isolated,
          (representative ->> 'pf')::numeric desc nulls last,
          (representative ->> 'dd')::numeric asc nulls last,
          (representative ->> 'n_trades')::integer desc,
          family_id
      ),
      '[]'::jsonb
    )
  )
  from grouped;
$$;

create or replace function public.survivor_family_detail(
  p_family_id text,
  p_dataset text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_free_sample constant text := 'EMAcross';
  v_uid uuid := auth.uid();
  v_access text := 'teaser';
  v_strategy text;
  v_summary jsonb;
  v_full_variants jsonb := '[]'::jsonb;
begin
  -- 036 computed the signature of the whole corpus and only then kept one family, so
  -- every family page cost the same 2.55 s, including a page for a family that does
  -- not exist. The family_id index makes this read only the family asked for.
  with selected as (
    select m.*,
           pg_catalog.row_number() over (
             partition by m.family_id
             order by m.eligible desc,
                      m.sample_sufficient desc,
                      m.pf desc nulls last,
                      m.dd asc nulls last,
                      m.n_trades desc,
                      m.tf,
                      m.ordinality,
                      m.kmax
           ) as representative_rank
      from public.survivor_family_member m
     where m.family_id = p_family_id
       and m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and m.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.survivor_family_member latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
              -- CORRELATED, 2026-09-04 (migration 043). Was a GLOBAL max: the first
              -- verdict of a new dataset flipped every family to it, so every pair
              -- that had not been recomputed yet vanished from the cockpit until it
              -- was -- progressively, over the weeks a tour lasts. Scoped per (base,
              -- tf), a pair yields to its own newer generation and to nothing else.
              and latest.base = m.base
              and latest.tf = m.tf
         )
       )
  )
  select pg_catalog.min(base),
         pg_catalog.jsonb_build_object(
           'id', p_family_id,
           'strategy', pg_catalog.min(base),
           'name', pg_catalog.min(base) || pg_catalog.min(name_suffix),
           'robustness', case
             when pg_catalog.count(distinct tf) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct tf) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end,
           'timeframes', pg_catalog.jsonb_agg(distinct tf order by tf),
           'filter_keys', pg_catalog.min(filter_keys_txt)::jsonb,
           'exit_keys', pg_catalog.min(exit_keys_txt)::jsonb,
           'survivor_count', pg_catalog.count(*)::integer,
           'isolated', pg_catalog.count(*) = 1,
           'representative', pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max(pf) filter (where representative_rank = 1),
             'dd', pg_catalog.max(dd) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max(n_trades) filter (where representative_rank = 1)
           )
         ),
         pg_catalog.jsonb_agg(
           pg_catalog.jsonb_build_object(
             'survivor_id', survivor_id,
             'timeframe', tf,
             'eligible', eligible,
             'sample_sufficient', sample_sufficient,
             'pf', pf,
             'dd', dd,
             'n_trades', n_trades,
             'params', coalesce(recipe -> 'params', '{}'::jsonb),
             'filters', coalesce(recipe -> 'filters', '{}'::jsonb),
             'exit', coalesce(recipe -> 'exit', '{}'::jsonb)
           )
           order by tf,
                    eligible desc,
                    sample_sufficient desc,
                    pf desc nulls last,
                    dd asc nulls last,
                    n_trades desc,
                    ordinality,
                    kmax
         )
    into v_strategy, v_summary, v_full_variants
    from selected;

  if v_summary is null then
    return null;
  end if;

  if pg_catalog.lower(v_strategy) = pg_catalog.lower(c_free_sample) then
    v_access := 'full';
  elsif v_uid is not null and public.has_live_subscription(v_uid) then
    v_access := 'full';
  end if;

  return pg_catalog.jsonb_build_object(
    'access', v_access,
    'family', v_summary,
    'variants', case when v_access = 'full' then v_full_variants else '[]'::jsonb end
  );
end;
$$;

create or replace function public.survivor_family_all(
  p_dataset text default null,
  p_strategy text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_access text := 'teaser';
  v_families jsonb;
begin
  if v_uid is not null and public.has_live_subscription(v_uid) then
    v_access := 'full';
  end if;

  if v_access = 'teaser' then
    return pg_catalog.jsonb_build_object(
      'access', v_access,
      'families', coalesce(
        (
          select pg_catalog.jsonb_agg(f)
            from pg_catalog.jsonb_array_elements(
                   coalesce(public.survivor_family_catalog(p_dataset) -> 'families',
                            '[]'::jsonb)) f
           where p_strategy is null
              or pg_catalog.lower(f ->> 'strategy') = pg_catalog.lower(p_strategy)
        ),
        '[]'::jsonb)
    );
  end if;

  with corpus as (
    select m.*
      from public.survivor_family_member m
     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and (p_strategy is null
            or pg_catalog.lower(m.base) = pg_catalog.lower(p_strategy))
       and m.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.survivor_family_member latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
              -- CORRELATED, 2026-09-04 (migration 043). Was a GLOBAL max: the first
              -- verdict of a new dataset flipped every family to it, so every pair
              -- that had not been recomputed yet vanished from the cockpit until it
              -- was -- progressively, over the weeks a tour lasts. Scoped per (base,
              -- tf), a pair yields to its own newer generation and to nothing else.
              and latest.base = m.base
              and latest.tf = m.tf
         )
       )
  ), ranked as (
    select *,
           pg_catalog.row_number() over (
             partition by family_id
             order by eligible desc, sample_sufficient desc,
                      pf desc nulls last, dd asc nulls last, n_trades desc,
                      tf, ordinality, kmax
           ) as representative_rank
      from corpus
  ), grouped as (
    select family_id,
           pg_catalog.min(base) as strategy,
           pg_catalog.min(filter_keys_txt) as filter_keys_txt,
           pg_catalog.min(exit_keys_txt) as exit_keys_txt,
           pg_catalog.min(name_suffix) as name_suffix,
           pg_catalog.count(*)::integer as survivor_count,
           pg_catalog.count(*) = 1 as isolated,
           case
             when pg_catalog.count(distinct tf) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct tf) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end as robustness,
           pg_catalog.jsonb_agg(distinct tf order by tf) as timeframes,
           pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max(pf) filter (where representative_rank = 1),
             'dd', pg_catalog.max(dd) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max(n_trades) filter (where representative_rank = 1)
           ) as representative,
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'survivor_id', survivor_id,
               'timeframe', tf,
               'eligible', eligible,
               'sample_sufficient', sample_sufficient,
               'pf', pf,
               'dd', dd,
               'n_trades', n_trades,
               'params', coalesce(recipe -> 'params', '{}'::jsonb),
               'filters', coalesce(recipe -> 'filters', '{}'::jsonb),
               'exit', coalesce(recipe -> 'exit', '{}'::jsonb)
             )
             order by tf, eligible desc, sample_sufficient desc,
                      pf desc nulls last, dd asc nulls last, n_trades desc,
                      ordinality, kmax
           ) as variants
      from ranked
     group by family_id
  )
  select coalesce(
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'id', family_id,
               'strategy', strategy,
               'name', strategy || name_suffix,
               'robustness', robustness,
               'timeframes', timeframes,
               'filter_keys', filter_keys_txt::jsonb,
               'exit_keys', exit_keys_txt::jsonb,
               'survivor_count', survivor_count,
               'isolated', isolated,
               'representative', representative,
               'variants', variants
             )
             order by strategy, family_id
           ),
           '[]'::jsonb
         )
    into v_families
    from grouped;

  return pg_catalog.jsonb_build_object('access', v_access, 'families', v_families);
end;
$$;

create or replace function public.survivor_family_preview(
  p_dataset text default null,
  p_strategy text default 'EMAcross',
  p_timeframe text default null,
  p_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_strategy is null or pg_catalog.btrim(p_strategy) = '' then
    raise exception 'p_strategy must not be blank' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 20 then
    raise exception 'p_limit must be between 1 and 20' using errcode = '22023';
  end if;

  with corpus as (
    select m.base,
           m.tf as timeframe,
           m.ordinality,
           m.kmax,
           m.family_id,
           m.filter_keys_txt,
           m.exit_keys_txt,
           m.name_suffix,
           m.eligible,
           m.sample_sufficient,
           m.pf,
           m.dd,
           m.n_trades
      from public.survivor_family_member m
     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and pg_catalog.lower(m.base) = pg_catalog.lower(p_strategy)
       and m.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.survivor_family_member latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
              -- CORRELATED, 2026-09-04 (migration 043). Was a GLOBAL max: the first
              -- verdict of a new dataset flipped every family to it, so every pair
              -- that had not been recomputed yet vanished from the cockpit until it
              -- was -- progressively, over the weeks a tour lasts. Scoped per (base,
              -- tf), a pair yields to its own newer generation and to nothing else.
              and latest.base = m.base
              and latest.tf = m.tf
         )
       )
  ), ranked as (
    select *,
           pg_catalog.row_number() over (
             partition by family_id
             order by eligible desc,
                      sample_sufficient desc,
                      pf desc nulls last,
                      dd asc nulls last,
                      n_trades desc,
                      timeframe,
                      ordinality,
                      kmax
           ) as representative_rank
      from corpus
  ), grouped as (
    select family_id,
           pg_catalog.min(base) as strategy,
           pg_catalog.min(filter_keys_txt) as filter_keys_txt,
           pg_catalog.min(exit_keys_txt) as exit_keys_txt,
           pg_catalog.min(name_suffix) as name_suffix,
           case
             when pg_catalog.count(distinct timeframe) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct timeframe) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end as robustness,
           pg_catalog.jsonb_agg(distinct timeframe order by timeframe) as timeframes,
           pg_catalog.count(*)::integer as survivor_count,
           pg_catalog.count(*) = 1 as isolated,
           pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max(pf) filter (where representative_rank = 1),
             'dd', pg_catalog.max(dd) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max(n_trades) filter (where representative_rank = 1)
           ) as representative
      from ranked
     group by family_id
  ), matching as (
    select *,
           case robustness
             when 'multi_horizon' then 0
             when 'single_horizon' then 1
             else 2
           end as robustness_rank,
           (representative ->> 'pf')::numeric as representative_pf,
           (representative ->> 'dd')::numeric as representative_dd,
           (representative ->> 'n_trades')::integer as representative_n_trades
      from grouped
     where p_timeframe is null or timeframes ? p_timeframe
  ), ordered as (
    select *,
           pg_catalog.row_number() over (
             order by robustness_rank,
                      isolated,
                      representative_pf desc nulls last,
                      representative_dd asc nulls last,
                      representative_n_trades desc,
                      family_id
           ) as preview_rank
      from matching
  )
  select pg_catalog.jsonb_build_object(
           'strategy', coalesce(pg_catalog.min(strategy), p_strategy),
           'timeframe', p_timeframe,
           'total', pg_catalog.count(*)::integer,
           'families', coalesce(
             pg_catalog.jsonb_agg(
               pg_catalog.jsonb_build_object(
                 'id', family_id,
                 'strategy', strategy,
                 'name', strategy || name_suffix,
                 'robustness', robustness,
                 'timeframes', timeframes,
                 'filter_keys', filter_keys_txt::jsonb,
                 'exit_keys', exit_keys_txt::jsonb,
                 'survivor_count', survivor_count,
                 'isolated', isolated,
                 'representative', representative
               ) order by preview_rank
             ) filter (where preview_rank <= p_limit),
             '[]'::jsonb
           )
         )
    into v_result
    from ordered;

  return v_result;
end;
$$;

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

