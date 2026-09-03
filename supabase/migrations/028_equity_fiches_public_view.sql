-- 028_equity_fiches_public_view.sql
-- SEC-02, step 1 of 2. ADDITIVE ONLY — apply this one FIRST and on its own.
-- It creates the redacted view and grants it. It does NOT revoke anything, so
-- the site keeps working exactly as before while the new code is deployed.
-- The revoke that actually closes the leak is 029, applied AFTER that deploy.
--
-- Why a view and not a column-level revoke:
-- `revoke select (col) ... from anon` is FAIL-OPEN — the next column added to the
-- table is anon-readable the day it is created. That is precisely how the
-- engine_verdicts incident (2026-08) grew from one leaking surface to three
-- while every plan said it was one. A view is fail-closed: a new column on the
-- base table is invisible here until someone writes it into this list.
--
-- What is deliberately NOT in this view:
--   fondamentaux, valorisation, momentum, risques  -- the four columns the
--       29 EUR/month membership sells
--   inputs_snapshot                                -- {fundamentals, market_ctx},
--       the model inputs behind them
--
-- security_invoker stays OFF (the default): the view must run with its owner's
-- rights so it still reads the base table after 029 revokes anon on it. That is
-- the whole mechanism — turning security_invoker ON here would make the view
-- inherit the caller's (revoked) rights and return nothing.

CREATE OR REPLACE VIEW equity_fiches_public AS
SELECT
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
FROM equity_fiches;

GRANT SELECT ON equity_fiches_public TO anon, authenticated;

-- PostgREST caches the schema. Without this the new view answers PGRST205 and
-- the site looks broken for no visible reason — the exact error that revealed
-- migration 023 had never actually been applied.
NOTIFY pgrst, 'reload schema';
