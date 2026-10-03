-- 064_bot_stats.sql
-- Project: avdegocswrhzdnvsyiui (the content project).
--
-- Lot 1b (D094): what a LIST shows for a bot, computed once per publisher pass instead
-- of on every render. The lists (/, /overview, the concept pages) used to load every
-- trade and every daily point of every public bot to show five figures.
--
-- Written by ONE path: POST /api/internal/bot-stats (the site itself, with the service
-- key), called by the VPS right after the hourly publisher. The figures are computed by
-- the site's TS formula (src/lib/bot-summary.ts over fleetSimulationView), never in
-- Python or SQL: a second implementation would drift from the fiches (D073, D094).
-- Read by ONE path: getListBots() in src/lib/queries.ts, embedded under `bots`.
--
-- A row is served only when its formula_rev equals the site's FORMULA_REV; otherwise the
-- list recomputes the bot live and logs it. An OLD row is still served (and logged): a
-- dead job must not bring back the slow path it replaced.
--
-- Readable by anon, like perf_daily and trades, which hold the same figures in full: the
-- summary exposes nothing those tables do not. Writable by the service role only.
--
-- Size: ~1.5-3 KB per row (summary jsonb), ~0.6 MB at 240 bots, ~3 MB at 1 000.

create table if not exists public.bot_stats (
  bot_id          uuid primary key references public.bots(id) on delete cascade,
  formula_rev     integer not null,
  computed_at     timestamptz not null default now(),
  -- the UTC day the simulation was extended to (its flat tail and the ledger window)
  computed_for    date not null,
  -- bots.last_sync_at as read when computing: monitoring only (the publisher stamps it
  -- BEFORE it replaces trades and perf_daily, so it cannot order anything)
  source_sync_at  timestamptz,
  -- where the figures come from; 'ledger' = a segment exists but disagrees with the ledger
  sim_state       text not null check (sim_state in ('simulation', 'ledger', 'no_segment')),
  -- recipe_sha:source_sha of the segment the figures were computed from, null without one
  segment_sha     text,
  start_capital   double precision not null,
  total_trades    integer not null,
  summary         jsonb not null
);

alter table public.bot_stats enable row level security;

revoke all on public.bot_stats from anon, authenticated, public;
grant select on public.bot_stats to anon, authenticated;
grant all on public.bot_stats to service_role;

drop policy if exists bot_stats_public_read on public.bot_stats;
create policy bot_stats_public_read on public.bot_stats for select to anon, authenticated using (true);

comment on table public.bot_stats is
  'List summary per public bot (lot 1b, D094): computed by the site (/api/internal/bot-stats) '
  'after each publisher pass with the TS formula of the fiches; served only at the site''s formula_rev.';

-- Verification, to run after applying (each must hold), on a NON-EMPTY table so that an
-- empty answer cannot pass for a denied one:
--   select relrowsecurity from pg_class where relname = 'bot_stats';                 -- true
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'bot_stats' and grantee in ('anon', 'authenticated');        -- SELECT only
--   select policyname, cmd, roles from pg_policies where tablename = 'bot_stats';      -- one SELECT policy
--   then, from outside: GET /rest/v1/bot_stats?select=bot_id&limit=1 with the anon key -> 1 row,
--   and POST/PATCH/DELETE with the anon key -> 401/403.
