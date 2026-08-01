-- Migration 018: normalised venue slug on bots
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- `exchange` stays as the human-readable display string. `venue` is the slug the
-- filters key on. Keeping both means renaming a venue for display never breaks a
-- saved filter URL.

alter table public.bots
  add column if not exists venue text;

alter table public.bots
  drop constraint if exists bots_venue_check;

alter table public.bots
  add constraint bots_venue_check
  check (venue is null or venue in (
    'binance-spot', 'binance-futures', 'kraken',
    'hyperliquid', 'bybit', 'okx', 'oanda', 'cross-venue'
  ));

-- Exact-string matches FIRST, for the seven `exchange` values actually seen in
-- production (read 2026-08-01). A generic `like` pattern is what produced the
-- bug this ordering fixes: 'HL Perps + Binance Spot' (funding-rate-harvest, a
-- delta-neutral carry — long spot Binance, short perp Hyperliquid) does not
-- contain the substring "hyperliquid", so it fell through the first `like`
-- branch below, then matched '%binance%' + '%perp%' and was classified
-- 'binance-futures' — wrong in both directions, and silent, since the
-- migration's verifier only ever reports venues left NULL, never
-- mis-classified ones. Equality on the known strings can't be fooled by a
-- substring landing in the wrong branch; the `like` cascade survives below,
-- unchanged, purely as a fallback for exchange values introduced after this
-- migration runs.
update public.bots set venue = case
  when exchange = 'HL Perps + Binance Spot'           then 'cross-venue'
  when exchange = 'Hyperliquid perps (proxy BinFut)'  then 'hyperliquid'   -- BinFut is only the OHLCV proxy
  when exchange = 'OANDA'                             then 'oanda'
  when exchange = 'Binance Futures'                   then 'binance-futures'
  when exchange = 'Binance Spot'                      then 'binance-spot'
  when exchange = 'Hyperliquid'                       then 'hyperliquid'
  when exchange = 'Kraken Spot'                       then 'kraken'
  -- Fallback for anything not one of the seven exact strings above (a new
  -- exchange value introduced after this migration ran).
  when lower(exchange) like '%hyperliquid%'                          then 'hyperliquid'
  when lower(exchange) like '%kraken%'                               then 'kraken'
  when lower(exchange) like '%bybit%'                                then 'bybit'
  when lower(exchange) like '%okx%'                                  then 'okx'
  when lower(exchange) like '%oanda%'                                then 'oanda'
  when lower(exchange) like '%binance%'
       and (lower(exchange) like '%futur%' or lower(exchange) like '%perp%')
                                                                     then 'binance-futures'
  when lower(exchange) like '%binance%'                              then 'binance-spot'
  else null
end
where venue is null;
