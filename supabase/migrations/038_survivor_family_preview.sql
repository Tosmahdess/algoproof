-- 038_survivor_family_preview.sql
--
-- /cockpit/survivants needs five family summaries, not the 905 KB catalogue.
-- This read stays on the precomputed 037 index, preserves the catalogue's global
-- robustness classification, then filters/ranks the requested preview server-side.

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

comment on function public.survivor_family_preview(text, text, text, integer) is
  'Bounded allowlisted family summaries for the survivor cockpit. Robustness remains '
  'global when the preview is narrowed to one timeframe.';

revoke all on function public.survivor_family_preview(text, text, text, integer) from public;
grant execute on function public.survivor_family_preview(text, text, text, integer) to anon, authenticated;
