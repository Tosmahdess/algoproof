-- 2026-09-21_banc_generation_courante.sql
--
-- ⚠️ « Failed to fetch (api.supabase.com) » N'EST PAS UNE ERREUR SQL. C'est la passerelle
-- du dashboard qui coupe une requête trop longue : le SQL continue côté serveur, seul le
-- navigateur a lâché. Lancer UN SEUL BLOC à la fois, et si un bloc revient comme ça,
-- baisser son `statement_timeout` local plutôt que l'augmenter -- on cherche à savoir SI ça
-- tient dans un budget, pas à obtenir le résultat coûte que coûte.
--
-- LECTURE SEULE. Chaque bloc est encadré de `begin; ... rollback;` et ne crée, ne modifie
-- ni ne supprime quoi que ce soit. À coller dans l'éditeur SQL Supabase UN BLOC À LA FOIS.
--
-- ---------------------------------------------------------------------------
-- CE QUE CE BANC TRANCHE, ET POURQUOI IL EXISTE
--
-- Mesuré le 2026-09-21 en REST contre la production :
--   survivor_strategy_summary(null)      clé anon      5 tirs / 5 -> HTTP 500 57014, ~4,3 s
--   survivor_strategy_summary(null)      service_role  3 tirs / 3 -> timeout,        ~9,6 s
--   survivor_strategy_summary('data_20260831')         timeout aussi
--   survivor_family_catalog(null,'EMAcross')           200 en 2,0 s,  263 Ko
--   survivor_family_catalog(null, null)                timeout
--
-- L'agrégat dépasse donc le budget de TOUS les rôles (anon 3 s, authenticated 8 s), et la
-- page /cockpit/survivants/tous ne l'appelle QUE sur la branche abonnée : un abonné voit
-- aujourd'hui strictement moins qu'un visiteur anonyme.
--
-- Deux hypothèses restent ouvertes, et un seul EXPLAIN les tranche toutes les deux :
--
--   (A) LE PLAN GÉNÉRIQUE — HYPOTHÈSE RÉFUTÉE LE 21/09, ET VOICI LA MESURE.
--
--       L'hypothèse : la 049 n'a pas seulement réécrit le catalogue en plpgsql, elle a
--       épinglé `plan_cache_mode = force_custom_plan` sur survivor_family_catalog ET
--       survivor_family_all. La 047 (survivor_strategy_summary) ne l'a jamais reçu, et
--       c'est la seule des trois qui meurt. PostgREST appelant par instruction préparée,
--       un plan GÉNÉRIQUE laisse `coalesce($1, g.dataset_version)` sous forme d'expression
--       opaque, ni estimable ni indexable.
--
--       LA RÉFUTATION, sans écrire une ligne en base et par le canal qui a produit le
--       rouge. `survivor_strategy_summary` a un paramètre PAR DÉFAUT. Un POST REST avec un
--       corps VIDE (`{}`) appelle donc `survivor_strategy_summary()` SANS argument : la
--       valeur par défaut est substituée à l'analyse, le coalesce est replié sur une
--       constante, et il n'y a plus un seul paramètre dans le plan. Mesuré le 21/09 :
--
--         corps {}                  clé anon (3 s)      3 tirs / 3 -> 57014, ~4,2 s
--         corps {"p_dataset":null}  clé anon (3 s)      3 tirs / 3 -> 57014, ~4,1 s
--         corps {}                  service_role (8 s)            -> 57014, 9,54 s
--         corps {"p_dataset":null}  service_role (8 s)            -> 57014, 9,62 s
--
--       Le bras planifié avec une CONSTANTE meurt exactement comme le bras paramétré, et
--       il meurt aussi sous 8 s. Donc : le coût est le TRAVAIL, pas le plan. La migration
--       053 qui n'aurait posé que `set plan_cache_mode` a été SUPPRIMÉE de l'arbre plutôt
--       que laissée « au cas où » : une migration exécutable dont l'hypothèse est réfutée
--       est un piège pour la session suivante.
--
--       CE QUE ÇA NE DIT PAS : que le plan n'y est pour rien du tout. Il dit que même le
--       meilleur plan accessible aujourd'hui dépasse 8 s. C'est la 054 — retirer une passe
--       entière sur le corpus — qui est le correctif candidat, et le BLOC 1/2 mesure ce
--       qu'elle rend.
--
--   (E) LA LARGEUR. 182 Mo pour 136 661 lignes, dont l'essentiel en `recipe`/`signature`
--       jsonb que cet agrégat ne lit jamais. Si le bloc 1 montre un Seq Scan qui traîne le
--       tas, l'index couvrant en attente (supabase/manual/2026-09-18_..._aggregate_index)
--       redevient discutable. Sinon il est mort : il indexerait la branche `_jsonb`, celle
--       qui est GELÉE depuis la 052, pendant que `engine_verdict_survivor` grandit.
--
-- Et il mesure le correctif de fond candidat (bloc 2), avec son oracle d'égalité (bloc 3).
--
-- ---------------------------------------------------------------------------
-- LE CORRECTIF DE FOND CANDIDAT, ET LA MESURE QUI LE JUSTIFIE DÉJÀ
--
-- La CTE `current_generation` de la 047 regroupe les 136 661 lignes du corpus pour
-- recalculer, à CHAQUE LECTURE, un fait de publication déjà stocké dans les 351 lignes de
-- `engine_verdicts`. Le bloc 2 remplace cette CTE par la même question posée à
-- `engine_verdicts`.
--
-- Vérification faite hors SQL le 21/09, en REST : « génération courante par (base, tf),
-- après la coupure du 2026-08-12 » appliquée aux 351 lignes d'`engine_verdicts_public`
-- reproduit EXACTEMENT le compte de survivants du catalogue, sur six stratégies :
--
--   stratégie        moteur    catalogue    écart
--   EMAcross           5398         5398        0
--   ATRChannel         5985         5985        0
--   Ichimoku          14870        14870        0
--   ChandelierExit    15880        15880        0
--   HMAcross          20772        20772        0
--   ROC                5761         5761        0
--
-- C'est une égalité sur des TOTAUX, calculée depuis le côté moteur. Elle rend le correctif
-- plausible ; elle ne le prouve pas. Le bloc 3 est la preuve : il compare les deux jsonb
-- ENTIERS, clé par clé, ordre compris.
--
-- ⚠️ CE QUE LE BLOC 3 PEUT RÉVÉLER, et c'est pour ça qu'il existe : la jointure est INNER.
-- Une paire (base, tf) présente dans `survivor_family_member` mais absente d'
-- `engine_verdicts` après la coupure verrait ses lignes DISPARAÎTRE, là où la 047 les
-- gardait (elle dérivait la génération du corpus lui-même, donc elle était
-- auto-cohérente par construction). Un `false` au bloc 3 signifie exactement ça, et le
-- bloc 3 bis le nomme.


