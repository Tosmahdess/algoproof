-- 036_survivor_family_payload.sql
--
-- Survivor navigation is family-first. PostgreSQL owns both deterministic
-- membership and the paid-data boundary so application code never needs a
-- service-role read or a caller-provided entitlement flag.

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
        select pg_catalog.jsonb_object_agg(key, value order by key)
          from pg_catalog.jsonb_each(coalesce(p_recipe -> 'params', '{}'::jsonb))
         where pg_catalog.jsonb_typeof(value) not in ('number', 'null')
      ),
      '{}'::jsonb
    ),
    'filters', coalesce(
      (
        select pg_catalog.jsonb_agg(key order by key)
          from pg_catalog.jsonb_each(coalesce(p_recipe -> 'filters', '{}'::jsonb))
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
                 order by key
               )
          from pg_catalog.jsonb_each(coalesce(p_recipe -> 'exit', '{}'::jsonb))
      ),
      '{}'::jsonb
    )
  );
$$;

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
    select v.base,
           v.tf as timeframe,
           e.recipe,
           e.ordinality,
           public.survivor_family_signature(v.base, e.recipe) as signature
      from public.engine_verdicts v
      cross join lateral pg_catalog.jsonb_array_elements(
        coalesce(v.survivors, '[]'::jsonb)
      ) with ordinality as e(recipe, ordinality)
     where v.published_at is not null
       and v.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and v.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.engine_verdicts latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
         )
       )
  ), identified as (
    select *,
           'fam_' || pg_catalog.substr(pg_catalog.md5(signature::text), 1, 16) as family_id,
           coalesce((recipe ->> 'verdict') = 'GO_PAPER', false) as eligible,
           coalesce((recipe ->> 'n_trades')::integer >= 20, false) as sample_sufficient
      from corpus
  ), ranked as (
    select *,
           pg_catalog.row_number() over (
             partition by family_id
             order by eligible desc,
                      sample_sufficient desc,
                      (recipe ->> 'pf')::numeric desc nulls last,
                      (recipe ->> 'dd')::numeric asc nulls last,
                      (recipe ->> 'n_trades')::integer desc,
                      timeframe,
                      ordinality
           ) as representative_rank
      from identified
  ), families as (
    select family_id,
           pg_catalog.min(base) as strategy,
           pg_catalog.min(base) || case
             when pg_catalog.jsonb_array_length(signature -> 'filters') > 0
               then ' + ' || pg_catalog.array_to_string(
                 array(select pg_catalog.jsonb_array_elements_text(signature -> 'filters')),
                 ' + '
               )
             else ' sans filtre actif'
           end as name,
           case
             when pg_catalog.count(distinct timeframe) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct timeframe) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end as robustness,
           pg_catalog.jsonb_agg(distinct timeframe order by timeframe) as timeframes,
           signature -> 'filters' as filter_keys,
           coalesce(
             (select pg_catalog.jsonb_agg(exit_key order by exit_key)
                from pg_catalog.jsonb_object_keys(signature -> 'exit_shape') as keys(exit_key)),
             '[]'::jsonb
           ) as exit_keys,
           pg_catalog.count(*)::integer as survivor_count,
           pg_catalog.count(*) = 1 as isolated,
           pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max((recipe ->> 'pf')::numeric) filter (where representative_rank = 1),
             'dd', pg_catalog.max((recipe ->> 'dd')::numeric) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max((recipe ->> 'n_trades')::integer) filter (where representative_rank = 1)
           ) as representative
      from ranked
     group by family_id, signature
  )
  select pg_catalog.jsonb_build_object(
    'families', coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', family_id,
          'strategy', strategy,
          'name', name,
          'robustness', robustness,
          'timeframes', timeframes,
          'filter_keys', filter_keys,
          'exit_keys', exit_keys,
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
  from families;
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
  with corpus as (
    select v.base,
           v.tf as timeframe,
           e.recipe,
           e.ordinality,
           public.survivor_family_signature(v.base, e.recipe) as signature
      from public.engine_verdicts v
      cross join lateral pg_catalog.jsonb_array_elements(
        coalesce(v.survivors, '[]'::jsonb)
      ) with ordinality as e(recipe, ordinality)
     where v.published_at is not null
       and v.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and v.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.engine_verdicts latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
         )
       )
  ), identified as (
    select *,
           'fam_' || pg_catalog.substr(pg_catalog.md5(signature::text), 1, 16) as family_id,
           coalesce((recipe ->> 'verdict') = 'GO_PAPER', false) as eligible,
           coalesce((recipe ->> 'n_trades')::integer >= 20, false) as sample_sufficient
      from corpus
  ), selected as (
    select *,
           pg_catalog.row_number() over (
             partition by family_id
             order by eligible desc,
                      sample_sufficient desc,
                      (recipe ->> 'pf')::numeric desc nulls last,
                      (recipe ->> 'dd')::numeric asc nulls last,
                      (recipe ->> 'n_trades')::integer desc,
                      timeframe,
                      ordinality
           ) as representative_rank
      from identified
     where family_id = p_family_id
  )
  select pg_catalog.min(base),
         pg_catalog.jsonb_build_object(
           'id', p_family_id,
           'strategy', pg_catalog.min(base),
           'name', pg_catalog.min(base) || case
             when pg_catalog.jsonb_array_length(signature -> 'filters') > 0
               then ' + ' || pg_catalog.array_to_string(
                 array(select pg_catalog.jsonb_array_elements_text(signature -> 'filters')),
                 ' + '
               )
             else ' sans filtre actif'
           end,
           'robustness', case
             when pg_catalog.count(distinct timeframe) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct timeframe) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end,
           'timeframes', pg_catalog.jsonb_agg(distinct timeframe order by timeframe),
           'filter_keys', signature -> 'filters',
           'exit_keys', coalesce(
             (select pg_catalog.jsonb_agg(exit_key order by exit_key)
                from pg_catalog.jsonb_object_keys(signature -> 'exit_shape') as keys(exit_key)),
             '[]'::jsonb
           ),
           'survivor_count', pg_catalog.count(*)::integer,
           'isolated', pg_catalog.count(*) = 1,
           'representative', pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max((recipe ->> 'pf')::numeric) filter (where representative_rank = 1),
             'dd', pg_catalog.max((recipe ->> 'dd')::numeric) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max((recipe ->> 'n_trades')::integer) filter (where representative_rank = 1)
           )
         ),
         pg_catalog.jsonb_agg(
           pg_catalog.jsonb_build_object(
             'survivor_id', 'surv_' || pg_catalog.substr(
               pg_catalog.md5(pg_catalog.lower(base) || ':' || timeframe || ':' || ordinality::text),
               1,
               16
             ),
             'timeframe', timeframe,
             'eligible', eligible,
             'sample_sufficient', sample_sufficient,
             'pf', (recipe ->> 'pf')::numeric,
             'dd', (recipe ->> 'dd')::numeric,
             'n_trades', (recipe ->> 'n_trades')::integer,
             'params', coalesce(recipe -> 'params', '{}'::jsonb),
             'filters', coalesce(recipe -> 'filters', '{}'::jsonb),
             'exit', coalesce(recipe -> 'exit', '{}'::jsonb)
           )
           order by timeframe,
                    eligible desc,
                    sample_sufficient desc,
                    (recipe ->> 'pf')::numeric desc nulls last,
                    (recipe ->> 'dd')::numeric asc nulls last,
                    (recipe ->> 'n_trades')::integer desc,
                    ordinality
         )
    into v_strategy, v_summary, v_full_variants
    from selected
   group by family_id, signature;

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

