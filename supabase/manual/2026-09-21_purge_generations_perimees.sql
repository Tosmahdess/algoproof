-- 2026-09-21_purge_generations_perimees.sql
--
-- ⚠️ NOT A MIGRATION, ET PAS UN SCRIPT À LANCER D'UN BLOC. Il contient des `VACUUM`, que
-- PostgreSQL refuse dans une chaîne multi-instructions ("cannot be executed from a function
-- or multi-command string") : `run_migration.mjs` comme l'éditeur SQL passent tout le fichier
-- d'un coup et échoueraient à la première. UNE INSTRUCTION À LA FOIS, en sélectionnant son
-- texte avant de lancer. Même convention que
-- supabase/manual/2026-09-18_survivor_family_member_aggregate_index.sql.
--
-- ===========================================================================
-- CE QU'IL FAUT COMPRENDRE AVANT DE TOUCHER QUOI QUE CE SOIT
--
-- 1. UN `DELETE` NE REND PAS UN OCTET AU DISQUE. Il marque les lignes mortes. L'espace
--    devient RÉUTILISABLE par la table après un `VACUUM` ordinaire, mais le fichier ne
--    rétrécit pas. Pour que le disque baisse vraiment il faut réécrire la table
--    (`VACUUM FULL` ou `pg_repack`), et `VACUUM FULL` réclame AUTANT DE PLACE LIBRE que la
--    table pèse, plus un verrou exclusif pendant toute la réécriture.
--
--    Sur cette base — ~2 Go de disque, DiskFull déjà survenu le 2026-09-19 sur une
--    reconstruction SQL, et `survivor_family_member` mesurée à 182 Mo le 18/09 — un
--    `VACUUM FULL` est précisément le geste qui peut refaire saturer le disque, et il
--    emporterait algoproof.fr en même temps que le lab. NE PAS COMMENCER PAR LÀ.
--
-- 2. DONC L'OBJECTIF RÉALISTE N'EST PAS « faire baisser le disque », C'EST « arrêter de le
--    faire monter ». Un `DELETE` suivi d'un `VACUUM` ordinaire rend les pages réutilisables :
--    les publications suivantes écrivent DANS ces pages au lieu d'étendre le fichier. La
--    courbe s'aplatit sans qu'un seul octet soit rendu à l'OS, et sans verrou exclusif.
--    C'est ce que fait l'étape 3. L'étape 5 (réécriture) n'existe que si tu as besoin de
--    rendre l'espace, et elle a ses propres conditions.
--
-- 3. RIEN N'EST IRRÉVERSIBLE DANS CE FICHIER SAUF L'ÉTAPE 3. Un `DELETE` de lignes publiées
--    ne se rejoue pas : le moteur ne republie pas une génération périmée. Si une ligne
--    supprimée est encore référencée quelque part, elle est perdue. D'où l'étape 2.
--
-- ===========================================================================
-- CE QUE JE SAIS DÉJÀ, ET CE QUE JE NE SAIS PAS
--
-- MESURÉ le 2026-09-21 par REST sur engine_verdicts_public : 351 unités publiées, 51 bases,
-- 214 543 survivants au total, répartis sur QUATRE générations —
--
--   data_20260710 :  30 unités      data_20260802 : 136 unités
--   data_20260729 :  48 unités      data_20260831 : 137 unités
--
-- 245 unités sur 351 sont postérieures à la coupure du 2026-08-12. Les 106 autres ne sont
-- lues par AUCUNE surface : tous les lecteurs de familles filtrent
-- `published_at >= '2026-08-12T19:38:00Z'`.
--
-- PAS MESURÉ, et c'est exactement ce que l'étape 1 va chercher : ce que ces générations
-- PÈSENT dans `survivor_family_member`. Le nombre d'unités ne dit rien du nombre de lignes
-- ni des octets — une unité de juillet peut porter 2 survivants ou 4 000, et l'essentiel du
-- poids est dans les colonnes jsonb `recipe` et `signature` (1,33 Ko/ligne au 18/09).
-- Lancer une purge sur un ratio d'unités serait compter un alphabet et conclure sur un autre.


-- ===========================================================================
-- ÉTAPE 1 — MESURER. Lecture seule. C'est elle qui dit si ça vaut la peine.
-- ===========================================================================
-- 1a. Le poids réel, table par table. Si survivor_family_member ne domine pas, la purge
--     ci-dessous ne réglera rien et il faut chercher ailleurs (blobs, logs, WAL).
select c.relname                                             as objet,
       pg_size_pretty(pg_total_relation_size(c.oid))         as total,
       pg_size_pretty(pg_relation_size(c.oid))               as tas,
       pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as index_et_toast,
       c.reltuples::bigint                                   as lignes_estimees
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind in ('r', 'm')
 order by pg_total_relation_size(c.oid) desc
 limit 15;

-- 1b. Ce que pèse CHAQUE génération dans le corpus, et combien est déjà mort.
--     `survivor_family_member` est une VUE depuis la 052 : on interroge la table réelle.
select dataset_version,
       count(*)                                              as lignes,
       pg_size_pretty(sum(pg_column_size(recipe)
                        + pg_column_size(signature))::bigint) as poids_jsonb,
       min(published_at)                                     as premiere_publication,
       max(published_at)                                     as derniere_publication,
       bool_or(published_at >= '2026-08-12T19:38:00Z'::timestamptz) as au_moins_une_apres_coupure
  from public.survivor_family_member_jsonb
 group by dataset_version
 order by dataset_version;

-- 1c. Lignes mortes déjà présentes : si n_dead_tup est élevé, un simple VACUUM rend déjà de
--     la place réutilisable AVANT toute suppression.
select relname,
       n_live_tup,
       n_dead_tup,
       last_vacuum,
       last_autovacuum
  from pg_stat_user_tables
 where relname in ('survivor_family_member_jsonb', 'engine_verdict_survivor',
                   'engine_verdicts', 'survivor_id_legacy_map')
 order by n_dead_tup desc;


-- ===========================================================================
-- ÉTAPE 2 — LA SÉCURITÉ RÉFÉRENTIELLE. Lecture seule, et elle a un droit de veto.
--
-- Les lecteurs de familles ignorent les générations d'avant la coupure. Mais « aucune page
-- ne les lit » n'est PAS « rien ne les référence ». Un run sauvegardé peut pointer sur un
-- survivant de juillet via `config->meta->>survivorId`, et « Recréer dans le Labo » le
-- résoudrait dans le vide. Chaque ligne rendue ici est une raison de NE PAS supprimer la
-- génération concernée.
-- ===========================================================================
-- 2a. Les runs sauvegardés qui pointent sur un survivant, et la génération de ce survivant.
select r.id                        as run_id,
       r.created_at,
       r.config -> 'meta' ->> 'survivorId' as survivor_id,
       m.dataset_version,
       m.published_at
  from public.backtest_runs r
  left join public.survivor_family_member m
    on m.survivor_id = r.config -> 'meta' ->> 'survivorId'
 where r.config -> 'meta' ->> 'survivorId' is not null
 order by r.created_at desc;

-- 2b. La table de correspondance des ids hérités (051) : si elle mappe des survivants des
--     générations visées, `survivor_lab_preset` casse pour ces ids.
select m.dataset_version, count(*) as ids_mappes
  from public.survivor_id_legacy_map l
  join public.survivor_family_member_jsonb m on m.survivor_id = l.survivor_id
 group by m.dataset_version
 order by m.dataset_version;

-- 2c. LE GARDE-FOU QUI COMPTE : aucune paire (base, tf) ne doit perdre sa génération
--     COURANTE. Cette requête liste les paires dont la génération courante est ELLE-MÊME
--     d'avant la coupure : pour celles-là, supprimer « les vieilles générations » revient à
--     supprimer tout ce qu'on sait de la paire. Attendu : zéro ligne. Si ce n'est pas zéro,
--     la purge de l'étape 3 doit les exclure nommément.
with courante as (
  select base, tf, max(dataset_version) as dataset_version
    from public.survivor_family_member_jsonb
   group by base, tf
)
select c.base, c.tf, c.dataset_version, max(m.published_at) as publiee_le
  from courante c
  join public.survivor_family_member_jsonb m
    on m.base = c.base and m.tf = c.tf and m.dataset_version = c.dataset_version
 group by c.base, c.tf, c.dataset_version
having max(m.published_at) < '2026-08-12T19:38:00Z'::timestamptz
 order by c.base, c.tf;


-- ===========================================================================
-- ÉTAPE 3 — SUPPRIMER. ⚠️ IRRÉVERSIBLE. À ne lancer que si l'étape 1 montre que ça pèse et
-- que l'étape 2 ne rend RIEN.
--
-- PAR LOTS, et c'est la leçon du 19/09 : une seule instruction sur tout le corpus a rempli
-- le disque (le WAL de la transaction occupe de la place, et une grosse transaction garde
-- tout jusqu'au commit). 5 000 lignes par lot, commit entre chaque, VACUUM à la fin.
--
-- Le prédicat ne dit PAS « les vieux datasets » : il dit « les lignes qu'aucun lecteur ne
-- peut atteindre », ce qui est la même chose mais vérifiable. Deux conditions cumulées :
-- publiée avant la coupure, ET pas la génération courante de sa paire.
-- ===========================================================================
-- 3a. D'ABORD le compte, à blanc. C'est ce nombre qu'on s'attend à voir disparaître.
with courante as (
  select base, tf, max(dataset_version) as dataset_version
    from public.survivor_family_member_jsonb
   group by base, tf
)
select count(*) as lignes_a_supprimer,
       pg_size_pretty(sum(pg_column_size(m.recipe) + pg_column_size(m.signature))::bigint) as poids
  from public.survivor_family_member_jsonb m
  join courante c on c.base = m.base and c.tf = m.tf
 where m.published_at < '2026-08-12T19:38:00Z'::timestamptz
   and m.dataset_version <> c.dataset_version;

-- 3b. Le lot. À RELANCER tant qu'il rend 5000 ; s'arrêter quand il rend moins.
--     (Relancer l'instruction telle quelle, elle est idempotente par construction.)
with courante as (
  select base, tf, max(dataset_version) as dataset_version
    from public.survivor_family_member_jsonb
   group by base, tf
), lot as (
  select m.ctid
    from public.survivor_family_member_jsonb m
    join courante c on c.base = m.base and c.tf = m.tf
   where m.published_at < '2026-08-12T19:38:00Z'::timestamptz
     and m.dataset_version <> c.dataset_version
   limit 5000
)
delete from public.survivor_family_member_jsonb t
 using lot
 where t.ctid = lot.ctid;

-- 3c. Contrôle : le compte de 3a doit maintenant rendre 0.


-- ===========================================================================
-- ÉTAPE 4 — RENDRE LES PAGES RÉUTILISABLES. C'est ici que la courbe s'aplatit.
-- Pas de verrou exclusif, pas de besoin d'espace libre. Instruction seule.
-- ===========================================================================
vacuum (analyze, verbose) public.survivor_family_member_jsonb;

-- Refaire 1a et 1c après : le total ne baissera PAS (c'est normal, voir l'en-tête), mais
-- n_dead_tup doit retomber et l'espace est désormais réutilisé par les publications
-- suivantes au lieu d'étendre le fichier. Si c'est le seul objectif — et dans 9 cas sur 10
-- ça l'est — LE TRAVAIL EST FINI ICI.


-- ===========================================================================
-- ÉTAPE 5 — RENDRE L'ESPACE À L'OS. ⚠️ SEULEMENT SI C'EST VRAIMENT NÉCESSAIRE.
--
-- CONDITIONS, toutes les trois, sans exception :
--   * l'étape 1a a montré `pg_relation_size` >> volume réel des lignes vivantes ;
--   * l'espace LIBRE du disque est SUPÉRIEUR à la taille de la table (VACUUM FULL écrit une
--     copie complète avant de basculer) — le vérifier dans le dashboard Supabase, pas ici ;
--   * personne ne publie pendant l'opération : le verrou est EXCLUSIF, le site lit en erreur
--     pendant toute la réécriture, et ça vaut pour algoproof.fr ET pour le lab.
--
-- Si la deuxième condition n'est pas tenue — et sur ~2 Go avec une table à 182 Mo elle peut
-- très bien ne pas l'être — NE PAS lancer VACUUM FULL. Alternatives, dans l'ordre :
--   a. augmenter le disque Supabase d'un cran le temps de l'opération, puis redescendre ;
--   b. `pg_repack` (réécrit sans verrou exclusif long, mais demande la même place libre) ;
--   c. ne rien faire : l'étape 4 suffit à arrêter la croissance, ce qui est le vrai besoin.
-- ===========================================================================
-- vacuum full public.survivor_family_member_jsonb;   -- décommenter en connaissance de cause


-- ===========================================================================
-- CE QUE CETTE PURGE NE RÈGLE PAS
--
-- Elle retire l'historique mort UNE FOIS. Elle ne change pas le fait que le corpus grossit —
-- 42 522 survivants le 25/08, 214 543 le 21/09 — et que rien n'efface automatiquement une
-- génération quand la suivante la remplace. Tant que la purge n'est pas une ÉTAPE DU
-- PUBLISHER (supprimer la génération n-2 de la paire au moment où on publie la n), il
-- faudra la relancer à la main, et le disque remontera entre deux passages.
-- C'est la même classe de défaut que D-ALG-SURV-2 : on baisse la constante, pas la pente.
