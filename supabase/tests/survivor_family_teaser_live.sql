-- survivor_family_teaser_live.sql
--
-- Le protocole de la 048. Lire les avertissements avant de coller quoi que ce soit.
--
-- ⚠️ 1. LA MIGRATION SE JOUE EN UN SEUL RUN. Elle supprime survivor_family_catalog(text)
--       puis crée (text, text) ; entre les deux, la version 043 de survivor_family_all
--       appelle une signature disparue et rend 42883 sur la branche teaser. Envoyée en une
--       seule chaîne, c'est une transaction implicite et la fenêtre n'existe pas. Collée
--       bloc par bloc, elle existe.
--
-- ⚠️ 2. CE PROTOCOLE ÉCRIT DANS UN SCHÉMA NON EXPOSÉ, ET CE N'EST PAS UNE PRÉCAUTION
--       DÉCORATIVE. Une première version créait sa table de contrôle dans `public`. Supabase
--       y pose des privilèges par défaut qui accordent la lecture à `anon`, et la migration
--       fait `notify pgrst, 'reload schema'` : PostgREST aurait servi sur l'API une table
--       contenant les variantes payantes complètes des 38 stratégies, pendant tout le temps
--       de la vérification. Ouvrir la frontière payante pour vérifier qu'on ne l'a pas
--       déplacée aurait été le comble. D'où le schéma dédié, révoqué, et supprimé à la fin.

-- ---------------------------------------------------------------------------
-- BLOC 0 -- lire le budget réel du rôle, au lieu de le citer de mémoire.
-- Le « 3 s pour anon, 8 s pour authenticated » vient d'un commentaire de la 037.
select rolname, rolconfig
  from pg_roles
 where rolname in ('anon', 'authenticated');

-- ---------------------------------------------------------------------------
-- BLOC 1 -- AVANT la migration. Deux photographies, dans un schéma fermé.
begin;
set local statement_timeout = '900s';

create schema if not exists verif_048;
revoke all on schema verif_048 from public, anon, authenticated;

-- 1a. Ce qu'un VISITEUR reçoit aujourd'hui, en un seul appel de 18 s plutôt que 38.
--     C'est la seule chose que la 048 réécrit, donc la seule qui doit être comparée
--     en contenu -- et c'est ce qu'une première version de ce fichier ne comparait pas.
drop table if exists verif_048.catalogue_avant;
create table verif_048.catalogue_avant as
select public.survivor_family_catalog(null) as payload;
revoke all on table verif_048.catalogue_avant from public, anon, authenticated;

-- 1b. Ce qu'un ABONNÉ reçoit aujourd'hui. `true` = local à la transaction : une identité
--     d'abonné qui survivrait au commit ferait mesurer la branche PAYANTE au bloc 4.
select set_config(
         'request.jwt.claims',
         json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
         true) as claims_poses
from public.subscriptions
where status in ('active', 'trialing', 'past_due')
  and (current_period_end is null or current_period_end > now())
limit 1;

drop table if exists verif_048.paye_avant;
create table verif_048.paye_avant as
select s.base, public.survivor_family_all(null, s.base) as payload
  from (select distinct base
          from public.survivor_family_member
         where published_at is not null
           and published_at >= '2026-08-12T19:38:00Z'::timestamptz) s;
revoke all on table verif_048.paye_avant from public, anon, authenticated;

-- 1c. L'état du corpus À CET INSTANT. Le drain de publication tourne : une publication
--     entre le bloc 1 et le bloc 3 ferait diverger une stratégie, et on annulerait une
--     migration saine pour une régression qui n'en est pas une.
drop table if exists verif_048.corpus_avant;
create table verif_048.corpus_avant as
select count(*) as lignes, max(published_at) as derniere_publication
  from public.survivor_family_member
 where published_at is not null
   and published_at >= '2026-08-12T19:38:00Z'::timestamptz;
revoke all on table verif_048.corpus_avant from public, anon, authenticated;

select (select count(*) from verif_048.paye_avant) as strategies,
       (select count(*) from verif_048.paye_avant where payload ->> 'access' = 'full') as en_branche_payante,
       (select lignes from verif_048.corpus_avant) as lignes_corpus;
commit;

-- ⚠️ `en_branche_payante` DOIT égaler `strategies`. Sinon l'identité d'abonné n'a pas pris,
--    la photo est celle du teaser, et le bloc 3 ne prouverait rien.

-- ---------------------------------------------------------------------------
-- BLOC 2 -- appliquer supabase/migrations/048_survivor_family_catalog_scoped.sql,
--           EN UN SEUL RUN (voir avertissement 1).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- BLOC 3 -- APRÈS. Trois questions, dans cet ordre.
begin;
set local statement_timeout = '900s';

-- 3a. Le corpus a-t-il bougé ? Si oui, une divergence en 3b/3c ne prouve rien.
select c.lignes as lignes_avant,
       (select count(*) from public.survivor_family_member
         where published_at is not null
           and published_at >= '2026-08-12T19:38:00Z'::timestamptz) as lignes_maintenant,
       c.derniere_publication as publication_avant,
       (select max(published_at) from public.survivor_family_member) as publication_maintenant
  from verif_048.corpus_avant c;

