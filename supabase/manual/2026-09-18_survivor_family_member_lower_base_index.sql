-- 2026-09-18_survivor_family_member_lower_base_index.sql
--
-- ⚠️ PAS UNE MIGRATION, et volontairement hors de supabase/migrations/ : `run_migration.mjs`
-- envoie le fichier entier à `client.query()` en une chaîne multi-commandes, où
-- CREATE INDEX CONCURRENTLY est refusé. À lancer une instruction à la fois, via psql sur la
-- connexion directe (session mode, port 5432 -- pas le pooler 6543).
--
-- POURQUOI, ET POURQUOI SEULEMENT SI LA MESURE LE DEMANDE.
--
-- La 048 fait descendre `lower(m.base) = lower(p_strategy)` dans le corpus du catalogue, ce
-- qui rend la branche teaser scopée au lieu de construire 4 Mo avant de filtrer. Mais scoper
-- une requête ne la rend pas rapide si rien ne sert le prédicat : mesuré le 18/09, une
-- traversée de cette table coûte **2,29 s** quel que soit le filtre, parce que les trois
-- index de la 037 mènent sur `dataset_version` -- colonne de tête inutilisable ici, la
-- résolution de génération étant un sous-plan corrélé -- et que l'index couvrant du même
-- jour mène sur `base` brut, pas sur `lower(base)`.
--
-- Décomposition attendue pour HMAcross (18 723 survivants, la plus grosse) : 2,3 s de
-- traversée + ~0,3 s de sous-plan corrélé + le regroupement. Soit environ 2,8 s contre un
-- budget de 3 s. **La 048 seule fait donc passer la branche teaser de « morte » à « à la
-- limite »**, et sur un compute occupé par le drain de publication elle rendra 57014 par
-- intermittence -- c'est-à-dire que la page dira « Je n'ai pas réussi à lire cette liste »
-- une fois sur trois au lieu de toujours. Une amélioration réelle, et pas une réparation.
--
-- Cet index est la colonne que le prédicat de la 048 **et** celui de la branche payante
-- filtrent tous les deux. Il les sert donc ensemble, sans réécrire une ligne de SQL et sans
-- introduire une seconde implémentation de la résolution de génération -- ce que ferait la
-- forme jointe de la 047 si on la reprenait ici, et c'est précisément ce que la 048 refuse.
--
-- QUAND LE POSER : si le bloc 4 de supabase/tests/survivor_family_teaser_live.sql rend 57014
-- ou dépasse ~2,5 s. Pas avant : un index qu'aucune mesure ne réclame est une écriture de
-- plus à chaque publication, sur une table qu'un trigger réécrit unité par unité.
--
-- COMMENT SAVOIR QU'IL SERT : le plan doit montrer un `Bitmap Index Scan` sur cet index, et
-- non un `Seq Scan` avec `Filter: (lower(base) = …)`. Une durée qui baisse n'est pas une
-- preuve : elle mesure aussi l'état du cache.

-- Instruction 1. L'index d'expression. CONCURRENTLY pour que le trigger de publication
-- continue d'écrire pendant la construction ; compter des secondes de travail, mais une
-- attente non bornée s'il existe une transaction ouverte plus ancienne.
-- Surveiller depuis un autre onglet :
--   select phase, lockers_total, lockers_done from pg_stat_progress_create_index;
create index concurrently if not exists survivor_family_member_lower_base_idx
  on public.survivor_family_member (pg_catalog.lower(base));

-- Instruction 2. Une construction CONCURRENTLY interrompue laisse un index INVALIDE, qui
-- coûte une écriture à chaque publication et ne sert aucune lecture -- et `if not exists`
-- le verrait comme existant et ne ferait rien, en silence, à chaque nouvelle tentative.
-- Si `indisvalid` est faux : drop index concurrently public.survivor_family_member_lower_base_idx;
-- puis rejouer l'instruction 1.
select indexrelid::regclass as index_name,
       indisvalid,
       pg_size_pretty(pg_relation_size(indexrelid)) as taille
  from pg_index
 where indrelid = 'public.survivor_family_member'::regclass
 order by 1;

-- Instruction 3. Le contrôle qui décide s'il a gagné sa place. On cherche le nœud, pas le
-- chronomètre.
explain (analyze, buffers)
select count(*)
  from public.survivor_family_member m
 where m.published_at is not null
   and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
   and pg_catalog.lower(m.base) = pg_catalog.lower('HMAcross');

comment on index public.survivor_family_member_lower_base_idx is
  'Sert le prédicat de stratégie partagé par la branche teaser (via survivor_family_catalog '
  'depuis la 048) et par la branche payante de survivor_family_all. Sans lui, les deux '
  'traversent les 182 Mo de la table pour une seule stratégie.';
