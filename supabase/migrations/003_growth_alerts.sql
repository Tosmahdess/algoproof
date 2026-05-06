-- Migration 003: Add growth_alerts table for GROWTH watchlist dip alert history

CREATE TABLE IF NOT EXISTS growth_alerts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerted_at       timestamptz NOT NULL,
  ticker           text        NOT NULL,
  asset_name       text        NOT NULL,
  drawdown_pct     numeric(6,2) NOT NULL,
  ma50_gap_pct     numeric(6,2),
  rsi14            numeric(5,2),
  signal_level     text        NOT NULL CHECK (signal_level IN ('minor','major','crash')),
  confidence       text,
  market_regime    text,
  mi_score         numeric(6,2),
  mi_regime        text,
  current_price    numeric(16,4),
  high_90d         numeric(16,4),
  suggested_min    integer,
  suggested_max    integer,
  indicators       text,  -- JSON array ["minor","none","major"]
  created_at       timestamptz DEFAULT now(),
  UNIQUE (alerted_at, ticker)
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='growth_alerts' AND policyname='public read growth_alerts'
  ) THEN
    ALTER TABLE growth_alerts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "public read growth_alerts" ON growth_alerts FOR SELECT USING (true);
  END IF;
END $$;
