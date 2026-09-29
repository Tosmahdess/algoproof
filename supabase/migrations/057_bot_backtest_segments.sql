-- 057_bot_backtest_segments.sql
-- Project: avdegocswrhzdnvsyiui (SUPABASE_URL: the content project, read by supabasePrivileged()).
--
-- The backtest segment of each published wave bot (D072): the curve from 1 January to
-- the freeze of the recipe's dataset, the engine replay up to the paper handover, and
-- their trades. The bot page draws it before the paper ledger.
--
-- Written by ONE path: the VPS publisher (algoproof_sync.py, sync_backtest_segments), one
-- row per upsert, only when payload.meta.recipe_sha equals the bot's bot_recipes hash.
-- Read by ONE path: src/lib/backtest-segment-data.ts, server side, with the service key.
--
-- NO read policy, on purpose (same pattern as 055_bot_recipes): the site repository is
-- public and the page ships ONE bot's curve; a table readable by anon would hand out the
-- backtest trades of every bot in one request.
--
-- Size: ~11-18 KB per row, ~1.1 MB for the 75 wave-1 bots (measured 2026-09-29).

create table if not exists public.bot_backtest_segments (
  slug                text primary key,
  payload             jsonb not null,
  recipe_sha          text not null,
  source_sha          text not null,
  updated_at          timestamptz not null default now()
);

alter table public.bot_backtest_segments enable row level security;

revoke all on public.bot_backtest_segments from anon, authenticated, public;
grant all on public.bot_backtest_segments to service_role;

comment on table public.bot_backtest_segments is
  'Backtest segment per published wave bot (D072). Service role only (no policy): read '
  'server side by the bot page, written by algoproof_sync.py when the recipe hash matches.';

-- Verification, to run after applying (each must hold), on a NON-EMPTY table so a denied
-- read cannot pass for an empty one:
--   select relrowsecurity from pg_class where relname = 'bot_backtest_segments';   -- true
--   select count(*) from public.bot_backtest_segments;                             -- > 0 (as owner)
--   set role anon;          select count(*) from public.bot_backtest_segments;    -- permission denied
--   reset role; set role authenticated; select count(*) from public.bot_backtest_segments; -- permission denied
--   reset role;
