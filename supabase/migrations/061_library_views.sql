-- 061: the library's reads (chantier bibliotheque, lot 2, D079/D083).
--
-- The site keeps excluding 'backtest' everywhere it already did (PUBLIC_STATUS_EXCLUSION,
-- guarded by tests). The library reads through these two views instead, by idea, so the
-- fleet pages never see the 2 154 never-launched survivors and the library never loads
-- every bot with its full history.
--
-- Both views are security_invoker: they see exactly what anon already sees through the
-- public SELECT policies of `bots` and `trades`, nothing more. No setting value is
-- exposed: filter NAMES only (060), and the selection-period PF / trade count, already
-- public per survivor through the lab's dossier preview.

alter table public.bots
  add column if not exists pf_backtest numeric,
  add column if not exists n_trades_backtest integer;

-- One row per bot that belongs to an idea, with its simulation so far (closed trades).
create or replace view public.library_variants
with (security_invoker = true) as
select b.id, b.slug, b.name, b.status, b.family, b.timeframe, b.assets,
       b.idea_key, b.idea_rank, b.wait_reason, b.filter_keys, b.mtf_caveat,
       b.survivor_id, b.found_at, b.paper_since, b.pf_backtest, b.n_trades_backtest,
       coalesce(s.n_closed, 0) as sim_trades,
       coalesce(s.pnl, 0) as sim_pnl
from public.bots b
left join (
  select t.bot_id,
         count(*) filter (where t.closed_at is not null) as n_closed,
         sum(t.pnl) filter (where t.closed_at is not null) as pnl
  from public.trades t
  group by t.bot_id
) s on s.bot_id = b.id
where b.idea_key is not null and b.status <> 'frozen';

-- One row per idea: what the library card and the idea page print.
-- "Up" / "down" only count variants with at least 20 closed simulated trades; below that
-- a variant is "too young" to say anything (the rule the maquette shows in words).
create or replace view public.library_ideas
with (security_invoker = true) as
select v.idea_key,
       split_part(v.idea_key, '|', 1) as base,
       split_part(v.idea_key, '|', 2) as tf,
       min(v.family) as family,
       count(*) as n_variants,
       count(*) filter (where v.status = 'backtest') as n_backtest,
       count(*) filter (where v.wait_reason = 'awaiting_validation') as n_awaiting,
       count(*) filter (where v.wait_reason = 'trailing_unsupported') as n_trailing,
       count(*) filter (where v.wait_reason = 'not_surviving') as n_not_surviving,
       count(*) filter (where v.status in ('paper', 'live')) as n_running,
       count(*) filter (where v.status = 'archived') as n_stopped,
       count(*) filter (where v.status <> 'backtest' and v.sim_trades >= 20 and v.sim_pnl > 0) as n_sim_up,
       count(*) filter (where v.status <> 'backtest' and v.sim_trades >= 20 and v.sim_pnl <= 0) as n_sim_down,
       count(*) filter (where v.status <> 'backtest' and v.sim_trades < 20) as n_sim_young,
       percentile_cont(0.25) within group (order by v.pf_backtest) as pf_q1,
       percentile_cont(0.5) within group (order by v.pf_backtest) as pf_median,
       percentile_cont(0.75) within group (order by v.pf_backtest) as pf_q3,
       count(v.pf_backtest) as n_pf,
       max(v.found_at) as last_found_at
from public.library_variants v
group by v.idea_key;

grant select on public.library_variants to anon, authenticated;
grant select on public.library_ideas to anon, authenticated;
