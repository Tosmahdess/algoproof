-- 029_equity_fiches_revoke_anon.sql
-- SEC-02, step 2 of 2. THIS ONE IS BREAKING IF APPLIED EARLY.
--
-- Apply ONLY after 028 is in and the code that reads `equity_fiches_public` is
-- deployed and verified. Applied before that, every fiche reader still points at
-- the base table and /wealth empties out for everyone.
--
-- What this closes: `equity_fiches` was `FOR SELECT USING (true)` since
-- 2026-06-01. Identity and content share ONE Supabase project
-- (avdegocswrhzdnvsyiui), and the content client ships in the browser bundle
-- through MiRegimeBadge -> @/lib/queries -> ./supabase. Measured on production
-- 2026-09-03: two createClient calls in the shipped chunks, same project, same
-- publishable key. So the paid corpus was readable by any visitor, whatever the
-- Next page chose to render.
--
-- RLS is not the lever here and never was: a policy governs ROWS, not COLUMNS.
-- Dropping the permissive policy and revoking the table grant is what removes
-- the read; the view added in 028 is what keeps the site alive without it.

DROP POLICY IF EXISTS "public read" ON equity_fiches;

REVOKE SELECT ON equity_fiches FROM anon, authenticated;

-- The generator (apex-wealth/equity_fiche_generator.py) writes with the
-- service-role key, which is not subject to either of the statements above, so
-- the monthly cron is unaffected. Verified against the role it actually uses,
-- not assumed: the engine incident taught that the writing role is worth
-- checking before a revoke, not after.

NOTIFY pgrst, 'reload schema';

-- VERIFY FROM THE OUTSIDE, WITH THE ATTACKER'S KEY — never from this editor's
-- success message. Two revokes in the 2026-08 incident were reported applied and
-- were not; only an external probe showed it. With the publishable key that is
-- in the public bundle:
--
--   GET {url}/rest/v1/equity_fiches?select=fondamentaux&limit=1   -> expect 401
--   GET {url}/rest/v1/equity_fiches_public?select=ticker&limit=1  -> expect 200
--
-- Then load a locked fiche as a guest and a free one as a member, in a private
-- window. A 200 on the first line means this migration did not take.