-- ===========================================================================
-- BLOC 1 — Le corps nu de survivor_strategy_summary, littéraux au lieu de paramètres.
--          Répond à : le coût est-il le PLAN (hypothèse A) ou le TRAVAIL ?
-- ===========================================================================
begin;
set local statement_timeout = '180s';

explain (analyze, buffers, verbose off)
with current_generation as (
  select m.base,
         m.tf,
         max(m.dataset_version) as dataset_version
    from public.survivor_family_member m
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
   group by m.base, m.tf
), corpus as (
  select m.base,
         m.family_id,
         m.exit_keys_txt
    from public.survivor_family_member m
    join current_generation g
      on g.base = m.base
     and g.tf = m.tf
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
     and m.dataset_version = coalesce(null, g.dataset_version)
), families as (
  select family_id,
         min(base) as strategy,
         min(exit_keys_txt)::jsonb as exit_keys,
         count(*)::integer as survivor_count
    from corpus
   group by family_id
)
select jsonb_build_object(
  'strategies', coalesce(
    (
      select jsonb_agg(
               jsonb_build_object(
                 'strategy', strategy,
                 'exit_keys', exit_keys,
                 'family_count', family_count,
                 'survivor_count', survivor_count
               )
               order by strategy, exit_keys::text
             )
        from (
          select strategy,
                 exit_keys,
                 count(*)::integer as family_count,
                 sum(survivor_count)::integer as survivor_count
            from families
           group by strategy, exit_keys
        ) rows_by_exit_shape
    ),
    '[]'::jsonb
  )
);

rollback;

-- COMMENT LIRE LE BLOC 1
--   « Execution Time » sous 1 000 ms  -> hypothèse A VRAIE : le corps est sain, c'est
--      l'enveloppe `language sql` qui tue. Correctif = enveloppe plpgsql, comme la 049.
--   « Execution Time » au-delà de 8 s -> hypothèse A MORTE. Lire alors les deux Seq Scan
--      sur survivor_family_member : leurs `Buffers: shared hit/read` disent combien de tas
--      est traîné. C'est le chiffre qui décide de E (index couvrant) au bloc 4.
--   Noter aussi : y a-t-il DEUX passes sur le corpus (une pour current_generation, une pour
--      corpus) ? C'est la passe que le bloc 2 supprime.