create or replace function public.survivor_family_all(
  p_dataset text default null
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
      'families', coalesce(public.survivor_family_catalog(p_dataset) -> 'families', '[]'::jsonb)
    );
  end if;

  with corpus as (
    select v.base,
           v.tf as timeframe,
           e.recipe,
           e.ordinality,
           public.survivor_family_signature(v.base, e.recipe) as signature
      from public.engine_verdicts v
      cross join lateral pg_catalog.jsonb_array_elements(
        coalesce(v.survivors, '[]'::jsonb)
      ) with ordinality as e(recipe, ordinality)
     where v.published_at is not null
       and v.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and v.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.engine_verdicts latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
         )
       )
  ), identified as (
    select *,
           'fam_' || pg_catalog.substr(pg_catalog.md5(signature::text), 1, 16) as family_id,
           coalesce((recipe ->> 'verdict') = 'GO_PAPER', false) as eligible,
           coalesce((recipe ->> 'n_trades')::integer >= 20, false) as sample_sufficient
      from corpus
  ), ranked as (
    select *,
           pg_catalog.row_number() over (
             partition by family_id
             order by eligible desc,
                      sample_sufficient desc,
                      (recipe ->> 'pf')::numeric desc nulls last,
                      (recipe ->> 'dd')::numeric asc nulls last,
                      (recipe ->> 'n_trades')::integer desc,
                      timeframe,
                      ordinality
           ) as representative_rank
      from identified
  ), grouped as (
    select family_id,
           pg_catalog.min(base) as strategy,
           signature,
           pg_catalog.count(*)::integer as survivor_count,
           pg_catalog.count(*) = 1 as isolated,
           case
             when pg_catalog.count(distinct timeframe) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct timeframe) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end as robustness,
           pg_catalog.jsonb_agg(distinct timeframe order by timeframe) as timeframes,
           pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max((recipe ->> 'pf')::numeric) filter (where representative_rank = 1),
             'dd', pg_catalog.max((recipe ->> 'dd')::numeric) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max((recipe ->> 'n_trades')::integer) filter (where representative_rank = 1)
           ) as representative,
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'survivor_id', 'surv_' || pg_catalog.substr(
                 pg_catalog.md5(pg_catalog.lower(base) || ':' || timeframe || ':' || ordinality::text),
                 1,
                 16
               ),
               'timeframe', timeframe,
               'eligible', eligible,
               'sample_sufficient', sample_sufficient,
               'pf', (recipe ->> 'pf')::numeric,
               'dd', (recipe ->> 'dd')::numeric,
               'n_trades', (recipe ->> 'n_trades')::integer,
               'params', coalesce(recipe -> 'params', '{}'::jsonb),
               'filters', coalesce(recipe -> 'filters', '{}'::jsonb),
               'exit', coalesce(recipe -> 'exit', '{}'::jsonb)
             )
             order by timeframe, eligible desc, sample_sufficient desc,
                      (recipe ->> 'pf')::numeric desc nulls last,
                      (recipe ->> 'dd')::numeric asc nulls last,
                      (recipe ->> 'n_trades')::integer desc,
                      ordinality
           ) as variants
      from ranked
     group by family_id, signature
  )
  select coalesce(
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'id', family_id,
               'strategy', strategy,
               'name', strategy || case
                 when pg_catalog.jsonb_array_length(signature -> 'filters') > 0
                   then ' + ' || pg_catalog.array_to_string(
                     array(select pg_catalog.jsonb_array_elements_text(signature -> 'filters')),
                     ' + '
                   )
                 else ' sans filtre actif'
               end,
               'robustness', robustness,
               'timeframes', timeframes,
               'filter_keys', signature -> 'filters',
               'exit_keys', coalesce(
                 (select pg_catalog.jsonb_agg(exit_key order by exit_key)
                    from pg_catalog.jsonb_object_keys(signature -> 'exit_shape') as keys(exit_key)),
                 '[]'::jsonb
               ),
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

revoke all on function public.survivor_family_signature(text, jsonb) from public;
revoke all on function public.survivor_family_catalog(text) from public;
revoke all on function public.survivor_family_detail(text, text) from public;
revoke all on function public.survivor_family_all(text) from public;

grant execute on function public.survivor_family_catalog(text) to anon, authenticated;
grant execute on function public.survivor_family_detail(text, text) to anon, authenticated;
grant execute on function public.survivor_family_all(text) to anon, authenticated;
