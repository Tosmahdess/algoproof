-- 055_bot_recipes.sql
-- Project: avdegocswrhzdnvsyiui (the one prod project; auth, subscriptions and content live together).
-- Apply in the Supabase SQL editor.
--
-- The exact recipe of each published wave bot (cohort go_head, 75 on 2026-09-24):
-- signal parameters, filters, exit, assets, engine generation. It is what the
-- labo membership sells, and the fiches that show it are static and served from
-- a PUBLIC repository, so the recipe can live neither in the repo nor in the page.
--
-- Read by ONE path: src/app/api/bot/[slug]/recipe/route.ts, with the service key,
-- and only after getEntitlement() has answered 'paid'. Written by ONE path: the VPS
-- publisher (algoproof_sync.py, armada_recipe_rows), with the service key.
--
-- NO read policy, on purpose: neither anon nor authenticated can select a row,
-- whatever the query. Same pattern as 045_investir_recits.

create table if not exists public.bot_recipes (
  slug        text primary key,
  recipe      jsonb not null,
  source_sha  text not null,
  updated_at  timestamptz not null default now()
);

alter table public.bot_recipes enable row level security;

revoke all on public.bot_recipes from anon, authenticated;

comment on table public.bot_recipes is
  'Exact recipe per published wave bot. Service role only (no policy): served to paying '
  'members by /api/bot/[slug]/recipe after the entitlement check. Written by algoproof_sync.py.';

-- Verification, to run after applying (each must hold):
--   select relrowsecurity from pg_class where relname = 'bot_recipes';          -- true
--   set role anon;          select count(*) from public.bot_recipes;              -- permission denied
--   reset role; set role authenticated; select count(*) from public.bot_recipes;  -- permission denied
--   reset role;
