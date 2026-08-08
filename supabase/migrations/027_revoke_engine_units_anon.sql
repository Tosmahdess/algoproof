-- Migration 027: revoke anon SELECT on engine_units
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- ⚠️ DO NOT RUN BEFORE THE ALGOLAB DEPLOY THAT REPOINTS getEngineUnits AT
-- public.engine_units_public. Running it early does not corrupt anything, but the
-- whole cockpit degrades to "donnée indisponible" until it is undone — the units
-- fetcher feeds the coverage grid, the hero and every unit list.
--
-- PRECONDITION, checked the way it will actually be believed:
--
--   curl -s https://lab.algoproof.fr/cockpit | grep -c 'premier tamis\|second tamis'
--   # non-zero BEFORE and AFTER the revoke. Take the photo first: without a
--   # baseline, the check cannot tell "still working" from "was already empty".
--
-- Note the trap this pairs with, met on 2026-08-08 while closing engine_verdicts:
-- a page that renders is NOT proof that the new code path is live, because the old
-- one predicted the same page. Read `X-Vercel-Cache` — on a MISS with Age: 0 the
-- response was rendered after the revoke; on a HIT it may predate it entirely.
--
-- WHAT KEEPS WORKING: public.engine_units_public (migration 026) runs with its
-- owner's rights. The engine keeps writing through the service-role key on the
-- compute box, which ignores grants.

begin;

revoke select on public.engine_units from anon, authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────
--   curl -s -o /dev/null -w '%{http_code}\n' -H "apikey: $ANON" \
--     -H "Authorization: Bearer $ANON" "$URL/rest/v1/engine_units?select=base&limit=1"
--   # expect 401, NOT 200
--
--   curl -s -o /dev/null -w '%{http_code}\n' -H "apikey: $ANON" \
--     -H "Authorization: Bearer $ANON" "$URL/rest/v1/engine_units_public?select=base&limit=1"
--   # expect 200
--
-- Then the pages, on the deployed site: /cockpit, /cockpit/survivants,
-- /cockpit/cimetiere, /cockpit/dossier/emacross — none may say
-- "donnée indisponible".
--
-- ROLLBACK, one line:
--   grant select on public.engine_units to anon, authenticated;
