-- Migration 020: the funnel counter, as one view
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- Three numbers appear on several surfaces (home, La flotte, bot pages). Reading
-- them from three separate queries would let them disagree mid-render. One view,
-- one row, one truth.
--
-- n_tested is the count of behaviours the engine has judged — the denominator no
-- competing platform publishes. It is the number that makes every other figure on
-- the site interpretable, so it must never silently become zero (see the front's
-- degradation rule: render nothing rather than a zero).

create or replace view public.funnel_counts as
select
  coalesce((select sum(n_behaviors) from public.engine_verdicts), 0)::bigint as n_tested,
  (select count(*) from public.bots where status in ('paper', 'live'))::bigint as n_promoted,
  (select count(*) from public.bots where status = 'live')::bigint            as n_live;

grant select on public.funnel_counts to anon, authenticated;
