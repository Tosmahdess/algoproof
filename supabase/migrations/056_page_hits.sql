-- 056_page_hits.sql
-- Project: avdegocswrhzdnvsyiui (shared by algoproof.fr and lab.algoproof.fr).
-- Apply in the Supabase SQL editor.
--
-- Lot 8 of the design audit (2026-09-25; C4 of the 17/09 arbitration): a
-- first-party page counter. Vercel Web Analytics was never enabled on either
-- Vercel project (Hobby plan, no custom events), so nothing measured which page
-- sends a visitor to the lab. One row per page view, written by ONE path on
-- each site: POST /api/hit with the service key. No IP, no user agent.
--
-- NO policy, on purpose: neither anon nor authenticated can select or insert a
-- row. The two views read as their caller (security_invoker), so they inherit
-- the same closure; read them from the SQL editor or with the service key.

create table if not exists public.page_hits (
  id             bigint generated always as identity primary key,
  site           text        not null check (site in ('algoproof', 'lab')),
  path           text        not null check (length(path) <= 200),
  ref            text        check (ref is null or length(ref) <= 64),
  referrer_host  text        check (referrer_host is null or length(referrer_host) <= 120),
  hit_at         timestamptz not null default now()
);

create index if not exists page_hits_site_path_hit_at on public.page_hits (site, path, hit_at desc);
create index if not exists page_hits_ref_hit_at on public.page_hits (ref, hit_at desc) where ref is not null;

alter table public.page_hits enable row level security;
revoke all on public.page_hits from anon, authenticated;

-- Views per page and per day (Paris day), and the lab's landings by the page
-- of algoproof that sent them: the « tableau de vues par page » of the lot.
create or replace view public.page_views_daily
with (security_invoker = true) as
  select site,
         path,
         (hit_at at time zone 'Europe/Paris')::date as day,
         count(*)                                    as hits,
         count(*) filter (where ref is not null)     as hits_with_ref
  from public.page_hits
  group by 1, 2, 3;

create or replace view public.lab_landings_by_ref
with (security_invoker = true) as
  select ref,
         (hit_at at time zone 'Europe/Paris')::date as day,
         count(*)                                    as hits
  from public.page_hits
  where site = 'lab' and ref is not null
  group by 1, 2;

revoke all on public.page_views_daily, public.lab_landings_by_ref from anon, authenticated;

-- Rollback:
-- drop view if exists public.lab_landings_by_ref;
-- drop view if exists public.page_views_daily;
-- drop table if exists public.page_hits;
