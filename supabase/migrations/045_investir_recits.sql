-- Le récit des fiches Investir : la partie que l'abonnement vend.
--
-- POURQUOI UNE TABLE ET PAS UN FICHIER. Les 1 407 fiches sont générées
-- statiquement depuis un JSON commité, et le dépôt du site est PUBLIC. Une
-- prose payante y serait lisible deux fois : dans le HTML servi à tous, et
-- dans le fichier sur GitHub. Il n'existe pas de demi-mesure — ce qui se vend
-- doit sortir du statique.
--
-- Ce qui reste gratuit ne bouge pas : l'index des 1 407, la note, les trois
-- séries, la santé, le bilan, la valorisation, le cours et « refais-le
-- toi-même ». La règle est la promesse du site, elle doit rester vérifiable
-- par n'importe qui, sans compte. Ce qui se vend est l'interprétation, la
-- seule chose qu'un lecteur ne peut pas refaire seul avec le rapport annuel.
--
-- L'ORDRE COMPTE, et migration 041 l'a appris à ses dépens : révoquer avant que
-- la clé de service existe côté Vercel viderait les fiches pour tout le monde.
-- Ici la table naît fermée, donc le risque est inverse et sans danger : tant
-- que la clé manque, personne ne lit — y compris les membres — et le log de
-- `supabasePrivileged` le dit.

create table if not exists public.investir_recits (
  cik        bigint primary key,
  slug       text not null,
  lecture    text,
  risques    text,
  maj        timestamptz not null default now()
);

create index if not exists investir_recits_slug_idx on public.investir_recits (slug);

alter table public.investir_recits enable row level security;

-- AUCUNE policy de lecture. Sans policy, RLS refuse tout : `anon` et
-- `authenticated` ne lisent rien, quelle que soit la requête. Seule la clé de
-- service, qui contourne RLS et ne quitte jamais le serveur, y accède — après
-- que `getEntitlement` a dit `paid`.
revoke all on public.investir_recits from anon, authenticated;
