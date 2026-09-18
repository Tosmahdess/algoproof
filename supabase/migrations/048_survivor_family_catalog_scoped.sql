-- 048_survivor_family_catalog_scoped.sql
--
-- La moitie de /cockpit/survivants/tous qui reste morte pour un visiteur non abonne.
--
-- Mesure du 2026-09-18, apres la 047 : la page affiche desormais ses 38 strategies et
-- « 104 488 survivants sur 38 strategies », mais la liste des variantes ne s'affiche
-- toujours pas. survivor_family_all depasse encore les 3 s du role anon, et la page le
-- dit maintenant au lieu de rendre un corpus vide.
--
-- LA CAUSE, telle qu'elle est ecrite dans la 043 : la branche teaser appelle
-- survivor_family_catalog(p_dataset) -- 13 761 familles, 4 074 459 octets, 18,30 s
-- mesurees -- PUIS filtre le tableau JSON par strategie. Le filtre s'applique apres que
-- tout le travail a ete fait. La branche payante, elle, pousse
-- lower(m.base) = lower(p_strategy) dans son corpus et repond en 1,49 s pour 2,29 Mo,
-- mesure en posant l'identite d'un abonne reel.
--
-- CE QUE FAIT CETTE MIGRATION, ET RIEN D'AUTRE : le predicat descend d'un etage. Le
-- catalogue accepte p_strategy et l'applique dans son corpus, exactement au meme endroit
-- et avec le meme texte que la branche payante ; la branche teaser l'appelle scope. Elle
-- rend les memes familles, avec les memes dix cles, DANS LE MEME ORDRE -- celui du
-- catalogue (robustesse, isolement, PF decroissant), qui n'est pas celui de la branche
-- payante (strategy, family_id). Un visiteur ne verra donc pas ses familles se
-- reordonner : c'est la meme fonction qui les trie qu'avant.
--
-- POURQUOI LA CORRELATION N'EST PAS TOUCHEE ICI. La 047 a prouve une forme jointe, moins
-- chere, pour resoudre « la generation courante de chaque paire ». Elle n'est PAS reprise
-- ici : le but est que les lignes qui entrent dans le pipeline teaser soient selectionnees
-- par le MEME TEXTE SQL que celles de la branche payante. Deux implementations de la meme
-- regle, une par branche, c'est la configuration ou un abonne et un visiteur finissent par
-- voir deux corpus differents sans qu'aucun garde ne s'en apercoive. La factorisation des
-- quatre pipelines et la decorrelation restent reservees a leur propre migration, avec une
-- preuve d'equivalence dediee.
--
-- CE QUE LE PAYANT RISQUE : rien qui ne se mesure. Le bloc paye de survivor_family_all est
-- recopie octet pour octet -- ce fichier est genere par extraction du corps de la 043, et
-- le generateur s'arrete si ce bloc differe d'un seul caractere. La verification d'avant
-- et d'apres est dans supabase/tests/survivor_family_teaser_live.sql.
--
-- ⚠️ L'ORDRE DES INSTRUCTIONS COMPTE. `create or replace` ne remplace pas une fonction dont
-- la SIGNATURE change : il en cree une SURCHARGE. Laisser vivre survivor_family_catalog(text)
-- a cote de (text, text) rendrait l'appel PostgREST ambigu -- HTTP 300, « could not choose
-- the best candidate ». L'ancienne signature est donc supprimee d'abord, et les droits sont
-- reposes derriere : ils ne suivent pas une nouvelle signature.

drop function if exists public.survivor_family_catalog(text);

create or replace function public.survivor_family_catalog(
  p_dataset text default null,
  p_strategy text default null
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
  from grouped;
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
    -- 2026-09-18 : ceci construisait le catalogue ENTIER (13 761 familles, 4 Mo,
    -- 18,30 s) puis filtrait le tableau JSON obtenu. Le filtre par strategie
    -- n'economisait donc rien a qui n'avait pas paye, et cette branche mourait au
    -- statement_timeout de 3 s du role anon -- tandis que la branche payante plus
    -- bas, qui pousse le meme predicat DANS sa requete, repondait en 1,49 s.
    -- Le catalogue prend desormais ce predicat ; l'appel ci-dessous rend exactement
    -- les memes familles, dans le meme ordre, sans variante, comme avant.
    return pg_catalog.jsonb_build_object(
      'access', v_access,
      'families', coalesce(
        public.survivor_family_catalog(p_dataset, p_strategy) -> 'families',
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

comment on function public.survivor_family_catalog(text, text) is
  'Catalogue des familles de survivants, scope par strategie depuis 2026-09-18. Sans '
  'p_strategy il rend tout le corpus (13 761 familles, 4 Mo, 18,3 s) ; avec, il rend une '
  'strategie et sert la branche teaser de survivor_family_all, qui sans cela construisait '
  'le catalogue entier avant de le filtrer.';

revoke all on function public.survivor_family_catalog(text, text) from public;
grant execute on function public.survivor_family_catalog(text, text) to anon, authenticated;

-- Le cache de schema de PostgREST garde la signature d'avant : sans ceci, l'API repond
-- encore sur l'ancienne et le correctif est invisible depuis le site.
notify pgrst, 'reload schema';
