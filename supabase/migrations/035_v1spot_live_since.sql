-- 035_v1spot_live_since.sql
--
-- v1-spot has been trading real money since its very first trade, on 2026-04-17.
-- Its `live_since` said 2026-05-08, which made the 8 trades of 17/04 to 07/05
-- (+45,52 EUR, on the -USDT pairs of the pre-Kraken era) look like a simulated
-- warm-up. They were not: user's call, 2026-08-22.
--
-- Why this matters beyond one bot: since the same day, the site splits real money
-- from laboratory by DATE (a trade is real from its bot's live_since, never
-- before) instead of by the bot's current status. That rule is what stops the 75
-- wave bots from turning their whole simulated past into real money the day they
-- get promoted. It also means live_since is now load-bearing: a late date hides
-- real money, an early one invents it.
--
-- Run this in the Supabase SQL editor, then reload /overview: « Le bilan » must
-- read +157,98 EUR of real money over 300 trades, which is what the corrected
-- weekly posts now say. To undo, set the value back to 2026-05-08.
--
-- `scripts/weekly_figures.py --audit` checks both halves: it compares every
-- published weekly to the data, and flags any live bot that traded before its
-- own live_since.

update public.bots
   set live_since = '2026-04-17T00:00:00+00:00'
 where slug = 'v1-spot';

-- Expected: UPDATE 1
select slug, status, live_since from public.bots where slug = 'v1-spot';
