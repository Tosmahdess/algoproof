-- 029_mi_fleet_impact_read_policy.sql
--
-- The 028 table is created with RLS ON (this project's default for new tables in `public`),
-- and RLS with no policy denies everything. So `grant select to anon` was necessary and NOT
-- sufficient: anon held the privilege and still read nothing.
--
-- HOW THIS WAS FOUND, because the lesson matters more than the fix. The 028 verification was
-- "anon SELECT returns 200" — and it did, with `[]`, on an empty table. That check could not
-- distinguish "readable and empty" from "unreadable". It read as a pass while the read path
-- was already broken. It only became a real check once a row existed: anon still saw `[]`
-- while the service-role key saw the row, which is the pair that discriminates.
-- Rule this re-proves: a verification whose expected value is identical before and after the
-- thing it verifies is not a verification (see _me/learnings.md, 2026-08-09).
--
-- Read-only, public by design: this table holds one summary row per weekly run, and the whole
-- point is that a visitor can read it on /intelligence. Writes stay closed to anon (028's
-- revoke), and the publisher writes under the service role.

alter table public.mi_fleet_impact enable row level security;

drop policy if exists "mi_fleet_impact public read" on public.mi_fleet_impact;
create policy "mi_fleet_impact public read"
  on public.mi_fleet_impact
  for select
  to anon, authenticated
  using (true);
