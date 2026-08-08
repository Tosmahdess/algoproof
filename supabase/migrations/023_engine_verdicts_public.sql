-- Migration 023: engine_verdicts_public — the survivor-free projection
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- ⚠️ SUPERSEDED IN PART BY MIGRATION 024 — READ THIS FIRST.
-- This file is kept verbatim because it is what was actually applied to
-- production (on 2026-08-08, not on 2026-08-02 as commit 59682dd claimed). Only
-- this banner was added; no statement below was altered. One of its claims is
-- WRONG and was refuted by measurement on 2026-08-08:
--
--   the comment above `v.top_finalists` states that the column carries
--   "NOT params/filters/exit — the recipe lives only in `survivors`".
--
-- It does carry them. 599 of the 622 finalists in this view held params AND
-- filters AND exit — the complete recipe — readable with the publishable key.
-- Migration 024 rebuilds the view with top_finalists redacted in SQL, drops three
-- more unread columns, and closes engine_verdict_history, which §13.8 of the
-- drilldown spec assumed was never granted to anon and which in fact was.
-- Do not reason about the current shape of this view from this file. Read 024.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS CLOSES, AND WHAT IT DOES NOT
-- ─────────────────────────────────────────────────────────────────────────────
-- public.engine_verdicts is anon-readable (SELECT granted, RLS off — migration
-- 017 turned RLS off deliberately, on the assumption the table would never face
-- the anon key; it now does). Its `survivors` jsonb carries the COMPLETE
-- configuration of every survivor:
--
--   {"pf":1.6899, "dd":19.78, "n_trades":279, "verdict":"MARGINAL",
--    "params":{"ema_fast":…, "ema_slow":…},
--    "exit":{"rr":…, "atr_mult":…},
--    "filters":{"ma_stack":{"stack":"20-50"}, …},
--    "reasons":["wf_oos 0.77<1.15"]}
--
-- `params` + `exit` + the VALUES inside `filters` are the paid product, in clear,
-- queryable by anyone holding the publishable key that ships in every page bundle.
--
-- This migration does NOT revoke SELECT on engine_verdicts, and cannot today:
-- the lab's paid dossier route (web/lib/engine-survivors.ts) legitimately needs
-- `survivors`, and NEITHER site holds a service-role key — supabaseServer in
-- algoproof and createSupabaseServer in algolab both use the anon key. Anything
-- the site can read, anon can read. A server-side redaction is therefore not a
-- substitute for a database one: the redaction runs AFTER the row has already
-- crossed a boundary anon could have crossed itself.
--
-- What this migration DOES buy:
--   - every reader that only needs counts stops touching the secret-bearing table,
--   - the consumer set of engine_verdicts drops to ONE identified call site,
--   - the day a server-only credential exists, the revoke is a one-liner
--     (spelled out at the bottom of this file) instead of an audit.
--
-- ⚠️ EVERY object created here is followed by an explicit REVOKE.
-- Supabase ships ALTER DEFAULT PRIVILEGES on schema public, so a newly created
-- object is granted INSERT/UPDATE/DELETE/TRUNCATE to anon automatically. The
-- 2026-08-02 audit found all 35 existing tables open that way. Same discipline as
-- migration 022.

-- ─────────────────────────────────────────────────────────────────────────────
-- The view
-- ─────────────────────────────────────────────────────────────────────────────
-- Columns are listed EXPLICITLY rather than `select *`, and that is a security
-- property, not a style choice: a view defined with `*` is expanded and frozen at
-- creation time anyway, but an explicit list makes the omission of `survivors`
-- auditable in one glance and makes any FUTURE column fail CLOSED — a new
-- secret-bearing column added to engine_verdicts does not silently appear here.
-- The cost is that a genuinely public new column must be added to this list by
-- hand; that is the correct trade for this table.
--
-- Column list derived from the committed DDL chain in the vault
-- (projects/apex-trading/operating/migrations/): 017 created the table, 018 added
-- `survivors`, 019 `selection_control`, 020 `kmax`, 021 the judge-v2 block. It is
-- exhaustive with respect to source control. See the verification query at the
-- bottom: if production carries a column added out-of-band, it is ABSENT from this
-- view (fail-closed) and the owner should decide whether it belongs.

