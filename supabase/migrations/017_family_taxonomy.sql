-- Migration 017: canonical family taxonomy shared by algoproof.fr and lab.algoproof.fr
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- Context: algoproof knew trend/breakout/mean-reversion/carry/market-neutral,
-- algolab knew trend/mean-reversion/market-neutral/carry/stat-arb/event.
-- The union below is the single source of truth for both sites. Adding a family
-- is deliberately a migration: a free-form slug would become a free-form string
-- again within a month.

create table if not exists public.families (
  slug        text primary key,
  label_fr    text not null,
  sort_order  integer not null,
  definition  text
);

insert into public.families (slug, label_fr, sort_order, definition) values
  ('trend',          'Suivi de tendance',     1, 'Entre dans le sens du mouvement et suit tant qu''il dure.'),
  ('momentum',       'Momentum',              2, 'Mesure la vitesse du mouvement plutôt que sa direction.'),
  ('breakout',       'Cassure',               3, 'Entre quand le prix franchit un niveau ou une amplitude.'),
  ('mean-reversion', 'Retour à la moyenne',   4, 'Parie sur le retour du prix vers sa valeur récente.'),
  ('price-action',   'Zones et price action', 5, 'Lit la structure laissée par le prix, sans indicateur.'),
  ('carry',          'Portage',               6, 'Encaisse un flux (funding, spread) plutôt qu''un mouvement.'),
  ('market-neutral', 'Neutre au marché',      7, 'Expositions long et short compensées, sens du marché neutralisé.'),
  ('stat-arb',       'Arbitrage statistique', 8, 'Exploite un écart mesuré entre deux actifs liés.'),
  ('event',          'Événementiel',          9, 'Se déclenche sur un événement daté, pas sur un état de marché.')
on conflict (slug) do update
  set label_fr = excluded.label_fr,
      sort_order = excluded.sort_order,
      definition = excluded.definition;

-- The verifier and the filter UI both assume a deterministic order. Assumed is
-- not enforced: without this, a later insert can duplicate a rank and the family
-- list silently reorders between renders.
alter table public.families
  add constraint families_sort_order_unique unique (sort_order);

alter table public.families enable row level security;

drop policy if exists families_select_public on public.families;
create policy families_select_public
  on public.families for select
  to anon, authenticated
  using (true);

alter table public.bots
  drop constraint if exists bots_family_check;

alter table public.bots
  add constraint bots_family_check
  check (family is null or family in (
    'trend', 'momentum', 'breakout', 'mean-reversion', 'price-action',
    'carry', 'market-neutral', 'stat-arb', 'event'
  ));
