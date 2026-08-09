-- Migration 026: engine_units_public — the operational-metadata-free projection
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
-- ─────────────────────────────────────────────────────────────────────────────
-- §13.8 of the drilldown spec dismisses this table in one line: "engine_units is
-- open to anon but carries no secret: identity, status, attempt counter. Nothing
-- to do." That was checked on 2026-08-08 rather than believed, in the same pass
-- that disproved two other "nothing to do" claims. It is *nearly* right — and the
-- part it misses is small but real:
--
--   GET /rest/v1/engine_units?select=quarantine_reason&quarantine_reason=not.is.null
--   -> 4 rows: "No module named 'psutil'", "persistent oom", "persistent oom",
--      "max attempts"
--
-- That is internal failure text, published to the publishable key. It is NOT the
-- paid product: no path, no host, no identifier, no configuration. It leaks only
-- that the engine runs Python and that some units die on OOM. Severity: low. It is
-- fixed here because the fix is cheap, not because it was urgent — and because
-- `quarantine_reason`, `attempts` and `max_workers` are already on the forbidden
-- list of BOTH client-payload leak guards, which means the project already decided
-- these are not for publication and only the database had not been told.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY A VIEW AND NOT A COLUMN-LEVEL REVOKE
-- ─────────────────────────────────────────────────────────────────────────────
-- Postgres can revoke SELECT on a single column, and that would have been a
-- one-liner with no deploy:
--
--   revoke select (quarantine_reason, attempts, max_workers) on engine_units ...
--
-- Rejected, for the reason the whole 2026-08-08 chantier exists. A column-level
-- revoke is fail-OPEN: the next column added to engine_units is readable by anon
-- the moment it is created, silently. That is exactly how `top_finalists` and
-- `selection_control` came to publish the paid product through a view built to
-- protect it — nobody added them on purpose, they were simply never excluded.
-- An explicit view is fail-CLOSED: a new column does not appear until someone
-- adds it here by hand. The cost is one line in a select list; the benefit is that
-- the failure mode which has now bitten three times stops being possible.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE COLUMN SET
-- ─────────────────────────────────────────────────────────────────────────────
-- The sole reader of this table in either repo is
-- algolab web/lib/engine-units.ts::getEngineUnits, which selects exactly:
--   base, tf, dataset_version, kmax, status, updated_at
-- The view carries those six and nothing else. Dropped: quarantine_reason,
-- attempts, max_workers.
--
-- `status` is kept because the reader needs it, and it stays raw here on purpose:
-- lib/engine-vocab.ts collapses pending/probing/stage2/finalizing into "en cours"
-- SERVER-SIDE before anything reaches a component, so the fine-grained phase name
-- classified in §8.2 never crosses to the client. That coarsening cannot move into
-- SQL without duplicating the vocabulary in two places, which is how the two sides
-- would eventually disagree. Noted rather than hidden: the raw phase name IS
-- readable by anon through this view, as it was through the table. It reveals the
-- engine's pipeline stage names — no configuration, no metric, no threshold.

begin;

create or replace view public.engine_units_public as
select
  u.base,
  u.tf,
  u.dataset_version,
  u.kmax,
  u.status,
  u.updated_at
  -- u.quarantine_reason, u.attempts, u.max_workers are DELIBERATELY ABSENT:
  -- internal operational metadata, already forbidden from the client payload by
  -- app/(cockpit)/__tests__/cockpit-public-leak.test.tsx and its dossier twin.
from public.engine_units u;

comment on view public.engine_units_public is
  'engine_units minus quarantine_reason / attempts / max_workers — internal
   operational metadata that was reaching the publishable key (four rows carried
   raw failure text such as "persistent oom" on 2026-08-08). Explicit column list
   so a future column fails CLOSED. Sole reader: algolab
   web/lib/engine-units.ts::getEngineUnits.';

-- Not security_invoker: the view runs with its owner's rights, which is what lets
-- migration 027 revoke SELECT on the base table without breaking it. Same reason
-- as 023 and 024 — and the reason those two survived the 025 revoke untouched.
grant select on public.engine_units_public to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.engine_units_public
  from anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────
-- 1) The three columns are gone from the view. Expect exactly three rows:
--    attempts, max_workers, quarantine_reason.
--
--      select c.column_name
--        from information_schema.columns c
--       where c.table_schema = 'public' and c.table_name = 'engine_units'
--         and c.column_name not in (
--           select v.column_name from information_schema.columns v
--            where v.table_schema = 'public'
--              and v.table_name = 'engine_units_public')
--       order by 1;
--
-- 2) From outside, with the publishable key — the view answers, the columns do not:
--
--      curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--        "$URL/rest/v1/engine_units_public?select=base,tf,status&limit=1"       # 200
--      curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--        "$URL/rest/v1/engine_units_public?select=quarantine_reason&limit=1"    # 400
--
-- ⚠️ The base table is STILL anon-readable after this file. Migration 027 closes
-- it, and must not run before the algolab deploy that repoints getEngineUnits at
-- this view — otherwise the whole cockpit renders "donnée indisponible".
