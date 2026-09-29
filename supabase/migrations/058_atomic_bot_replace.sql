-- 058_atomic_bot_replace.sql
-- Project: avdegocswrhzdnvsyiui (the content project).
--
-- The VPS publisher (algoproof_sync.py, sync_bot) rewrote each bot's trades and
-- perf_daily every hour as DELETE then INSERT, two separate HTTP requests with no
-- transaction. Measured 2026-09-29 around the 19:00 sync: the trades count read
-- 9 933, then 9 788 (19:00:48), then 9 446 (19:00:55), then back to 9 935. Any
-- reader in that window saw bots with no trades: /overview's fleet aggregate
-- (cached 30 min) served « 6 189 trades » for hours while the table held 6 253,
-- and a bot page rendered then would show an empty bot for up to 30 min.
--
-- These two functions do the same delete + insert inside ONE transaction (one
-- PostgREST rpc call = one transaction): a reader sees the old rows or the new
-- ones, never a half-written bot (MVCC). Semantics are otherwise identical to the
-- old path: every row of the bot is replaced, ids are new.
--
-- plpgsql, not sql (vault lesson: a `language sql` function is planned without
-- its parameters). SECURITY INVOKER: the caller's rights apply, and only the
-- service role may call them (functions are executable by PUBLIC by default).

create or replace function public.replace_bot_trades(p_bot_id uuid, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.trades where bot_id = p_bot_id;
  insert into public.trades (bot_id, opened_at, closed_at, asset, side, pnl, reason,
                             is_paper, entry_price, exit_price)
  select p_bot_id, x.opened_at, x.closed_at, x.asset, x.side, x.pnl, x.reason,
         coalesce(x.is_paper, true), x.entry_price, x.exit_price
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as x(
    opened_at timestamptz, closed_at timestamptz, asset text, side text, pnl numeric,
    reason text, is_paper boolean, entry_price double precision, exit_price double precision);
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.replace_bot_perf_daily(p_bot_id uuid, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.perf_daily where bot_id = p_bot_id;
  insert into public.perf_daily (bot_id, date, capital, pnl_day, win_rate, profit_factor)
  select p_bot_id, x.date, x.capital, x.pnl_day, x.win_rate, x.profit_factor
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as x(
    date date, capital numeric, pnl_day numeric, win_rate numeric, profit_factor numeric);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.replace_bot_trades(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.replace_bot_perf_daily(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_bot_trades(uuid, jsonb) to service_role;
grant execute on function public.replace_bot_perf_daily(uuid, jsonb) to service_role;

-- Verification, to run after applying (each must hold):
--   set role anon; select public.replace_bot_trades(gen_random_uuid(), '[]');  -- permission denied
--   reset role; set role authenticated; (same)                                  -- permission denied
--   reset role;
--   A probe of count(trades) every 3 s across an hourly sync never dips.
