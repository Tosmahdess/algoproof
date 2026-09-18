-- TEST DÉCISIF -- transaction annulée, rien n'est conservé.
-- Corps extrait du 048 par script, point-virgule final retiré (il ne peut pas vivre dans
-- un `return ( ... )`). Seul écart avec l'original : `language plpgsql`.

begin;

create or replace function public.survivor_family_catalog_pl(
  p_dataset text default null,
  p_strategy text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $PL$
begin
  return (
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
       -- LE SEUL AJOUT DE 048, et il est copie mot pour mot de la branche payante
       -- de survivor_family_all. Avant, la branche teaser filtrait par strategie
       -- APRES avoir construit le catalogue entier ; le filtre ne lui economisait
       -- donc rien, et elle mourait a 3 s pour tout visiteur non abonne.
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
  from grouped
  );
end
$PL$;

set local statement_timeout = '120s';

select 'jumeau plpgsql, corps identique' as fonction,
       pg_catalog.length(public.survivor_family_catalog_pl(null, 'EMAcross')::text) as octets,
       clock_timestamp() - statement_timestamp() as duree;

rollback;