-- 3b. LE VISITEUR reçoit-il les mêmes familles, dans le même ordre ? C'est la seule
--     chose que la 048 réécrit. Comparaison de tableaux jsonb : l'ordre compte.
--     ZÉRO LIGNE attendu.
select s.base,
       pg_catalog.jsonb_array_length(attendu) as familles_avant,
       pg_catalog.jsonb_array_length(public.survivor_family_catalog(null, s.base) -> 'families') as familles_apres
  from (
    select f ->> 'strategy' as base,
           pg_catalog.jsonb_agg(f) as attendu
      from verif_048.catalogue_avant a,
           pg_catalog.jsonb_array_elements(a.payload -> 'families') f
     group by 1
  ) s
 where s.attendu is distinct from (public.survivor_family_catalog(null, s.base) -> 'families')
 order by 1;

-- 3c. L'ABONNÉ reçoit-il exactement les mêmes octets ? ZÉRO LIGNE attendu.
select set_config(
         'request.jwt.claims',
         json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
         true) as claims_poses
from public.subscriptions
where status in ('active', 'trialing', 'past_due')
  and (current_period_end is null or current_period_end > now())
limit 1;

select a.base,
       pg_catalog.length(a.payload::text) as octets_avant,
       pg_catalog.length(public.survivor_family_all(null, a.base)::text) as octets_apres
  from verif_048.paye_avant a
 where a.payload::text is distinct from public.survivor_family_all(null, a.base)::text
 order by 1;
commit;

-- ⚠️ SI 3b OU 3c REND UNE LIGNE et que 3a montre un corpus inchangé, revenir en arrière.
--    LE RETOUR ARRIÈRE COMMENCE PAR SUPPRIMER LA NOUVELLE SIGNATURE, sans quoi il laisse
--    deux candidates et l'appel à un argument du corps 043 lève « function is not unique » :
--        drop function public.survivor_family_catalog(text, text);
--    puis rejouer les corps de la 043 (catalogue à un argument, puis survivor_family_all),
--    puis revoke/grant, puis notify pgrst, 'reload schema'.

-- ---------------------------------------------------------------------------
-- BLOC 4 -- LA PORTE. Ce que reçoit un visiteur sans compte, sous SON budget.
--
-- Sur la plus grosse stratégie, pas sur EMAcross : le 1,49 s de la branche payante a été
-- mesuré sur EMAcross (2 299 survivants) et HMAcross en porte 18 723. Une mesure prise sur
-- la stratégie commode mesure la commodité.
begin;
-- Vider l'identité AVANT tout : en session psql, les claims du bloc 3 survivraient et
-- `set local role anon` ne les efface pas -- on mesurerait la branche payante en croyant
-- mesurer le visiteur.
select set_config('request.jwt.claims', '', true);
set local statement_timeout = '3s';
set local role anon;

select (select count(*) from pg_catalog.jsonb_array_elements(p.payload -> 'families') f
         where f ? 'variants')                                       as familles_avec_variants,
       pg_catalog.jsonb_array_length(p.payload -> 'families')         as familles,
       p.payload ->> 'access'                                         as acces,
       (select bool_and(
                 (select pg_catalog.array_agg(k order by k)
                    from pg_catalog.jsonb_object_keys(f) k)
                 = array['exit_keys','filter_keys','id','isolated','name','representative',
                         'robustness','strategy','survivor_count','timeframes'])
          from pg_catalog.jsonb_array_elements(p.payload -> 'families') f) as contrat_exact,
       pg_catalog.length(p.payload::text)                             as octets,
       clock_timestamp() - statement_timestamp()                      as duree
  from (select public.survivor_family_all(null, 'HMAcross') as payload) p;
rollback;

-- Répéter en remplaçant 'HMAcross' par 'KeltnerBreak', 'TEMAcross', puis 'EMAcross'.
-- Attendu : `acces` = teaser, `familles_avec_variants` = 0, `contrat_exact` = true, et pas
-- de 57014. Aujourd'hui, avant la 048, les quatre rendent 57014.
--
-- ⚠️ LA MARGE EST ÉTROITE ET C'EST SU D'AVANCE. Le plancher mesuré d'une traversée de la
--    table est de 2,29 s, et aucun index ne sert `lower(base)` seul aujourd'hui. Si le
--    bloc 4 rend 57014 ou dépasse ~2,5 s, appliquer
--    supabase/manual/2026-09-18_survivor_family_member_lower_base_index.sql AVANT de
--    conclure quoi que ce soit : c'est la colonne que le prédicat de la 048 ET celui de la
--    branche payante filtrent, donc l'index sert les deux sans réécrire une ligne de SQL.
--
-- `contrat_exact` vérifie les DIX clés, ni plus ni moins -- plus strict que le
-- consommateur : parseFamily (algolab web/lib/survivor-family-access.ts) refuse une clé
-- manquante mais TOLÈRE une clé en trop ; seul `variants` est explicitement rejeté. La
-- frontière payante ne tient donc, côté TypeScript, qu'à ce mot-là.

-- ---------------------------------------------------------------------------
-- BLOC 5 -- le ménage, et la vérification qui ne se fait pas en SQL.
drop schema if exists verif_048 cascade;

-- Le `notify` de la migration peut partir sur une connexion que PostgREST n'écoute pas
-- (pooler transactionnel sur 6543). La seule preuve que l'API voit la nouvelle signature
-- est un appel HTTP anonyme :
--   curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/survivor_family_all" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     -H "Content-Type: application/json" -d '{"p_dataset":null,"p_strategy":"HMAcross"}'
-- Une réponse 300 « could not choose the best candidate » veut dire que l'ancienne
-- signature survit quelque part ; 404 que le cache n'a pas été rechargé.
