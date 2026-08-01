-- Migration 021: family becomes mandatory
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- Runs AFTER migration 017 widened the allowed set. With hundreds of bots
-- arriving, a NULL family means a bot that no filter can reach: invisible in
-- practice while looking present in the table.
--
-- Verified on production 2026-07-31: 40 bots, ZERO nulls, five distinct values
-- (trend 25, breakout 9, mean-reversion 3, carry 2, market-neutral 1), all
-- inside the canonical nine. No per-bot classification is needed. Re-run the
-- check below before applying, in case a bot was added since.
--
--   select coalesce(family,'<<NULL>>'), count(*) from public.bots group by 1;

alter table public.bots
  alter column family set not null;

alter table public.bots
  drop constraint if exists bots_family_check;

alter table public.bots
  add constraint bots_family_check
  check (family in (
    'trend', 'momentum', 'breakout', 'mean-reversion', 'price-action',
    'carry', 'market-neutral', 'stat-arb', 'event'
  ));

alter table public.bots
  drop constraint if exists bots_family_fk;

alter table public.bots
  add constraint bots_family_fk
  foreign key (family) references public.families (slug);
