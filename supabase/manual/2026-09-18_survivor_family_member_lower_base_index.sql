-- 2026-09-18_survivor_family_member_lower_base_index.sql
--
-- ⚠️ PAS UNE MIGRATION, et volontairement hors de supabase/migrations/ : `run_migration.mjs`
-- envoie le fichier entier à `client.query()` en une chaîne multi-commandes, où
-- CREATE INDEX CONCURRENTLY est refusé. À lancer une instruction à la fois, via psql sur la
-- connexion directe (session mode, port 5432 -- pas le pooler 6543).
--
-- ⚠️ CET EN-TETE A ETE CORRIGE LE 19/09 : SA JUSTIFICATION D'ORIGINE ETAIT FAUSSE.
--
-- Il affirmait un « plancher de traversee de 2,29 s » mesure sur un count(*) a dataset
-- constant, et en deduisait une decomposition « 2,3 s + 0,3 s + regroupement ≈ 2,8 s ».
-- Cette requete-la n'etait pas un balayage : elle etait servie par l'index
-- (dataset_version, published_at) de la 037. Le plancher n'a jamais ete mesure, et le
-- raisonnement qui a conduit a poser cet index reposait dessus.
--
-- CE QUI EST VRAI, MESURE LE 19/09 : la lenteur venait de l'enveloppe de la fonction, pas
-- d'un index manquant. `survivor_family_catalog` etait en `language sql`, donc planifiee
-- parametres inconnus, donc son predicat de strategie n'etait pas indexable et chaque appel
-- balayait les 200 Mo. Le meme corps en plpgsql : 17,25 s -> 0,12 s. C'est la 049.
--
-- CET INDEX RESTE UTILE, ET LA MESURE LE MONTRE : une fois le parametre connu, le plan
-- emprunte `Index Cond: (lower(base) = 'orderblock')` et le sous-plan correle n'est meme pas
-- execute -- 2,4 ms sur un temoin vide. Sans lui, le plan sur mesure n'aurait rien a lire :
-- la cle primaire porte `base` brut, pas `lower(base)`. Il sert aussi la branche payante,
-- qui filtre exactement le meme predicat. 1,2 Mo, garde.
--
-- Mais il est ARRIVE POUR LA MAUVAISE RAISON, et ca se dit : il a ete pose sur une
-- hypothese fausse, il se trouve qu'il etait bon. Laisser croire l'inverse ferait de cet
-- en-tete un raisonnement a imiter.
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
