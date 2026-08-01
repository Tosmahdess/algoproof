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
    'hyperliquid', 'bybit', 'okx'
  ));

update public.bots set venue = case
  when lower(exchange) like '%hyperliquid%'                          then 'hyperliquid'
  when lower(exchange) like '%kraken%'                               then 'kraken'
  when lower(exchange) like '%bybit%'                                then 'bybit'
  when lower(exchange) like '%okx%'                                  then 'okx'
  when lower(exchange) like '%binance%'
       and (lower(exchange) like '%futur%' or lower(exchange) like '%perp%')
                                                                     then 'binance-futures'
  when lower(exchange) like '%binance%'                              then 'binance-spot'
  else null
end
where venue is null;
