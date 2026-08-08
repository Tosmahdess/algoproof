-- Migration 024: narrow engine_verdicts_public, and close engine_verdict_history
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS EXISTS: MIGRATION 023 SHIPPED WITH A FACTUALLY WRONG CLAIM
-- ─────────────────────────────────────────────────────────────────────────────
-- 023 says, in a comment above the column it kept:
--
--   "top_finalists carries per-finalist pf/dd/n_trades and `reasons`, but NOT
--    params/filters/exit — the recipe lives only in `survivors`."
--
-- Measured against production on 2026-08-08 with the anon key, before writing a
-- line of this file:
--
--   GET /rest/v1/engine_verdicts_public?select=top_finalists  ->  HTTP 200
--   117 rows, 622 finalists, of which 599 carry params AND filters AND exit.
--   Finalist keys: dd, exit, filters, n_trades, params, pf, reasons, verdict — and
--   on the older rows, `sid`.
--
-- That last one deserves naming. The `sid` is classified NEVER-PUBLISHED, and on
-- 2026-07-28 it was cut AT THE SOURCE: the publisher stopped emitting it, which is
-- what made "the sid is never published" true by construction rather than by the
-- discipline of a downstream template. That fix applied to `survivors`. Rows
-- written BEFORE it still carry a sid inside top_finalists, and this view has been
-- handing them to the publishable key ever since. Source-level fixes do not
-- retroact over stored jsonb.
--
-- A third thing leaves with the redaction: 810 of the reason strings carry their
-- THRESHOLD ("assets_go 0<5", "wf_oos 0.77<1.15"). Thresholds are classified too.
--
-- So the "survivor-free" view published 599 complete recipes — the same paid
-- product 023 was written to protect — to the publishable key that ships in every
-- page bundle. Revoking SELECT on the base table, as 023's closing note plans,
-- would have closed one surface while leaving this one open, and the revoke would
-- have been reported as "the leak is closed".
--
-- A second surface was found by the same pass. `engine_verdict_history`
-- (migration 018) mirrors engine_verdicts column for column, `survivors`
-- included. §13.8 of the drilldown spec records it as "never granted to anon — to
-- be verified in production rather than assumed". Verified: it IS granted.
--   GET /rest/v1/engine_verdict_history?select=survivors  ->  HTTP 200
--   60 rows, 347 survivors + 287 top_finalists cumulated.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS MIGRATION DOES
-- ─────────────────────────────────────────────────────────────────────────────
--  1. Rebuilds engine_verdicts_public with top_finalists REDACTED IN SQL to the
--     two fields its only consumer actually reads, and drops three columns no
--     caller reads at all.
--  2. Revokes anon/authenticated SELECT on engine_verdict_history.
--
-- It does NOT revoke SELECT on engine_verdicts. That is migration 025, and it
-- must not run until the lab's dossier route stops reading the base table with
-- the anon key. Order is load-bearing; see 025's header.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE COLUMN SET, DERIVED FROM MEASUREMENT NOT FROM TASTE
-- ─────────────────────────────────────────────────────────────────────────────
-- Every reader of this view, found by grepping both site repos:
--
--   algolab  web/lib/engine-units.ts::getEngineVerdicts    base, tf, dataset_version,
--   algolab  web/lib/engine-units.ts::getCuratedVerdicts   kmax, n_behaviors, n_go,
--                                                          n_marginal, n_no_go,
--                                                          published_at, per_asset
--   algolab  web/lib/engine-reasons.ts::getCauseCounts     base, tf, dataset_version,
--                                                          kmax, n_go, n_marginal,
--                                                          top_finalists, per_asset
--   algoproof src/lib/funnel.ts::getFunnelCounts           n_behaviors, n_go,
--                                                          n_marginal, n_no_go
--
-- Removed here, with the reason each one is safe to remove:
--
--   report_path       internal artefact path on the compute box. Read by nobody,
--   report_checksum   and already on the forbidden list of BOTH leak guards
--                     (cockpit-public-leak.test.tsx, dossier-leak.test.tsx).
--   selection_control read only from the BASE table by engine-survivors.ts, which
--                     copies it field by field. Its real jsonb shape in production
--                     is 9 keys where the TypeScript type declares 4 — the extras
--                     (`note`, English prose containing null_pct, plus `alpha`,
--                     `corrected`, `n_null_ran`, `n_shifts_available`) are internal
--                     methodology notes that were crossing to anon for nothing.
--
-- Kept although unread today: dd_cluster_pct, tuw_max_days, tuw_censored,
-- judge_version, taker_fee, slippage. These are judge-v2 methodology metadata —
-- cost model and drawdown shape. They are not the product, they are the kind of
-- honesty the site publishes on purpose, and a future page will plausibly want
-- them. Removing a column here costs one line; so does putting one back.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY REDACT top_finalists IN SQL RATHER THAN IN THE APP
-- ─────────────────────────────────────────────────────────────────────────────
-- Because the app is not a boundary. Both sites read Supabase with the anon key,
-- so anything the server can read, an anonymous caller can read directly from
-- PostgREST without going through any page. An application-side redaction filters
-- the tap while the valve stays open next to it. The database is the only place
-- where this can be enforced (§13.4 of the drilldown spec).
--
-- The redaction keeps exactly what countCauses() in engine-reasons.ts consumes:
-- `verdict` (it only tallies finalists whose verdict is NO_GO) and `reasons`
-- reduced to their leading token. That token reduction is not cosmetic: a raw
-- reason reads "wf_oos 0.77<1.15" and carries the THRESHOLD, which is classified.
-- countCauses already does `reason.trim().split(/\s+/)[0]` at line 49, so it sees
-- identical values whether the split happens here or there — this migration needs
-- NO application change, and the threshold simply stops leaving the database.

