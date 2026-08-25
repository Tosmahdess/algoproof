-- 037_survivor_family_index.sql
--
-- 036 shipped correct payloads that production cannot serve. Measured on the live
-- database on 2026-08-25, against the real corpus (82 verdict rows, 42 522 survivors,
-- one dataset, data_20260802):
--
--   survivor_family_catalog        5.93 s   -> anon dies at its 3 s statement_timeout
--   survivor_family_detail         2.55 s   -> for ANY family, including a one-recipe
--                                             family and including an unknown id
--   survivor_family_all, teaser    5.46 s   -> anon dies
--   survivor_family_all, paid     14.73 s   -> over authenticated's 8 s timeout too,
--                                             so the exhaustive view fails for the
--                                             very people who pay for it
--
-- The corpus is not the problem: scanning it and unnesting every survivor takes
-- 0.06 s. The cost is survivor_family_signature, ~55 us per survivor, recomputed for
-- the whole corpus on every single request. The catalog paid it TWICE because
-- PostgreSQL inlines a CTE referenced once, so `signature` was evaluated both under
-- family_id and again in the WindowAgg output (visible in EXPLAIN as two
-- survivor_family_signature calls, 2.45 s of pure repetition).
--
-- `with corpus as materialized` removes the repetition and takes the catalog to
-- 3.59 s. That is still over anon's 3 s and does nothing for the paid branch, so it
-- is not the fix. Narrowing the rows and grouping in two stages was measured too and
-- came out SLOWER (5.73 s), because it moved per-family subplans onto 42 522 rows.
--
-- The fix is to stop recomputing on the read path. This migration precomputes the
-- family assignment once per published verdict row and keeps it in sync with a
-- trigger. Measured with the same payload assertions: catalog 0.41 s, and the
-- returned JSON is byte-for-byte identical to 036 (md5 37ed128435b2bbeabd691f54bb86f62a,
-- 905 525 bytes). It also scales: the corpus nearly doubled in the days before this
-- migration, and the on-the-fly form was already at 1.4x the anon budget.
--
-- 036 is left exactly as it was applied. Everything here is additive or a
-- create-or-replace of a function 036 introduced.

-- ---------------------------------------------------------------------------
-- 1. The signature becomes total.
--
-- `coalesce(p_recipe -> 'exit', '{}'::jsonb)` does NOT guard against a recipe that
-- carries `"exit": null`. `->` returns jsonb null there, not SQL NULL, so coalesce
-- keeps it and jsonb_each raises `cannot call jsonb_each on a non-object`.
-- 1 095 of the 42 522 survivors the RPCs read are in exactly that shape today.
-- 036 survives them only because its evaluation order happens to skip the call:
-- the same body without the SET clause, which lets the planner inline it, raises on
-- 37 verdict rows. Any future rewrite that changes evaluation order takes the whole
-- catalogue down. A jsonb_typeof guard removes the trap instead of relying on luck.
--
-- The `order by key` on the two jsonb_object_agg calls is also dropped. A jsonb
-- object stores its keys in a normalised order, so aggregating them in a different
-- order builds the same value; the sort was dead weight in a function called 42 522
-- times. The `order by key` on 'filters' STAYS: that one builds a jsonb array, and
-- arrays keep the order they are given.
--
-- Verified on production before shipping: over all 42 522 survivors the RPCs read,
-- this body and the 036 body differ on 0 of them.
create or replace function public.survivor_family_signature(
  p_base text,
  p_recipe jsonb
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'strategy', pg_catalog.lower(p_base),
    'structural_params', coalesce(
      (
        select pg_catalog.jsonb_object_agg(key, value)
          from pg_catalog.jsonb_each(
                 case when pg_catalog.jsonb_typeof(p_recipe -> 'params') = 'object'
                      then p_recipe -> 'params'
                      else '{}'::jsonb end)
         where pg_catalog.jsonb_typeof(value) not in ('number', 'null')
      ),
      '{}'::jsonb
    ),
    'filters', coalesce(
      (
        select pg_catalog.jsonb_agg(key order by key)
          from pg_catalog.jsonb_each(
                 case when pg_catalog.jsonb_typeof(p_recipe -> 'filters') = 'object'
                      then p_recipe -> 'filters'
                      else '{}'::jsonb end)
         where value <> '{}'::jsonb
           and value <> 'null'::jsonb
      ),
      '[]'::jsonb
    ),
    'exit_shape', coalesce(
      (
        select pg_catalog.jsonb_object_agg(
                 key,
                 case
                   when pg_catalog.jsonb_typeof(value) = 'number' then '0'::jsonb
                   else value
                 end
               )
          from pg_catalog.jsonb_each(
                 case when pg_catalog.jsonb_typeof(p_recipe -> 'exit') = 'object'
                      then p_recipe -> 'exit'
                      else '{}'::jsonb end)
      ),
      '{}'::jsonb
    )
  );
