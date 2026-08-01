-- Migration 019: provenance and lifecycle on bots
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- Every bot gets a public page as soon as it is deployed (spec A, D4). What
-- differs between an engine-born bot and a hand-deployed one is the provenance
-- line, not the right to a page. These columns carry that line.

alter table public.bots
  add column if not exists origin          text,
  add column if not exists found_at        timestamptz,
  add column if not exists validated_at    timestamptz,
  add column if not exists paper_since     timestamptz,
  add column if not exists live_since      timestamptz,
  add column if not exists frozen_at       timestamptz,
  add column if not exists archived_at     timestamptz,
  add column if not exists engine_unit_key text,
  add column if not exists rejudge_status  text;

-- Converge explicitly instead of relying on ADD COLUMN's defaults.
-- `add column if not exists ... not null default X` is a no-op on a column that
-- already exists from a partial earlier application: it does not add the
-- default, does not backfill the nulls, and does not set NOT NULL. The CHECKs
-- below would then pass anyway, because a CHECK accepts NULL under SQL
-- three-valued logic. This project has already shipped a half-applied migration
-- (018, April) that stayed invisible for weeks, so converge by hand:
alter table public.bots alter column origin         set default 'manual';
alter table public.bots alter column rejudge_status set default 'not_needed';

update public.bots set origin         = 'manual'     where origin is null;
update public.bots set rejudge_status = 'not_needed' where rejudge_status is null;

alter table public.bots alter column origin         set not null;
alter table public.bots alter column rejudge_status set not null;

alter table public.bots drop constraint if exists bots_origin_check;
alter table public.bots
  add constraint bots_origin_check check (origin in ('engine', 'manual'));

alter table public.bots drop constraint if exists bots_rejudge_status_check;
alter table public.bots
  add constraint bots_rejudge_status_check
  check (rejudge_status in ('not_needed', 'queued', 'done'));

-- Backfill: everything that exists today predates the config-search engine.
update public.bots
   set origin = 'manual',
       rejudge_status = 'queued'
 where origin = 'manual' and rejudge_status = 'not_needed';

-- live_since for the two real-money bots, from bot-expectations.ts.
update public.bots set live_since = timestamptz '2026-05-08 00:00:00+00'
 where slug = 'v1-spot' and live_since is null;
update public.bots set live_since = timestamptz '2026-04-26 00:00:00+00'
 where slug = 'orb-bf25' and live_since is null;

-- paper_since from the first trade on record, where we have one.
update public.bots b
   set paper_since = t.first_trade
  from (
    select bot_id, min(opened_at) as first_trade
      from public.trades
     group by bot_id
  ) t
 where t.bot_id = b.id and b.paper_since is null;

-- Integrity rules from spec A §5.3. Deferred to the end so the backfills above
-- are not blocked by a constraint they are in the middle of satisfying.
alter table public.bots drop constraint if exists bots_engine_provenance_check;
alter table public.bots
  add constraint bots_engine_provenance_check
  check (
    origin <> 'engine'
    or (found_at is not null and engine_unit_key is not null)
  );

-- Deliberately does NOT require rejudge_status <> 'not_needed'. The column
-- defaults to 'not_needed', so folding it into this constraint would reject
-- every future INSERT that does not set it explicitly — including every bot the
-- VPS sync creates. Being queued for re-judgement is a backfill fact about the
-- bots that predate the engine, not an invariant of hand-deployed bots.
alter table public.bots drop constraint if exists bots_manual_provenance_check;
alter table public.bots
  add constraint bots_manual_provenance_check
  check (origin <> 'manual' or found_at is null);

alter table public.bots drop constraint if exists bots_live_since_check;
alter table public.bots
  add constraint bots_live_since_check
  check (status <> 'live' or live_since is not null);

create index if not exists bots_origin_idx on public.bots (origin);
create index if not exists bots_engine_unit_key_idx on public.bots (engine_unit_key);