begin;

-- `create or replace view` cannot drop columns, so the view is dropped and
-- rebuilt. Both statements sit in one transaction: readers see the old view or
-- the new one, never a missing relation. Nothing depends on this view (the views
-- of migrations 020 and 022 read the base table directly), so no cascade.
drop view if exists public.engine_verdicts_public;

create view public.engine_verdicts_public as
select
  -- identity
  v.base,
  v.tf,
  v.dataset_version,
  v.kmax,
  -- counts: the corpus and its verdict split.
  -- n_behaviors is the SWEPT corpus, not the judged one — since the top-K change
  -- of 2026-08-06 only judging_cap rows per unit are judged, and the judged count
  -- is n_go + n_marginal + n_no_go. Both sites compute it that way.
  v.n_behaviors,
  v.n_go,
  v.n_marginal,
  v.n_no_go,
  v.published_at,
  -- judge v2 metadata: methodology, not product. See the header.
  v.per_asset,
  v.dd_cluster_pct,
  v.tuw_max_days,
  v.tuw_censored,
  v.judge_version,
  v.taker_fee,
  v.slippage,
  -- The graveyard's pedagogy, and NOTHING else. Per finalist: the verdict token
  -- and the CAUSE KEYS of its reasons. pf, dd, n_trades, params, filters and exit
  -- are dropped here, in the database, so they cannot be requested at all.
  -- Null-safe on both levels: a unit with no finalists yields [], never null,
  -- because countCauses iterates `row.top_finalists ?? []` and an explicit empty
  -- array keeps the two cases indistinguishable to it.
  coalesce(
    (
      select jsonb_agg(
               jsonb_build_object(
                 'verdict', f.elem ->> 'verdict',
                 'reasons', coalesce(
                   (
                     select jsonb_agg(split_part(r.txt, ' ', 1) order by r.ord)
                       from jsonb_array_elements_text(
                              case jsonb_typeof(f.elem -> 'reasons')
                                when 'array' then f.elem -> 'reasons'
                                else '[]'::jsonb
                              end
                            ) with ordinality as r(txt, ord)
                   ),
                   '[]'::jsonb
                 )
               )
               order by f.ord
             )
        from jsonb_array_elements(
               case jsonb_typeof(v.top_finalists)
                 when 'array' then v.top_finalists
                 else '[]'::jsonb
               end
             ) with ordinality as f(elem, ord)
    ),
    '[]'::jsonb
  ) as top_finalists
  -- v.survivors is DELIBERATELY ABSENT, as in 023. Do not add it. A page that
  -- needs it needs an entitlement check, not this view.
  -- v.report_path, v.report_checksum, v.selection_control are absent as of 024.
from public.engine_verdicts v;

comment on view public.engine_verdicts_public is
  'engine_verdicts, minus survivors / report_path / report_checksum /
   selection_control, and with top_finalists reduced to {verdict, reasons:[cause
   keys]}. Migration 023 kept top_finalists whole on the written belief that it
   held no params/filters/exit; production disproved that on 2026-08-08 (599 of
   622 finalists carried the full recipe). The redaction lives in SQL because both
   sites read with the anon key, so the application is not a confidentiality
   boundary. Sole consumer of top_finalists: algolab web/lib/engine-reasons.ts,
   which tallies cause keys and returns counters only.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Rights on the rebuilt view