create or replace view public.engine_verdicts_public as
select
  -- identity
  v.base,
  v.tf,
  v.dataset_version,
  v.kmax,
  -- counts: the corpus and its verdict split
  v.n_behaviors,
  v.n_go,
  v.n_marginal,
  v.n_no_go,
  -- the graveyard's pedagogy. top_finalists carries per-finalist pf/dd/n_trades
  -- and `reasons`, but NOT params/filters/exit — the recipe lives only in
  -- `survivors`. web/lib/engine-reasons.ts reads this column on the server and
  -- returns counters only. See the RESIDUAL note at the bottom of this file.
  v.top_finalists,
  -- provenance of the published artefact
  v.report_checksum,
  v.report_path,
  v.published_at,
  -- multiple-testing honesty block (019)
  v.selection_control,
  -- judge v2: per-asset ventilation, drawdown/TUW, cost model (021)
  v.per_asset,
  v.dd_cluster_pct,
  v.tuw_max_days,
  v.tuw_censored,
  v.judge_version,
  v.taker_fee,
  v.slippage
  -- v.survivors is DELIBERATELY ABSENT. Do not add it. If a page needs it, it
  -- needs an entitlement check, not this view.
from public.engine_verdicts v;

comment on view public.engine_verdicts_public is
  'engine_verdicts minus the survivors column. survivors carries each survivor''s
   full configuration (params, exit, filter settings) — the paid product — and must
   never be reachable with the publishable key. Every reader that needs only counts
   or identity reads THIS view. The single reader that needs survivors is
   web/lib/engine-survivors.ts in algolab, gated to the dossier route.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Rights
-- ─────────────────────────────────────────────────────────────────────────────
-- NOT security_invoker. The view runs with its OWNER's rights, exactly like the
-- two views in migration 022. That is deliberate and load-bearing: it is what lets
-- a future migration revoke SELECT on public.engine_verdicts from anon WITHOUT
-- breaking this view. Adding `with (security_invoker = true)` would make the view
-- resolve engine_verdicts as the CALLING role, so the eventual revoke would break
-- every counter on both sites — the opposite of the intent.

grant select on public.engine_verdicts_public to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.engine_verdicts_public
  from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION — run these after applying, and report the output
-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Confirm the view's column list matches production's table, minus survivors.
--    Any row returned by this query is a column that EXISTS on engine_verdicts but
--    is missing from the view — i.e. added out-of-band, never in source control.
--    Expected output: exactly one row, `survivors`.
--
--      select c.column_name, c.data_type
--        from information_schema.columns c
--       where c.table_schema = 'public' and c.table_name = 'engine_verdicts'
--         and c.column_name not in (
--           select v.column_name from information_schema.columns v
--            where v.table_schema = 'public' and v.table_name = 'engine_verdicts_public')
--       order by c.ordinal_position;
--
-- 2) Confirm the view is readable by anon and the row counts agree:
--
--      select count(*) from public.engine_verdicts_public;   -- expect 21 today
--
-- 3) Confirm no write grant leaked in:
--
--      select grantee, privilege_type from information_schema.role_table_grants
--       where table_schema = 'public' and table_name = 'engine_verdicts_public'
--       order by grantee, privilege_type;
--      -- expect SELECT only, for anon and authenticated.

-- ─────────────────────────────────────────────────────────────────────────────
-- THE REMAINING STEP — do NOT run this yet
-- ─────────────────────────────────────────────────────────────────────────────
-- Once the Next app holds a server-only credential (service-role key in a
-- non-NEXT_PUBLIC env var, or an entitlement-checking RPC that returns survivors
-- only to a paying caller), and web/lib/engine-survivors.ts uses it, this closes
-- the exposure completely:
--
--   revoke select on public.engine_verdicts from anon, authenticated;
--
-- Nothing else needs to change: the views in 022
-- (filter_survivor_presence, survivor_counts), the funnel view in 020, and
-- engine_verdicts_public here all run with owner rights and keep working.
-- Until that credential exists, running the revoke above breaks the paid dossier
-- page. See the spec section appended to
-- docs/superpowers/specs/2026-08-02-filter-coverage-drilldown-design.md.

-- ─────────────────────────────────────────────────────────────────────────────
-- RESIDUAL, for the owner to rule on (deliberately NOT decided here)
-- ─────────────────────────────────────────────────────────────────────────────
-- This view mirrors every column except survivors, as scoped. Three of them are
-- worth a second look, because every current reader already avoids them by hand:
--   - top_finalists  — per-finalist pf/dd/n_trades/reasons. No params/filters/exit,
--                      so not the recipe, but still per-configuration metrics.
--                      REQUIRED by engine-reasons.ts::getCauseCounts, which
--                      aggregates it server-side and returns counters only.
--   - report_path    — internal artefact path on the compute box.
--   - report_checksum
-- If the owner wants these out, drop them from the select list above and the only
-- code change needed is in engine-reasons.ts (which would then need its own
-- owner-rights aggregate view, e.g. a `engine_cause_counts` view, rather than
-- reading top_finalists directly).
