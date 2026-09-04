-- 041_equity_fiches_prose_columns.sql
--
-- The four columns the membership sells stop being readable with the anon key.
--
-- 008_equity_fiches.sql set `create policy "public read" on equity_fiches for
-- select using (true)`, and that policy covers EVERY column -- including
-- fondamentaux, valorisation, momentum and risques, the analysis a member pays
-- 29 EUR a month to read. The paywall existed only in the Next page, so anyone
-- holding the anon key could fetch the whole thing without paying. That key is
-- in no client bundle today, which is why this was a P1 and not a P0, but "it
-- has not leaked yet" is not an access control.
--
-- RLS decides ROWS. Columns are decided by GRANT, which is why the policy above
-- could look correct and protect nothing: the two mechanisms answer different
-- questions and only one of them was used.
--
-- ⚠️ ORDER MATTERS. Apply this ONLY once SUPABASE_SERVICE_ROLE_KEY exists on the
-- algoproof Vercel project (all environments). src/lib/equity.ts already reads
-- these columns through a privileged client and falls back to the anon one while
-- the key is missing -- so applying this first would empty the paid analyses for
-- every member, including the ones who are paying.
--
-- Everything else on the table stays public: ticker, name, category, verdict,
-- the one-line reason and the generation date are what the free index and the
-- five free samples are built from, and the site would be empty without them.

revoke select (fondamentaux, valorisation, momentum, risques)
  on public.equity_fiches
  from anon;

-- authenticated is revoked too. A member's browser session is `authenticated`,
-- and the paywall is decided server-side from their subscription: a signed-in
-- free account must not be able to read the prose by querying the table
-- directly. The service-role key bypasses both grants and RLS, which is exactly
-- what the server reader uses.
revoke select (fondamentaux, valorisation, momentum, risques)
  on public.equity_fiches
  from authenticated;

comment on column public.equity_fiches.fondamentaux is
  'Paid column: revoked from anon and authenticated (migration 041). Read server-side with the service-role key only.';

-- Verification, in the same sitting:
--
--   -- 1. The four columns are gone for anon, the rest is not:
--   select column_name, privilege_type
--     from information_schema.column_privileges
--    where table_name = 'equity_fiches' and grantee = 'anon'
--    order by column_name;
--   -- fondamentaux / valorisation / momentum / risques must be ABSENT,
--   -- ticker / verdict / asset_name must still be present.
--
--   -- 2. And the site still works: open a free /wealth fiche (summary only)
--   --    and a paid one (full prose) in a browser. If the paid one comes back
--   --    empty, the service-role key is missing on Vercel -- see the header.
--
-- Rollback, if the key turns out to be absent and the analyses go blank:
--   grant select (fondamentaux, valorisation, momentum, risques)
--     on public.equity_fiches to anon, authenticated;
