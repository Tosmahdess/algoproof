-- 014_trades_entry_exit_price.sql
-- Real entry/exit fill prices for bot-fiche trade charts (SP1). Nullable:
-- existing rows stay NULL until the sync re-run backfills them; funding/xsec/
-- funding-rev/grid bots (return-based, no fill price) stay NULL by design.
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_price double precision;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_price  double precision;