-- ===========================================================================
-- BLOC 2 — Le même agrégat, génération courante résolue depuis engine_verdicts (351 lignes).
--          Répond à : la passe supprimée change-t-elle l'ordre de grandeur ?
-- ===========================================================================
begin;
set local statement_timeout = '180s';

explain (analyze, buffers, verbose off)
with current_generation as (
  -- LA SEULE LIGNE QUI CHANGE, ET TOUT EST LÀ : le fait « génération courante de cette
  -- paire » est un fait de PUBLICATION. Il est écrit une fois par unité dans
  -- engine_verdicts (351 lignes le 21/09) ; le recalculer en regroupant 136 661 lignes de
  -- corpus à chaque lecture, c'est payer à la lecture ce qui a été décidé à l'écriture.
  select v.base,
         v.tf,
         max(v.dataset_version) as dataset_version
    from public.engine_verdicts v
   where v.published_at is not null
     and v.published_at >= '2026-08-12T19:38:00Z'::timestamptz
   group by v.base, v.tf
), corpus as (
  select m.base,
         m.family_id,
         m.exit_keys_txt
    from public.survivor_family_member m
    join current_generation g
      on g.base = m.base
     and g.tf = m.tf
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
     and m.dataset_version = coalesce(null, g.dataset_version)
), families as (
  select family_id,
         min(base) as strategy,
         min(exit_keys_txt)::jsonb as exit_keys,
         count(*)::integer as survivor_count
    from corpus
   group by family_id
)
select jsonb_build_object(
  'strategies', coalesce(
    (
      select jsonb_agg(
               jsonb_build_object(
                 'strategy', strategy,
                 'exit_keys', exit_keys,
                 'family_count', family_count,
                 'survivor_count', survivor_count
               )
               order by strategy, exit_keys::text
             )
        from (
          select strategy,
                 exit_keys,
                 count(*)::integer as family_count,
                 sum(survivor_count)::integer as survivor_count
            from families
           group by strategy, exit_keys
        ) rows_by_exit_shape
    ),
    '[]'::jsonb
  )
);

rollback;


-- ===========================================================================
-- BLOC 3 — L'ORACLE. Les deux formes rendent-elles le MÊME jsonb, entièrement ?
--          Un seul booléen. C'est lui qui autorise, ou interdit, la migration.
-- ===========================================================================
begin;
set local statement_timeout = '300s';

with gen_corpus as (
  select m.base, m.tf, max(m.dataset_version) as dataset_version
    from public.survivor_family_member m
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
   group by m.base, m.tf
), gen_verdicts as (
  select v.base, v.tf, max(v.dataset_version) as dataset_version
    from public.engine_verdicts v
   where v.published_at is not null
     and v.published_at >= '2026-08-12T19:38:00Z'::timestamptz
   group by v.base, v.tf
), corpus_a as (
  select m.family_id, m.base, m.exit_keys_txt
    from public.survivor_family_member m
    join gen_corpus g on g.base = m.base and g.tf = m.tf
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
     and m.dataset_version = g.dataset_version
), corpus_b as (
  select m.family_id, m.base, m.exit_keys_txt
    from public.survivor_family_member m
    join gen_verdicts g on g.base = m.base and g.tf = m.tf
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
     and m.dataset_version = g.dataset_version
), agg_a as (
  select min(base) as strategy, min(exit_keys_txt)::jsonb as exit_keys, count(*) as n
    from corpus_a group by family_id
), agg_b as (
  select min(base) as strategy, min(exit_keys_txt)::jsonb as exit_keys, count(*) as n
    from corpus_b group by family_id
), rows_a as (
  select strategy, exit_keys, count(*) as family_count, sum(n) as survivor_count
    from agg_a group by strategy, exit_keys
), rows_b as (
  select strategy, exit_keys, count(*) as family_count, sum(n) as survivor_count
    from agg_b group by strategy, exit_keys
)
select
  (select count(*) from rows_a)                                   as lignes_forme_actuelle,
  (select count(*) from rows_b)                                   as lignes_forme_candidate,
  (select coalesce(sum(survivor_count), 0) from rows_a)           as survivants_actuelle,
  (select coalesce(sum(survivor_count), 0) from rows_b)           as survivants_candidate,
  -- LE VERDICT : true = les deux formes sont indiscernables sur la sortie entière.
  not exists (
    (select * from rows_a except select * from rows_b)
    union all
    (select * from rows_b except select * from rows_a)
  )                                                               as formes_identiques;

rollback;


