-- Migration 031: append search_mode to engine_verdicts_public.
--
-- One migration, one purpose (lesson 2026-08-08: one commit carrying two DDLs let an
-- unapplied one pass for applied). The view body below is COPIED VERBATIM from
-- 024_engine_verdicts_public_redact.sql (its redaction of top_finalists included) with
-- exactly one addition: `v.search_mode`, appended LAST because create-or-replace cannot
-- reorder an existing view's columns. Any future edit to 024's definition must be
-- replayed here (031 supersedes it as the live definition).
--
-- search_mode (engine-chain migration 022, D-APX-KLAD-4): 'sweep' = exhaustive tour up
-- to kmax; 'ladder' = greedy K4-5 extension of K<=3 survivors. Both sites read it to
-- badge ladder rows — a bare "K=4" would imply an exhaustive search that never ran.
--
-- PREREQUISITE: engine-chain migration 022 (column on the base table) must be applied
-- first, or this create fails on the missing column — which is the desired loud order.

create or replace view public.engine_verdicts_public as
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
  -- judge v2 metadata: methodology, not product. See 024's header.
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
  ) as top_finalists,
  -- v.survivors is DELIBERATELY ABSENT, as in 023/024. Do not add it. A page that
  -- needs it needs an entitlement check, not this view.
  -- v.report_path, v.report_checksum, v.selection_control are absent as of 024.
  -- ladder provenance (D-APX-KLAD-4) — appended last, see header.
  v.search_mode
from public.engine_verdicts v;

notify pgrst, 'reload schema';

-- ── verification (run each, expect the stated result) ──────────────────────────
-- select search_mode, count(*) from public.engine_verdicts_public group by 1;
--   -> sweep | <all rows>   (ladder rows appear only after the republish batch)
--
-- create-or-replace keeps the view's grants; confirm anyway:
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_name = 'engine_verdicts_public';
--   -> anon / authenticated SELECT present, nothing writeable