-- ─────────────────────────────────────────────────────────────────────────────
-- The drop discarded 023's grants, so they are re-issued here — and the revoke is
-- re-issued with them, because Supabase ships ALTER DEFAULT PRIVILEGES on schema
-- public: a newly created object is handed INSERT/UPDATE/DELETE/TRUNCATE to anon
-- automatically. This view is NOT security_invoker, deliberately: it runs with its
-- owner's rights, which is what will let migration 025 revoke SELECT on the base
-- table without breaking any counter on either site.
grant select on public.engine_verdicts_public to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.engine_verdicts_public
  from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- engine_verdict_history — the second surface
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 018 created it as a column-for-column mirror of engine_verdicts, so
-- it carries `survivors` and `top_finalists` whole, for every verdict ever
-- overwritten by a re-publish. It is written by the publisher on the compute box
-- (backtests_massive/telemetry.py, insert only) using the service-role key, which
-- ignores grants entirely — so revoking anon here cannot affect the engine.
-- No TypeScript in either site repo reads this table; grep returns nothing.
revoke select, insert, update, delete, truncate, references, trigger
  on public.engine_verdict_history
  from anon, authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tell PostgREST the schema moved
-- ─────────────────────────────────────────────────────────────────────────────
-- This view is DROPPED and recreated, not replaced in place. PostgREST serves
-- from a cached schema and answers PGRST205 ("Could not find the table ... in the
-- schema cache") for anything it has not seen — which is exactly the error that
-- proved migration 023 had never been applied. Supabase normally reloads on DDL
-- via an event trigger, but this notify costs nothing and removes the window.
-- Outside the transaction on purpose: the listener must see a committed schema.
notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION — run after applying, and read every output before believing it
-- ─────────────────────────────────────────────────────────────────────────────
-- The point of these is that a commit message proves nothing and a migration
-- file proves nothing; only the object in the database does. (Learned the hard
-- way on 2026-08-08: commit 59682dd claimed "applied in production" for two
-- migrations, and only one of them had ever been applied.)
--
-- 1) The view no longer carries the removed columns. Expect exactly four rows:
--    report_checksum, report_path, selection_control, survivors.
--
--      select c.column_name
--        from information_schema.columns c
--       where c.table_schema = 'public' and c.table_name = 'engine_verdicts'
--         and c.column_name not in (
--           select v.column_name from information_schema.columns v
--            where v.table_schema = 'public'
--              and v.table_name = 'engine_verdicts_public')
--       order by 1;
--
-- 2) No recipe and no sid survives inside top_finalists. Expect 0.
--
--      select count(*) from public.engine_verdicts_public v,
--             lateral jsonb_array_elements(v.top_finalists) f
--       where f ? 'params' or f ? 'filters' or f ? 'exit'
--          or f ? 'pf' or f ? 'dd' or f ? 'n_trades' or f ? 'sid';
--
-- 3) No threshold survives inside reasons — a cause key never contains a space.
--    Expect 0.
--
--      select count(*) from public.engine_verdicts_public v,
--             lateral jsonb_array_elements(v.top_finalists) f,
--             lateral jsonb_array_elements_text(f -> 'reasons') r
--       where r like '% %';
--
-- 4) The cause tally is unchanged by the redaction — the whole point is that
--    getCauseCounts keeps producing the same numbers. Compare against the base
--    table, which still holds the raw reasons. Expect both columns equal.
--
--    Pre-computed on production data before applying, by reimplementing this
--    expression over the 117 rows fetched with the anon key. Both tallies came out
--    identical: assets_go 362, loo_unstable 373, wf_oos 126, pf_net 89, dd 55,
--    null_pct 38. If the numbers below differ from those, the data moved (the
--    drain publishes continuously) — compare the two COLUMNS to each other, which
--    is the actual invariant, not to these constants.
--
--      select
--        (select count(*) from public.engine_verdicts v,
--                lateral jsonb_array_elements(v.top_finalists) f,
--                lateral jsonb_array_elements_text(f -> 'reasons') r
--          where f ->> 'verdict' = 'NO_GO')                       as raw_reasons,
--        (select count(*) from public.engine_verdicts_public v,
--                lateral jsonb_array_elements(v.top_finalists) f,
--                lateral jsonb_array_elements_text(f -> 'reasons') r
--          where f ->> 'verdict' = 'NO_GO')                       as redacted_reasons;
--
-- 5) Grants: SELECT only, for anon and authenticated, on the view; and NOTHING
--    for either role on the history table.
--
--      select table_name, grantee, privilege_type
--        from information_schema.role_table_grants
--       where table_schema = 'public'
--         and table_name in ('engine_verdicts_public', 'engine_verdict_history')
--         and grantee in ('anon', 'authenticated')
--       order by 1, 2, 3;
--
-- 6) From OUTSIDE, with the publishable key — the only check that speaks the
--    attacker's language:
--
--      curl -s -o /dev/null -w '%{http_code}\n' \
--        -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--        "$URL/rest/v1/engine_verdict_history?select=survivors&limit=1"
--      # expect 401 or 404, NOT 200
--
--      curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--        "$URL/rest/v1/engine_verdicts_public?select=top_finalists&limit=1"
--      # expect finalists shaped {"verdict": "...", "reasons": ["wf_oos", ...]}
--      # and nothing else
