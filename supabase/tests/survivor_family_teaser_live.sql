-- survivor_family_teaser_live.sql
--
-- Le protocole de la 048, en trois temps. Les blocs 1 et 3 sont a lancer AUTOUR de la
-- migration ; le bloc 4 est la porte qui decide si on garde.
--
-- Pourquoi un avant/apres alors que le generateur garantit deja que le bloc paye est
-- identique octet pour octet : parce qu'un garde qui vit dans le script de generation ne
-- dit rien de ce que la base execute reellement. Le seul enonce qui vaille est « l'abonne
-- recoit les memes octets qu'avant », et il se mesure.

-- ---------------------------------------------------------------------------
-- BLOC 1 -- AVANT la migration. Photographie ce qu'un abonne recoit aujourd'hui.
-- Remplacer <UID> par un user_id rendu par la requete 3c du protocole precedent, ou
-- laisser la selection automatique ci-dessous.
begin;
set local statement_timeout = '600s';

select set_config(
         'request.jwt.claims',
         json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
         false) as claims_poses
from public.subscriptions
where status in ('active', 'trialing', 'past_due')
  and (current_period_end is null or current_period_end > now())
limit 1;

drop table if exists public._teaser_check_avant;
create table public._teaser_check_avant as
select s.base,
       public.survivor_family_all(null, s.base) as payload
  from (select distinct base
          from public.survivor_family_member
         where published_at is not null
           and published_at >= '2026-08-12T19:38:00Z'::timestamptz) s;

select count(*) as strategies_photographiees,
       sum(pg_catalog.length(payload::text)) as octets_total,
       count(*) filter (where payload ->> 'access' = 'full') as en_branche_payante
  from public._teaser_check_avant;
commit;

-- ⚠️ `en_branche_payante` DOIT egaler `strategies_photographiees`. Si ce n'est pas le cas,
-- l'identite d'abonne n'a pas pris, la photo est celle de la branche teaser, et la
-- comparaison du bloc 3 ne prouverait rien. Arreter la.

-- ---------------------------------------------------------------------------
-- BLOC 2 -- appliquer supabase/migrations/048_survivor_family_catalog_scoped.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- BLOC 3 -- APRES la migration. L'abonne recoit-il exactement les memes octets ?
begin;
set local statement_timeout = '600s';

select set_config(
         'request.jwt.claims',
         json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
         false) as claims_poses
from public.subscriptions
where status in ('active', 'trialing', 'past_due')
  and (current_period_end is null or current_period_end > now())
limit 1;

select a.base,
       pg_catalog.length(a.payload::text) as octets_avant,
       pg_catalog.length(public.survivor_family_all(null, a.base)::text) as octets_apres
  from public._teaser_check_avant a
 where a.payload::text is distinct from public.survivor_family_all(null, a.base)::text
 order by 1;
commit;

-- ⚠️ ZERO LIGNE attendu. Une seule ligne veut dire qu'un abonne ne recoit plus la meme
-- chose : revenir en arriere en rejouant les corps de la 043 (survivor_family_catalog en
-- signature a un argument, puis survivor_family_all), et ne pas chercher a corriger en
-- avant.
--
-- Une fois le bloc 3 vert : drop table public._teaser_check_avant;

-- ---------------------------------------------------------------------------
-- BLOC 4 -- LA PORTE. Ce que recoit un visiteur sans compte, sous SON budget.
--
-- Sur les trois plus grosses strategies, pas sur EMAcross : le 1,49 s de la branche
-- payante a ete mesure sur EMAcross (2 299 survivants), et HMAcross en porte 18 723.
-- Une mesure prise sur la strategie commode mesure la commodite.
--
-- Attendu par strategie : une ligne, familles_avec_variants = 0, contrat_exact = true,
-- et surtout PAS 57014.
begin;
set local statement_timeout = '3s';
set local role anon;   -- auth.uid() nul -> branche teaser, et le budget de 3 s

select count(*) filter (where f ? 'variants')                       as familles_avec_variants,
       count(*)                                                     as familles,
       bool_and(
         (select pg_catalog.array_agg(k order by k)
            from pg_catalog.jsonb_object_keys(f) k)
         = array['exit_keys','filter_keys','id','isolated','name','representative',
                 'robustness','strategy','survivor_count','timeframes']
       )                                                            as contrat_exact,
       pg_catalog.length(p.payload::text)                           as octets,
       clock_timestamp() - statement_timestamp()                    as duree
  from (select public.survivor_family_all(null, 'HMAcross') as payload) p,
       pg_catalog.jsonb_array_elements(p.payload -> 'families') f
 group by p.payload;
rollback;

-- Repeter le bloc 4 en remplacant 'HMAcross' par 'KeltnerBreak', 'TEMAcross' puis
-- 'EMAcross'. Aujourd'hui, avant la 048, les quatre rendent 57014 : c'est la raison pour
-- laquelle la page affiche « Je n'ai pas reussi a lire cette liste ».
--
-- `contrat_exact` verifie les DIX cles, ni plus ni moins. parseFamily (algolab
-- web/lib/survivor-family-access.ts) refuse une cle manquante mais TOLERE une cle en trop ;
-- seul `variants` est explicitement rejete. La frontiere payante ne tient donc, cote TS,
-- qu'a ce mot-la -- raison pour laquelle on la verifie ici sur la liste fermee.

-- ---------------------------------------------------------------------------
-- BLOC 5 -- le cache de schema de PostgREST, sans quoi l'API repond encore sur l'ancienne
-- signature et le correctif reste invisible depuis le site. Deja dans la migration ;
-- a rejouer si l'API rend 300 ou 404 sur survivor_family_catalog.
notify pgrst, 'reload schema';
