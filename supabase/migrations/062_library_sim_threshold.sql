-- 062: the library's "too young" threshold moves from 20 to 30 closed trades.
--
-- 061 counted a simulated variant as above / below zero from 20 closed trades. 20 is
-- also one of the judge's per-window floors, which are classified (algolab DECISIONS
-- 2026-07-28; tests/lib/engine-method-copy.test.ts): the variant table would let a
-- visitor read it off (19 trades "too young", 21 trades with a sign). 30 is the count
-- of the public sales criterion. Same number as SIM_MIN_TRADES in src/lib/library.ts.

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
       count(*) filter (where v.status <> 'backtest' and v.sim_trades >= 30 and v.sim_pnl > 0) as n_sim_up,
       count(*) filter (where v.status <> 'backtest' and v.sim_trades >= 30 and v.sim_pnl <= 0) as n_sim_down,
       count(*) filter (where v.status <> 'backtest' and v.sim_trades < 30) as n_sim_young,
       percentile_cont(0.25) within group (order by v.pf_backtest) as pf_q1,
       percentile_cont(0.5) within group (order by v.pf_backtest) as pf_median,
       percentile_cont(0.75) within group (order by v.pf_backtest) as pf_q3,
       count(v.pf_backtest) as n_pf,
       max(v.found_at) as last_found_at
from public.library_variants v
group by v.idea_key;

grant select on public.library_ideas to anon, authenticated;
