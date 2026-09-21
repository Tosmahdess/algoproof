-- 054_generation_from_verdicts.sql
--
-- LE CORRECTIF DE PENTE. Il retire de survivor_strategy_summary la passe qui recalcule, à
-- chaque requête, un fait décidé à la publication.
--
-- UNE SEULE FONCTION, ET C'EST DÉLIBÉRÉ. survivor_family_catalog porte exactement le même
-- prédicat corrélé et gagnerait la même chose — mais elle RÉPOND aujourd'hui (2,0 s pour
-- EMAcross, 3,6 s pour ChandelierExit, mesuré le 21/09), elle sert les deux branches de la
-- page, et elle a déjà sa ceinture `force_custom_plan` depuis la 049. Changer la fonction
-- qui marche en même temps que celle qui est morte, c'est se priver du moyen de savoir
-- laquelle des deux modifications a produit l'effet observé. Le catalogue passera dans sa
-- propre migration, avec le BLOC 5 du banc comme oracle — il est écrit pour ça.
--
-- ⚠️ NE PAS APPLIQUER TANT QUE LES DEUX CONDITIONS SUIVANTES NE SONT PAS RÉUNIES :
--   1. supabase/tests/2026-09-21_banc_generation_courante.sql, BLOC 3 -> `formes_identiques`
--      doit valoir TRUE. Il compare la sortie entière des deux formes, ligne par ligne.
--      Si c'est FALSE, le BLOC 3 bis nomme les paires (base, tf) qui divergent : les lire
--      AVANT de toucher quoi que ce soit.
--   2. BLOC 5 -> égalité du catalogue, stratégie par stratégie, sur les 38 stratégies.
--
-- Si le BLOC 0 a prouvé l'hypothèse du plan générique, la 053 suffit à rouvrir la page et
-- CETTE migration devient un travail de fond, à faire posément. Elle ne devient urgente que
-- si le banc montre que le coût est le TRAVAIL.
--
-- ---------------------------------------------------------------------------
-- CE QUE ÇA CHANGE, ET POURQUOI C'EST LA SEULE CHOSE QUI CHANGE LA PENTE
--
-- « La génération courante de cette paire » est un fait de PUBLICATION. Il est écrit une
-- fois par unité dans engine_verdicts — 351 lignes le 2026-09-21 — et les deux fonctions le
-- recalculent en regroupant les 136 661 lignes du corpus, à chaque lecture. La 047 avait
-- déjà mesuré ce que coûte cette résolution sous sa forme corrélée : Seq Scan + SubPlan à
-- 136 661 boucles, 569 984 blocs touchés, environ 4,5 Go de trafic mémoire pour renvoyer un
-- entier.
--
-- C'est la QUATRIÈME fois que le même symptôme revient : 5,93 s en août (037), 18,30 s le
-- 18/09 (047), plus de 8 s aujourd'hui. Trois fois la CONSTANTE a baissé — scoping, plpgsql,
-- plan custom — et trois fois la PENTE est restée : le coût suit la taille totale d'un
-- corpus append-only qui ne purge jamais ses générations mortes. 42 522 survivants le 25/08,
-- 214 543 le 21/09 (mesure REST sur engine_verdicts_public : 351 unités, 51 bases).
--
-- ---------------------------------------------------------------------------
-- LA SÉMANTIQUE NE BOUGE PAS D'UN POUCE
--
-- La règle reste celle de la 043 : une paire cède à SA PROPRE génération plus récente et à
-- rien d'autre — une paire qui n'a pas été recalculée continue de montrer ce qu'on sait
-- d'elle. Seule la SOURCE de ce maximum change : engine_verdicts au lieu du corpus.
--
-- ÉGALITÉ DÉJÀ MESURÉE HORS SQL, le 21/09, en REST : la règle « génération courante par
-- (base, tf), après la coupure » appliquée aux 351 lignes d'engine_verdicts_public reproduit
-- EXACTEMENT le compte de survivants du catalogue, sur six stratégies —
-- EMAcross 5398/5398, ATRChannel 5985/5985, Ichimoku 14870/14870,
-- ChandelierExit 15880/15880, HMAcross 20772/20772, ROC 5761/5761, écart 0 partout.
-- C'est une égalité sur des TOTAUX, calculée depuis le côté moteur : elle rend la migration
-- plausible, elle ne la prouve pas. Les blocs 3 et 5 du banc sont la preuve.
--
-- ⚠️ LE RISQUE, NOMMÉ : la jointure est INNER. Une paire (base, tf) présente dans le corpus
-- mais absente d'engine_verdicts après la coupure verrait ses lignes DISPARAÎTRE, là où la
-- forme actuelle les gardait — elle dérivait la génération du corpus lui-même, donc elle
-- était auto-cohérente par construction. C'est précisément ce que le BLOC 3 détecte et ce
-- que le BLOC 3 bis nomme. Aucune autre différence n'est possible : le reste du texte SQL
-- est copié mot pour mot.
--
-- RETOUR ARRIÈRE : réappliquer la 047 (pour le résumé) et la 049 (pour le catalogue), qui
-- sont des create-or-replace complets. Aucune donnée n'est touchée par ce fichier.

-- ---------------------------------------------------------------------------
-- 1. Le résumé par stratégie (corps de la 047, générations résolues depuis les verdicts)
-- ---------------------------------------------------------------------------
create or replace function public.survivor_strategy_summary(
  p_dataset text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $PL$
begin
  return (
  with current_generation as (
    -- LA SEULE LIGNE QUI CHANGE PAR RAPPORT À LA 047 : la source du maximum. 351 lignes au
    -- lieu de 136 661, et le corpus n'est plus lu qu'une fois au lieu de deux.
    select v.base,
           v.tf,
           pg_catalog.max(v.dataset_version) as dataset_version
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
       and m.dataset_version = coalesce(p_dataset, g.dataset_version)
  ), families as (
    -- Identique à la 047 : le cast en jsonb n'est pas cosmétique. `["atr_mult","rr"]` et
    -- `[ "atr_mult", "rr" ]` sont deux TEXTES et une seule valeur jsonb ; grouper sur le
    -- texte scinderait une forme de sortie en deux lignes d'agrégat, que le masque de
    -- l'appelant jugerait deux fois.
    select family_id,
           pg_catalog.min(base) as strategy,
           pg_catalog.min(exit_keys_txt)::jsonb as exit_keys,
           pg_catalog.count(*)::integer as survivor_count
      from corpus
     group by family_id
  )
  select pg_catalog.jsonb_build_object(
    'strategies', coalesce(
      (
        select pg_catalog.jsonb_agg(
                 pg_catalog.jsonb_build_object(
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
                   pg_catalog.count(*)::integer as family_count,
                   pg_catalog.sum(survivor_count)::integer as survivor_count
              from families
             group by strategy, exit_keys
          ) rows_by_exit_shape
      ),
      '[]'::jsonb
    )
  )
  );
end
$PL$;

-- La ceinture de la 049, que la 047 n'avait jamais reçue. Conservée même si la 053 l'a déjà
-- posée : `set` est idempotent, et laisser cette ligne ici évite qu'un retour arrière sur la
-- 053 la retire sans qu'on s'en aperçoive.
alter function public.survivor_strategy_summary(text)
  set plan_cache_mode = force_custom_plan;

revoke all on function public.survivor_strategy_summary(text) from public;
grant execute on function public.survivor_strategy_summary(text) to anon, authenticated;
