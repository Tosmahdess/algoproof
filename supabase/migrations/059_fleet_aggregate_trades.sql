-- 059_fleet_aggregate_trades.sql
-- Project: avdegocswrhzdnvsyiui (the content project).
--
-- /overview's fleet totals (« Argent réel » / « Simulation », the day journal) are
-- computed from every closed trade of every non-archived bot. They were read in pages
-- of 1 000 rows (ten PostgREST requests), then cached 30 min by unstable_cache.
-- Measured 2026-09-29: the page served « 6 189 trades, +362,65 EUR » while the table
-- held 6 253 (an inconsistent state, the pages read during the publisher's rewrite),
-- then « 6 258, +300,46 EUR » for over 80 minutes while the table moved on: the cache
-- entry stopped refreshing, with no error logged.
--
-- One statement = one consistent snapshot, one request, no 1 000-row page cap (a
-- scalar jsonb). The caller no longer caches it. Same rows and columns as before:
-- pnl, side, closed_at, bot_id, asset of closed trades of non-archived bots.
-- SECURITY INVOKER: the caller's rights and RLS apply (trades and bots are already
-- read by the anon client); plpgsql, not sql.

create or replace function public.fleet_aggregate_trades()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'pnl', t.pnl, 'side', t.side, 'closed_at', t.closed_at,
             'bot_id', t.bot_id, 'asset', t.asset)
           order by t.closed_at desc)
    from public.trades t
    join public.bots b on b.id = t.bot_id
    where t.closed_at is not null
      and b.status <> 'archived'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.fleet_aggregate_trades() from public;
grant execute on function public.fleet_aggregate_trades() to anon, authenticated, service_role;
