-- 008_equity_fiches.sql
-- Equity fiches (monthly AI analysis per watchlist company). Append-only versions.
-- Written by apex-wealth/equity_fiche_generator.py (service_role); read by /wealth/[ticker].
-- Already applied to Supabase 2026-06-01 — recorded here for repo parity (idempotent).

CREATE TABLE IF NOT EXISTS equity_fiches (
    ticker              TEXT NOT NULL,
    ticker_yf           TEXT NOT NULL,
    asset_name          TEXT NOT NULL,
    category            TEXT,
    generated_at        TIMESTAMPTZ NOT NULL,
    thesis_version      INTEGER NOT NULL,
    price_at_generation REAL,
    fondamentaux        TEXT NOT NULL,
    valorisation        TEXT NOT NULL,
    momentum            TEXT NOT NULL,
    risques             TEXT NOT NULL,
    verdict             TEXT NOT NULL,
    verdict_reason      TEXT NOT NULL,
    inputs_snapshot     JSONB,
    is_featured         BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (ticker, thesis_version)
);

ALTER TABLE equity_fiches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON equity_fiches;
CREATE POLICY "public read" ON equity_fiches FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_equity_fiches_latest
    ON equity_fiches (ticker, thesis_version DESC);
