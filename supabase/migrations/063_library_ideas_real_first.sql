-- 063: library_ideas separates real money, simulation and stopped variants.
--
-- Review of lot 2 (Astra, 2026-10-01): 062 summed paper + live into n_running and counted
-- archived variants in the "simulation" split, while the pages call that set "en
-- simulation". The site's rule R1: real money first, the simulation always labelled,
-- never fused. Now:
--   n_live        real-money variants (shown first)
--   n_paper       variants running in simulation
--   n_running     paper + live, kept for readers of 061/062
--   n_stopped     archived
--   n_sim_*       the split covers RUNNING simulations only (status 'paper'), counted on
--                 closed trades since the launch (the trades register, no backtest replay;
--                 the pages say "depuis le lancement"). Threshold 30, see 062.
-- n_sim_down keeps "zero or below"; the pages label it so.

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
       count(*) filter (where v.status = 'paper' and v.sim_trades >= 30 and v.sim_pnl > 0) as n_sim_up,
       count(*) filter (where v.status = 'paper' and v.sim_trades >= 30 and v.sim_pnl <= 0) as n_sim_down,
       count(*) filter (where v.status = 'paper' and v.sim_trades < 30) as n_sim_young,
       percentile_cont(0.25) within group (order by v.pf_backtest) as pf_q1,
       percentile_cont(0.5) within group (order by v.pf_backtest) as pf_median,
       percentile_cont(0.75) within group (order by v.pf_backtest) as pf_q3,
       count(v.pf_backtest) as n_pf,
       max(v.found_at) as last_found_at,
       count(*) filter (where v.status = 'live') as n_live,
       count(*) filter (where v.status = 'paper') as n_paper
from public.library_variants v
group by v.idea_key;

grant select on public.library_ideas to anon, authenticated;
