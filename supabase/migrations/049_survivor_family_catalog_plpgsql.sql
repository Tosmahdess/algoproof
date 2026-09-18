-- 049_survivor_family_catalog_plpgsql.sql
--
-- LE CORPS DE CETTE FONCTION EST JUSTE. C'EST SON ENVELOPPE QUI LA TUAIT.
--
-- Mesure du 2026-09-19, les trois fonctions dos a dos dans une meme transaction, donc sous
-- la meme charge -- ce qui manquait a toutes mes mesures precedentes :
--
--   branche PAYANTE de survivor_family_all (plpgsql, variantes comprises) ... 1,50 s / 2 291 564 o
--   le MEME corps que ci-dessous, enveloppe en plpgsql ....................... 0,12 s /   263 604 o
--   survivor_family_catalog tel que deploye, en language sql ................ 17,25 s /   263 604 o
--   le jumeau plpgsql sur HMAcross, la plus grosse strategie ................. 1,62 s /   324 847 o
--
-- Octets identiques, corps identique au caractere pres, 17,25 s contre 0,12.
--
-- POURQUOI. Une fonction `language sql` qui ne peut pas etre inlinee -- et `security
-- definer` + `set search_path` l'interdisent -- est planifiee avec ses parametres INCONNUS.
-- Le planificateur ne voit jamais 'EMAcross', seulement $2. Or
-- `($2 is null or lower(base) = lower($2))` n'est pas indexable tant que $2 est inconnu :
-- la branche `$2 is null` n'a aucun index, donc aucun BitmapOr possible. PostgreSQL balaie
-- alors le heap entier -- 200 Mo -- a CHAQUE appel, que la strategie demandee ait 18 000
-- familles ou zero. C'est pourquoi rendre un tableau vide coutait 10,9 s.
--
-- Une fonction plpgsql, elle, passe par SPI et le cache de plans, qui replanifie AVEC la
-- valeur du parametre : le `or` se replie, l'index sur lower(base) sert, et le sous-plan
-- correle n'est meme pas execute. La branche payante de survivor_family_all est en plpgsql
-- depuis toujours : c'est pour cela qu'elle fait plus de travail en dix fois moins de temps,
-- et c'est l'observation que j'ai mis trois hypotheses fausses a comprendre.
--
-- CE QUE CETTE MIGRATION CHANGE : `language sql` devient `language plpgsql`, le corps est
-- enveloppe dans `begin return (...); end`. Pas une ligne de logique. Meme signature, memes
-- droits, meme volatilite, meme search_path, meme frontiere payante.
--
-- ET UNE CEINTURE. `plan_cache_mode = force_custom_plan` sur les deux fonctions. Le cache de
-- plans bascule sur un plan GENERIQUE apres cinq appels sur une meme connexion s'il l'estime
-- moins cher -- et un plan generique, ici, c'est exactement le balayage qu'on vient de
-- supprimer. La mesure le montre deja : le 2e appel du jumeau (0,53 s) est plus lent que le
-- premier (0,12 s). PostgREST maintient un pool, donc chaque connexion refait ces cinq
-- essais. La branche payante vit sur ce meme hasard depuis toujours, a 1,50 s pour un budget
-- de 8 s : elle ne l'a jamais senti, ce qui ne veut pas dire qu'elle est a l'abri.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS : elle ne touche ni au corps, ni aux index, ni au
-- chemin d'ecriture, ni a survivor_family_all (seul son proconfig change). Retour arriere :
-- rejouer le corps de la 048 et `alter function ... reset plan_cache_mode`.

create or replace function public.survivor_family_catalog(
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

alter function public.survivor_family_catalog(text, text)
  set plan_cache_mode = force_custom_plan;

alter function public.survivor_family_all(text, text)
  set plan_cache_mode = force_custom_plan;

comment on function public.survivor_family_catalog(text, text) is
  'Catalogue des familles de survivants, scope par strategie (048) et en plpgsql (049). '
  'Le passage a plpgsql n a change aucune ligne de logique : en language sql, la fonction '
  'etait planifiee parametres inconnus, le predicat de strategie n etait pas indexable, et '
  'chaque appel balayait les 200 Mo de la table. 17,25 s -> 0,12 s, octets identiques.';

revoke all on function public.survivor_family_catalog(text, text) from public;
grant execute on function public.survivor_family_catalog(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
