-- 053_survivor_strategy_summary_custom_plan.sql
--
-- UNE LIGNE. Elle donne à survivor_strategy_summary la ceinture que la 049 avait posée sur
-- ses deux voisines et qu'elle seule n'a jamais reçue.
--
-- ⚠️ NE PAS APPLIQUER AVANT LE BLOC 0 de supabase/tests/2026-09-21_banc_generation_courante.sql.
-- Ce fichier est le correctif de l'hypothèse A ; si le banc la réfute, c'est la 054 qu'il
-- faut appliquer, pas celui-ci. Appliquer les deux « au cas où » ferait exactement ce que ce
-- dépôt refuse : deux correctifs pour une cause, et plus aucun moyen de savoir lequel a agi.
--
-- ---------------------------------------------------------------------------
-- CE QUI A ÉTÉ MESURÉ, LE 2026-09-21, CONTRE LA PRODUCTION
--
--   survivor_strategy_summary(null)             clé anon      5 tirs / 5 -> 500 57014, ~4,3 s
--   survivor_strategy_summary(null)             service_role  3 tirs / 3 -> timeout,   ~9,6 s
--   survivor_strategy_summary('data_20260831')  clé anon                 -> timeout
--   survivor_family_catalog(null, 'EMAcross')   clé anon                 -> 200 en 2,0 s
--   survivor_family_catalog(null, null)         clé anon                 -> timeout
--
-- L'agrégat dépasse donc le budget de TOUS les rôles : anon 3 s, authenticated 8 s, et
-- service_role 8 s. Conséquence côté produit, et c'est la pire forme qu'un paywall puisse
-- prendre : /cockpit/survivants/tous n'appelait cette fonction que sur la branche ABONNÉE,
-- si bien qu'un membre connecté voyait l'écran d'échec pendant qu'un visiteur anonyme voyait
-- la page. Mesuré le 21/09 : la page anonyme rend 200 en 1,8 s et 484 Ko.
--
-- ---------------------------------------------------------------------------
-- POURQUOI CETTE LIGNE, ET PAS UNE RÉÉCRITURE
--
-- La 049 a corrigé le catalogue en le passant en plpgsql ET en épinglant :
--
--     alter function public.survivor_family_catalog(text, text)
--       set plan_cache_mode = force_custom_plan;
--     alter function public.survivor_family_all(text, text)
--       set plan_cache_mode = force_custom_plan;
--
-- La 047 n'a jamais reçu l'équivalent. Des trois fonctions, celle qui meurt est exactement
-- celle qui n'a pas la ceinture.
--
-- LE MÉCANISME. PostgREST appelle par instruction préparée. Au-delà de la 5e exécution,
-- PostgreSQL a le droit de figer un plan GÉNÉRIQUE, planifié sans connaître les valeurs. Le
-- prédicat de génération de la 047 s'écrit :
--
--     m.dataset_version = coalesce(p_dataset, g.dataset_version)
--
-- Avec un littéral `null`, le planificateur replie ce coalesce en `g.dataset_version` : une
-- vraie condition de jointure, estimable, indexable. Avec un paramètre inconnu, il garde une
-- expression opaque qu'il ne sait ni estimer ni indexer, et retombe sur un balayage complet.
--
-- CE QUE ÇA RÉCONCILIE, et c'est ce qui rend l'hypothèse crédible plutôt que jolie : la 047
-- a mesuré 0,9 s le 18/09 DANS L'ÉDITEUR SQL (littéraux, donc plan custom), et la même
-- fonction meurt en REST (paramètres, donc plan générique). Le 19/09 la page servait encore
-- 588 Ko sans message d'échec : le plan générique n'était pas encore installé sur les
-- connexions du pool. Deux mesures contradictoires, une seule explication.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS. Elle ne change aucune ligne de logique, aucune
-- signature, aucun droit, et ne touche ni le corps de la fonction ni une seule ligne de
-- données. Elle ne baisse pas non plus la PENTE : l'agrégat lit toujours le corpus entier,
-- qui est passé de 42 522 survivants le 25/08 à 214 543 le 21/09. Elle achète du temps pour
-- faire la 054 correctement, elle ne la remplace pas.
--
-- RETOUR ARRIÈRE, complet et immédiat :
--     alter function public.survivor_strategy_summary(text) reset plan_cache_mode;
--
-- ---------------------------------------------------------------------------
-- COMMENT VÉRIFIER QUE ÇA A MARCHÉ, ET SUR LE BON CHEMIN
--
-- Pas dans l'éditeur SQL : il appelle avec des littéraux, donc il rendait DÉJÀ 0,9 s avant
-- cette migration. Un vert obtenu là ne prouverait rien. Le contrôle se fait par le chemin
-- qui a produit le rouge — l'appel REST, six fois de suite pour dépasser le seuil du plan
-- générique :
--
--     for i in 1 2 3 4 5 6; do \
--       curl -s -o /dev/null -w "%{http_code} %{time_total}\n" \
--         -X POST "$SUPABASE_URL/rest/v1/rpc/survivor_strategy_summary" \
--         -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--         -H "Content-Type: application/json" -d '{"p_dataset":null}'; \
--     done
--
-- Attendu : six fois 200. Avant la migration, c'était six fois 500 (mesuré : 5 tirs / 5).

alter function public.survivor_strategy_summary(text)
  set plan_cache_mode = force_custom_plan;

comment on function public.survivor_strategy_summary(text) is
  'Noms de strategies et compteurs de survivants pour la vue exhaustive, groupes par '
  '(strategy, exit_keys) pour que l appelant applique le masque trailing sans dupliquer la '
  'regle. Epinglee en force_custom_plan par la 053 : en plan generique, le coalesce du '
  'predicat de generation n est plus repliable et la fonction depassait le budget de TOUS '
  'les roles (mesure 2026-09-21 : 5 tirs / 5 en 57014 sur la cle anon, 3 / 3 en service). '
  'Attention : aucune surface ne l appelle depuis le 2026-09-21 -- /cockpit/survivants/tous '
  'tire desormais sa liste de strategies de engine_verdicts. La rebrancher sans remesurer '
  'ramenerait la panne.';
