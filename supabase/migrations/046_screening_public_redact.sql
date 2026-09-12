-- Migration 046: the judge's bars leave the public API (screening_* tables)
-- Run by hand in the Supabase SQL editor. NOT applied by this repo.
--
-- WHAT LEAKED, AND HOW IT WAS FOUND (2026-09-12)
-- Measured from outside, with the site's publishable (anon) key:
--   GET /rest/v1/screening_campaigns?select=*   -> 200, null_bar: 95
--   GET /rest/v1/screening_candidates?select=*  -> 200, wf_bar: 1.15, dd_limit: 20
-- Those three columns are the judge's GATE THRESHOLDS, which are classified and never
-- published (algolab DECISIONS 2026-07-28 "seuils classes JAMAIS"; migration 024 header,
-- "Thresholds are classified too"). Migration 024 redacted the verdict tables and the
-- reason strings; it never touched these two tables, created by migration 014.
--
-- TWO FIXES, AND BOTH ARE NEEDED
-- The UI printed only one of the three ("95,16 pour une barre a 95", on a public bot
-- fiche). The other two never appeared on any page, and were leaking anyway: the site read
-- these tables with select('*'), which carried every column to the client, and the REST
-- endpoint answers the publishable key DIRECTLY, whatever the UI chooses to render. So a
-- narrower select on the site is necessary and not sufficient. This migration is the other
-- half: the bars stop being served at all.
--
-- SCOPE, MEASURED, NOT GUESSED
-- Across every table and view the two sites read, these two tables are the only ones
-- exposing a gate. engine_verdicts_public.dd_cluster_pct (77.0) and tuw_max_days (167.5)
-- are MEASUREMENTS, not gates, and stay. engine_host.cpu_pct / disk_used_pct likewise.
-- engine_verdict_history already answers 401 to the anon key (migration 024).
-- engine_units_public, funnel_counts, engine_search_space_public, bots, perf_daily,
-- armada_wave_measure, engine_runs and engine_funnel carry no gate.
--
-- SHAPE: same as migration 024. A redacted view per table, granted to anon; the base
-- tables' grants revoked. The views are NOT security_invoker, deliberately: they run with
-- their owner's rights, which is what keeps them working after the revoke below. The RLS
-- policies of migration 014 stay as they are; with no grant, they are unreachable anyway.
--
-- ORDER OF OPERATIONS ON DEPLOY: apply this script FIRST, then deploy the site. The site
-- now reads the two views, so between a deploy and this script the provenance block of a
-- bot fiche renders nothing (getProvenanceForBot degrades to null by design).

begin;

-- Everything the pages legitimately need: the MEASURED values (what a configuration did),
-- never the bar it was measured against.
create or replace view public.screening_campaigns_public as
select id, base, tf, state, judged_on, data_dir,
       n_behaviors, n_assets, n_rejected, n_marginal, n_candidates, created_at
  from public.screening_campaigns;
-- null_bar is DELIBERATELY ABSENT. Do not add it.

create or replace view public.screening_candidates_public as
select id, campaign_id, label, rank, filter_families,
       null_pct, dd, wf_oos, pf_net, trades, assets_go,
       qualified_assets, bot_slug, forward_trades
  from public.screening_candidates;
-- wf_bar and dd_limit are DELIBERATELY ABSENT. Do not add them.

comment on view public.screening_campaigns_public is
  'Redacted screening_campaigns for the publishable key: every column except null_bar, a classified judge gate (migration 046).';
comment on view public.screening_candidates_public is
  'Redacted screening_candidates for the publishable key: every column except wf_bar and dd_limit, classified judge gates (migration 046).';

grant select on public.screening_campaigns_public to anon, authenticated;
grant select on public.screening_candidates_public to anon, authenticated;

-- A newly created object is handed INSERT/UPDATE/DELETE/TRUNCATE to anon automatically
-- when PUBLIC holds them; revoke everything but the SELECT just granted (same as 024).
revoke insert, update, delete, truncate, references, trigger
    on public.screening_campaigns_public
  from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
    on public.screening_candidates_public
  from anon, authenticated;

-- The base tables stop answering the publishable key. This is what actually closes the
-- leak: the views above only change what a caller GETS, not what they can ASK FOR.
revoke select, insert, update, delete, truncate, references, trigger
    on public.screening_campaigns
  from anon, authenticated;
revoke select, insert, update, delete, truncate, references, trigger
    on public.screening_candidates
  from anon, authenticated;

commit;

-- PostgREST serves from a cached schema; without this it answers PGRST205 on the new views.
notify pgrst, 'reload schema';

-- AFTERWARDS, WITH THE ANON KEY (the only check that speaks the attacker's language):
--   the bars are gone      -> 401 or 404, NOT 200
--     curl -s -o /dev/null -w '%{http_code}\n' -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--       "$URL/rest/v1/screening_candidates?select=wf_bar,dd_limit&limit=1"
--     curl -s -o /dev/null -w '%{http_code}\n' -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--       "$URL/rest/v1/screening_campaigns?select=null_bar&limit=1"
--   the views answer, without a bar
--     curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--       "$URL/rest/v1/screening_candidates_public?select=*&limit=1"
--     # expect null_pct/dd/wf_oos/pf_net/trades, and NO wf_bar, NO dd_limit
--   grants, from the inside
--     select table_name, grantee, privilege_type
--       from information_schema.role_table_grants
--      where table_schema = 'public'
--        and table_name like 'screening_c%'
--        and grantee in ('anon', 'authenticated')
--      order by 1, 2, 3;
