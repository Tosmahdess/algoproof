-- 042_equity_fiches_column_grants.sql
--
-- Migration 041 ran and changed nothing. This is what it should have said.
--
-- WHY 041 WAS A NO-OP. `anon` holds SELECT on equity_fiches at the TABLE level.
-- Postgres will not carve a column out of a table-level grant: `revoke select
-- (col) ... from anon` against a table-wide privilege emits
--
--     WARNING: no privileges could be revoked for column "fondamentaux"
--
-- and returns success. A warning in a SQL editor looks exactly like a comment,
-- so the migration reported "applied" while the four paid columns stayed
-- readable. `information_schema.column_privileges` then shows every column as
-- SELECT, because it EXPANDS a table-level grant across all columns -- which is
-- precisely what the verification query showed.
--
-- The only way to grant per column is to hold no table-level grant at all: drop
-- it, then grant the columns you actually want. That is what this does.
--
-- Reminder of why any of this matters: RLS decides ROWS. Columns are decided by
-- GRANT. The `for select using (true)` policy from 008 was never wrong about
-- rows, it simply had nothing to say about columns, and nothing else did either.

-- 1. Take away the blanket. PUBLIC is included because a grant to PUBLIC is
--    inherited by anon and would survive a revoke aimed only at anon. This does
--    not touch service_role, which holds its own grant and bypasses RLS -- that
--    is the identity the server reader and the fiche generator use.
revoke select on public.equity_fiches from anon, authenticated, public;

-- 2. Give back exactly what the site reads without paying. This list is
--    SUMMARY_COLUMNS in src/lib/equity.ts, and every read in that file uses an
--    explicit column list -- there is no `select('*')` anywhere, which is what
--    makes this safe to narrow.
grant select (
  ticker,
  ticker_yf,
  asset_name,
  category,
  generated_at,
  thesis_version,
  price_at_generation,
  verdict,
  verdict_reason,
  is_featured
) on public.equity_fiches to anon, authenticated;

-- Deliberately NOT granted, beyond the four prose blocks: `inputs_snapshot`.
-- It holds the raw inputs behind each analysis, no page reads it, and there is
-- no reason for an anonymous key to be able to.

comment on column public.equity_fiches.fondamentaux is
  'Paid column. anon and authenticated hold no grant on it (migration 042; 041 was a no-op against a table-level grant). Read server-side with the service-role key only.';

-- VERIFICATION, same sitting:
--
--   -- a. anon must now hold exactly ten columns, and none of the five withheld:
--   select column_name from information_schema.column_privileges
--    where table_name = 'equity_fiches' and grantee = 'anon' and privilege_type = 'SELECT'
--    order by column_name;
--   -- expected: asset_name, category, generated_at, is_featured, price_at_generation,
--   --           thesis_version, ticker, ticker_yf, verdict, verdict_reason
--   -- absent:   fondamentaux, valorisation, momentum, risques, inputs_snapshot
--
--   -- b. and no table-level grant is left to expand over them again:
--   select grantee, privilege_type from information_schema.table_privileges
--    where table_name = 'equity_fiches' and grantee in ('anon','authenticated','PUBLIC');
--   -- expected: no SELECT row for those grantees.
--
-- THEN, in a browser: a /wealth fiche while signed out must still show its
-- summary, and a fiche while signed in as a MEMBER must show the full analysis.
-- If the member's analysis is blank, SUPABASE_SERVICE_ROLE_KEY is missing from
-- the algoproof Vercel project and src/lib/supabase-privileged.ts has fallen
-- back to the anon key -- which now has no grant, hence the blank.
--
-- ROLLBACK, if the analyses go blank and the key cannot be added right away:
--   grant select on public.equity_fiches to anon, authenticated;