$$;

comment on function public.survivor_family_signature(text, jsonb) is
  'Structural signature of one survivor recipe. Total: a params/filters/exit that is '
  'not a JSON object degrades to an empty object instead of raising. Called from the '
  'index trigger only, never from a read path.';

-- ---------------------------------------------------------------------------
-- 2. The precomputed membership index.
--
-- One row per survivor, carrying everything the three RPCs need so that no read
-- path ever calls survivor_family_signature again. It holds paid data (the recipe,
-- its params, its filters, its exit), so it is closed the same way engine_verdicts
-- is: RLS on with no policy AND the grants revoked. Only the SECURITY DEFINER RPCs
-- below may read it, and each of them decides entitlement from auth.uid().
create table if not exists public.survivor_family_member (
  -- identity of the source unit; matches engine_verdicts' primary key
  base              text        not null,
  tf                text        not null,
  dataset_version   text        not null,
  kmax              integer     not null,
  ordinality        integer     not null,
  published_at      timestamptz,

  family_id         text        not null,
  -- kept for auditability: it answers "why were these grouped together", which the
  -- family page is required to explain. No read path reads it.
  signature         jsonb       not null,

  -- SURVIVOR IDENTITY INCLUDES kmax, AND THAT IS THE POINT.
  --
  -- 036 hashed lower(base) || ':' || timeframe || ':' || ordinality. A (base, tf)
  -- pair carries up to three units that differ only by kmax, and ordinality restarts
  -- at 1 inside each unit, so 036 handed the same survivor_id to different survivors:
  -- measured on production, 42 522 survivors collapsed onto 41 208 distinct ids,
  -- 1 314 of them sharing an id with another survivor. engine_verdicts' own primary
  -- key is (base, tf, dataset_version, kmax) — kmax is part of identity upstream and
  -- has to be part of it here.
  survivor_id       text        not null,

  eligible          boolean     not null,
  sample_sufficient boolean     not null,
  pf                numeric,
  dd                numeric,
  n_trades          integer,
  recipe            jsonb       not null,

  -- Derived once, so the catalog never parses a signature at request time.
  filter_keys_txt   text        not null,
  exit_keys_txt     text        not null,
  name_suffix       text        not null,

  primary key (base, tf, dataset_version, kmax, ordinality)
);

create index if not exists survivor_family_member_family_idx
  on public.survivor_family_member (family_id);

create index if not exists survivor_family_member_window_idx
  on public.survivor_family_member (dataset_version, published_at);

-- Lowercased, because every URL the site produces is lowercase while the corpus
-- stores camelCase base names — the same rule dossier_payload documents at length.
create index if not exists survivor_family_member_strategy_idx
  on public.survivor_family_member (dataset_version, pg_catalog.lower(base));

alter table public.survivor_family_member enable row level security;

-- Deliberately no policy. RLS with no policy denies every row to every non-bypassing
-- role; the revoke below denies the table outright. Two layers, on purpose: this
-- table holds the paid corpus in the clear.
revoke all on table public.survivor_family_member from public;
revoke all on table public.survivor_family_member from anon, authenticated;