-- ===========================================================================
-- BLOC 3 bis — À NE LANCER QUE SI le bloc 3 rend `formes_identiques = false`.
--              Il NOMME la divergence au lieu de la laisser deviner : quelles paires
--              (base, tf) le corpus connaît que engine_verdicts ne confirme pas, et
--              l'inverse.
-- ===========================================================================
begin;
set local statement_timeout = '180s';

with gen_corpus as (
  select distinct m.base, m.tf
    from public.survivor_family_member m
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
), gen_verdicts as (
  select distinct v.base, v.tf
    from public.engine_verdicts v
   where v.published_at is not null
     and v.published_at >= '2026-08-12T19:38:00Z'::timestamptz
)
select 'corpus sans verdict' as cote, base, tf from (select * from gen_corpus except select * from gen_verdicts) x
union all
select 'verdict sans corpus' as cote, base, tf from (select * from gen_verdicts except select * from gen_corpus) y
order by cote, base, tf;

rollback;


-- ===========================================================================
-- BLOC 4 — LA MARGE, pas la panne. Le catalogue SCOPÉ tient-il à QUART de budget anon ?
--
-- Pourquoi le quart et pas la moitié : le corpus est passé de 42 522 survivants le 25/08 à
-- 214 543 le 21/09 (mesure REST sur engine_verdicts_public : 351 unités, 51 bases). À ce
-- rythme, un correctif qui ne tient qu'à demi-budget est périmé avant la fin du mois. Un
-- chemin qui passe à 750 ms survit à deux doublements.
--
-- EMAcross est l'échantillon gratuit : c'est la page PUBLIQUE, celle qui porte le bouton
-- payant. C'est elle qu'il faut défendre en premier, pas la page abonnée.
-- ===========================================================================
begin;
set local statement_timeout = '750ms';

select length(public.survivor_family_catalog(null, 'EMAcross')::text) as octets_emacross;

rollback;

-- Puis la plus grosse stratégie mesurée (ChandelierExit, 1 381 familles, 3,6 s de mur en
-- REST) : elle n'est servie qu'aux abonnés, donc son budget est 8 s, mais c'est elle qui
-- dira dans combien de temps la page abonnée retombe.
begin;
set local statement_timeout = '2s';

select length(public.survivor_family_catalog(null, 'ChandelierExit')::text) as octets_chandelier;

rollback;


-- ===========================================================================
-- BLOC 5 — L'ORACLE DU CATALOGUE, stratégie par stratégie.
--
-- Le bloc 3 prouve l'égalité au grain (stratégie, forme de sortie). Celui-ci la prouve au
-- grain de la FAMILLE, qui est ce que le catalogue publie : même ensemble de family_id,
-- même nombre de survivants dans chacune. C'est l'oracle de la future migration du
-- catalogue ; il ne dépend d'aucune des deux migrations et peut être rejoué à tout moment.
--
-- Sortie attendue : ZÉRO ligne. Chaque ligne rendue est une famille sur laquelle les deux
-- résolutions de génération ne sont pas d'accord.
-- ===========================================================================
begin;
set local statement_timeout = '300s';

with gen_corpus as (
  select m.base, m.tf, max(m.dataset_version) as dataset_version
    from public.survivor_family_member m
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
   group by m.base, m.tf
), gen_verdicts as (
  select v.base, v.tf, max(v.dataset_version) as dataset_version
    from public.engine_verdicts v
   where v.published_at is not null
     and v.published_at >= '2026-08-12T19:38:00Z'::timestamptz
   group by v.base, v.tf
), familles_a as (
  select m.family_id, min(m.base) as strategy, count(*) as survivor_count
    from public.survivor_family_member m
    join gen_corpus g on g.base = m.base and g.tf = m.tf
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
     and m.dataset_version = g.dataset_version
   group by m.family_id
), familles_b as (
  select m.family_id, min(m.base) as strategy, count(*) as survivor_count
    from public.survivor_family_member m
    join gen_verdicts g on g.base = m.base and g.tf = m.tf
   where m.published_at is not null
     and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
     and m.dataset_version = g.dataset_version
   group by m.family_id
)
select coalesce(a.strategy, b.strategy)             as strategie,
       coalesce(a.family_id, b.family_id)           as famille,
       a.survivor_count                             as survivants_forme_actuelle,
       b.survivor_count                             as survivants_forme_candidate,
       case
         when a.family_id is null then 'famille APPARUE avec les verdicts'
         when b.family_id is null then 'famille DISPARUE avec les verdicts'
         else 'compte different'
       end                                          as divergence
  from familles_a a
  full outer join familles_b b on b.family_id = a.family_id
 where a.family_id is null
    or b.family_id is null
    or a.survivor_count is distinct from b.survivor_count
 order by strategie, famille;

rollback;