comment on table public.survivor_family_member is
  'Precomputed survivor -> functional family assignment. Maintained by trigger from '
  'engine_verdicts; never written by hand. Closed to anon and authenticated by RLS '
  'with no policy AND by revoked grants: it holds paid recipes verbatim.';

-- ---------------------------------------------------------------------------
-- 3. Keeping it in sync.
--
-- The engine publishes into engine_verdicts a handful of times a day, 82 rows in the
-- current window. Rebuilding one row's membership costs about 60 ms, so the write
-- path pays a cost it will not notice, and the index can never be stale — which
-- matters more than it sounds: /cockpit/survivants sells exhaustiveness, and a
-- staleness window would let the family totals contradict dossier_payload, which
-- reads engine_verdicts live.
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

drop trigger if exists survivor_family_index_sync on public.engine_verdicts;
create trigger survivor_family_index_sync
  after insert or update or delete on public.engine_verdicts
  for each row execute function public.survivor_family_index_sync();

-- ---------------------------------------------------------------------------
-- 4. Backfill. Idempotent: re-running the migration rebuilds from scratch.
truncate table public.survivor_family_member;

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
  ) s;

analyze public.survivor_family_member;

-- ---------------------------------------------------------------------------
-- 5. The three RPCs, reading the index.
--
-- Payloads are unchanged. The freshness rule, the dataset resolution, the ranking,
-- the ordering and the teaser allow-list are all carried over from 036 verbatim;
-- only the source of the rows changed. The one deliberate behaviour change is
-- survivor_id, which now includes kmax — see the column comment above.

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
  elsif v_uid is not null and exists (
    select 1
      from public.subscriptions s
     where s.user_id = v_uid
       and s.status = 'active'
       and (s.current_period_end is null or s.current_period_end > pg_catalog.now())
  ) then
    v_access := 'full';
  end if;

  return pg_catalog.jsonb_build_object(
    'access', v_access,
    'family', v_summary,
    'variants', case when v_access = 'full' then v_full_variants else '[]'::jsonb end
  );
end;
$$;

-- THE EXHAUSTIVE VIEW GAINS A STRATEGY SCOPE, AND IT IS NOT AN OPTIMISATION.
--
-- Measured on production: asked for the whole corpus, this function returns a single
-- 16 MB JSON document and takes 45.6 s under 036, 22.2 s reading the index. The
-- reading is not the cost — building the variant objects takes 0.39 s and grouping
-- them 0.96 s; assembling the one 16 MB document takes 13.3 s on its own. No SQL
-- rewrite makes a 16 MB payload fit an 8 s timeout, and it was never a page payload
-- either. Scoped to one strategy the same call takes 0.19 s to 1.35 s, which is what
-- /cockpit/survivants/tous now asks for, one strategy at a time. p_strategy stays
-- optional so an out-of-browser export can still ask for everything and wait.
--
-- The one-argument form is DROPPED rather than left beside this one: PostgREST
-- resolves overloads by argument names, and {p_dataset} alone would match both.
drop function if exists public.survivor_family_all(text);

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
  if v_uid is not null and exists (
    select 1
      from public.subscriptions s
     where s.user_id = v_uid
       and s.status = 'active'
       and (s.current_period_end is null or s.current_period_end > pg_catalog.now())
  ) then
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

-- ---------------------------------------------------------------------------
-- 6. The boundary, restated. create-or-replace keeps grants, but 036 spelled these
-- out and a reader of 037 alone must see the same thing.
revoke all on function public.survivor_family_signature(text, jsonb) from public;
revoke all on function public.survivor_family_index_sync() from public;
revoke all on function public.survivor_family_catalog(text) from public;
revoke all on function public.survivor_family_detail(text, text) from public;
revoke all on function public.survivor_family_all(text, text) from public;

grant execute on function public.survivor_family_catalog(text) to anon, authenticated;
grant execute on function public.survivor_family_detail(text, text) to anon, authenticated;
grant execute on function public.survivor_family_all(text, text) to anon, authenticated;
