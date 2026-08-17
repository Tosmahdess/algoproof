-- 032_dossier_payload.sql
--
-- The cockpit dossier stops being one hardcoded public page and becomes a paid
-- surface. This function is the gate, and it is in SQL on purpose.
--
-- WHY IN THE DATABASE AND NOT IN THE APPLICATION
-- Next serialises every prop crossing into a client component into the RSC flight
-- payload inside the served HTML (leak of 2026-07-28: the page rendered clean text
-- while its payload carried `wf_oos 0.77<1.15`). An application-side redaction is a
-- filter on the tap while the valve stays open beside it. Here the non-payer never
-- receives the bytes, so no rendering, payload, cache or serialisation bug can emit
-- what Postgres never sent.
--
-- WHY THE FUNCTION DOES NOT TAKE AN ENTITLEMENT ARGUMENT
-- If the caller passed `is_paid`, the database would trust the application and this
-- would be one layer wearing two hats. It reads auth.uid() from the presented JWT and
-- looks up subscriptions itself. The application can only forward a token.
--
-- WHY THE TEASER IS AN ALLOW-LIST
-- Migration 024 is the cautionary tale: a view written to protect published 599
-- complete recipes because it reasoned by blocklist. Every teaser key is named here.
-- A column added to engine_verdicts tomorrow is absent from the teaser by default,
-- never present by omission.
--
-- WHY VOLATILE
-- It does not write today. It will, in lot 1b: the corpus is copyable bytes and a
-- binary "you are a payer, here are all 23 657 recipes" has no anti-dump. Declaring
-- it VOLATILE now means adding the metering insert later does not change its
-- volatility class, and therefore does not change how PostgREST or the planner treat
-- it. Do not "optimise" it to STABLE.
--
-- ENTITLEMENT: `active` ONLY, deliberately narrower than the compute gate.
-- api/quotas.py::resolve_tier accepts ('active','trialing') for the optimiser,
-- walk-forward, CSV and robustness — compute cannot be stolen. The corpus can: one
-- throwaway email, one 7-day trial, ~10 RPC calls and the whole product is out for
-- zero euro. The asymmetry is the design (spec §4.6). Do not align them.

create or replace function public.dossier_payload(
  p_base text,
  p_dataset text default null
)
returns jsonb
language plpgsql
volatile
security definer
-- An empty search_path forces every name below to be schema-qualified. Without it a
-- SECURITY DEFINER function resolves unqualified names against the CALLER's path,
-- which is the classic privilege-escalation route for definer functions.
set search_path = ''
as $$
declare
  -- Mirrors CORRECTED_ENGINE_SINCE in algolab web/lib/engine-freshness.ts:31.
  -- Verdicts produced before the pandas 3.0 fix are not publishable. The two
  -- constants are pinned together by a test in that repo.
  c_cutoff constant timestamptz := '2026-08-12T19:38:00Z';
  v_uid uuid := auth.uid();
  v_paid boolean := false;
  v_units jsonb;
begin
  if v_uid is not null then
    select pg_catalog.count(*) > 0
      into v_paid
      from public.subscriptions s
     where s.user_id = v_uid
       and s.status = 'active'
       and (s.current_period_end is null or s.current_period_end > pg_catalog.now());
  end if;

  select pg_catalog.coalesce(
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'base', v.base,
               'tf', v.tf,
               'dataset_version', v.dataset_version,
               'kmax', v.kmax,
               'search_mode', v.search_mode,
               'n_behaviors', v.n_behaviors,
               'n_go', v.n_go,
               'n_marginal', v.n_marginal,
               'published_at', v.published_at,
               -- TEASER-SIDE, never paid. This feeds HonestyNote, the permanent caveat
               -- that says what these verdicts do NOT prove. Its own header states it must
               -- never render nothing — "a page of 152 recipes with no caveat is exactly
               -- what this note exists to prevent" — so hiding it behind the paywall would
               -- put the sales screen in the one state the component was written to forbid.
               -- Four named fields, never `v.selection_control` whole: the column is jsonb
               -- and carries engine prose (`note`, `alpha`, `corrected`, `n_null_ran`) that
               -- reached the served HTML once already through a spread.
               'selection_control', case
                 when v.selection_control is null then null
                 else pg_catalog.jsonb_build_object(
                   'n_behaviors',            v.selection_control -> 'n_behaviors',
                   'bonferroni_bar',         v.selection_control -> 'bonferroni_bar',
                   'resolution_ceiling',     v.selection_control -> 'resolution_ceiling',
                   'bonferroni_expressible', v.selection_control -> 'bonferroni_expressible'
                 )
               end,
               'survivors', (
                 select pg_catalog.coalesce(
                          pg_catalog.jsonb_agg(
                            -- Allow-list. The seven teaser keys, plus the recipe only
                            -- when v_paid. `dd` is NOT optional: no survivor is ever
                            -- rendered without its drawdown (spec §3.4).
                            pg_catalog.jsonb_build_object(
                              'k',        e -> 'k',
                              'dd',       e -> 'dd',
                              'pf',       e -> 'pf',
                              'wf',       e -> 'wf',
                              'n_trades', e -> 'n_trades',
                              'eligible', ((e ->> 'verdict') = 'GO_PAPER'),
                              -- Cause KEY only. The raw reason carries its threshold
                              -- ("wf_oos 0.77<1.15"); migration 024 redacts to the key
                              -- and so does this.
                              'cause', case
                                when pg_catalog.jsonb_array_length(
                                       pg_catalog.coalesce(e -> 'reasons', '[]'::jsonb)) > 0
                                then pg_catalog.split_part(e -> 'reasons' ->> 0, ' ', 1)
                                else null
                              end
                            )
                            || case when v_paid then pg_catalog.jsonb_build_object(
                                 'params',  e -> 'params',
                                 'filters', e -> 'filters',
                                 'exit',    e -> 'exit'
                               ) else '{}'::jsonb end
                            -- NEUTRAL ORDER, DECIDED HERE AND NOT IN THE CLIENT.
                            --
                            -- The engine stores survivors in its own (-null_pct, -pf) order and
                            -- jsonb_agg preserves input order, so without this the anonymous,
                            -- indexable half of the conversion screen renders a profit-factor
                            -- leaderboard. That is the exact thing neutral-order.ts was written
                            -- to kill and the 31/07 note forbids by name: a default ranking by
                            -- performance is an implicit recommendation, and the top of such a
                            -- ranking is mechanically the small-sample lucky tail. The client
                            -- cannot fix it on the teaser arm — its hash needs `filters`, which
                            -- a teaser entry does not carry, so it ties and falls back to input
                            -- order.
                            --
                            -- ⚠️ DO NOT "improve" this by publishing the hash as a row id.
                            -- One unit's space is ~36 million enumerable configurations, so a
                            -- published hash of the entry is brute-forceable offline and hands
                            -- over the whole paid corpus. The ordering is computed here and
                            -- never leaves the database; that is the point.
                            order by pg_catalog.md5(e::text)
                          ),
                          '[]'::jsonb)
                   from pg_catalog.jsonb_array_elements(
                          pg_catalog.coalesce(v.survivors, '[]'::jsonb)) e
               )
             )
           ),
           '[]'::jsonb)
    into v_units
    from public.engine_verdicts v
   -- CASE-INSENSITIVE ON PURPOSE. DO NOT "OPTIMISE" THIS BACK TO `v.base = p_base`.
   --
   -- The corpus stores base names in camelCase (EMAcross, WilliamsVolBreak,
   -- DonchianBreakout, KeltnerBreak, TEMAcross, ATRChannel, HMAcross, ORB, KAMAcross,
   -- HeikinAshiTrend) while every URL the site produces is LOWERCASE by construction:
   -- the links on /cockpit/survivants, the entries in sitemap.ts and the page's own
   -- canonical all call .toLowerCase(), and the route hands its raw segment straight to
   -- this function. A case-sensitive comparison therefore matched NOTHING for every real
   -- visitor: dossier_payload('emacross') returned units=[] and the page 404'd — all ten
   -- dossiers, on every URL the site itself advertises.
   --
   -- Lowercasing in the application instead would not do: the mapping lowercase ->
   -- camelCase is not derivable (TEMAcross vs KeltnerBreak vs ORB), so the join has to
   -- happen where the stored spelling lives. Both predicates below need it — the
   -- max(dataset_version) sub-select filters on `base` independently, and a
   -- case-sensitive sub-select would return NULL and eliminate every row through the
   -- coalesce even with the main predicate fixed.
   where pg_catalog.lower(v.base) = pg_catalog.lower(p_base)
     and v.published_at is not null
     and v.published_at >= c_cutoff
     -- One dataset at a time, always. Three datasets coexist (data_20260710,
     -- data_20260729, data_20260802) and a page mixing them would put figures measured
     -- on different data side by side under one heading. With no dataset asked for, the
     -- freshest one this base has. This replaces latestDataset()/onlyDataset(), which
     -- did the same thing in the page — moved into the gate so it cannot be skipped.
     and v.dataset_version = pg_catalog.coalesce(
           p_dataset,
           (select pg_catalog.max(w.dataset_version)
              from public.engine_verdicts w
             -- Same case-insensitive rule as the main predicate above, and for the same
             -- reason: this sub-select filters on `base` on its own.
             where pg_catalog.lower(w.base) = pg_catalog.lower(p_base)
               and w.published_at is not null
               and w.published_at >= c_cutoff)
         );

  return pg_catalog.jsonb_build_object(
    'access', case when v_paid then 'full' else 'teaser' end,
    'units', v_units
  );
end;
$$;

comment on function public.dossier_payload(text, text) is
  'Cockpit dossier payload. Decides entitlement itself from auth.uid() and never '
  'from an argument. Returns the teaser allow-list for anon, for a free account and '
  'for a service-role caller (auth.uid() is NULL -> fail closed); returns the recipe '
  'only for status=active with a live period. p_base is matched case-insensitively: the '
  'corpus is camelCase and every URL the site produces is lowercase. '
  'See spec 2026-08-17 §4.2.';

-- Postgres grants EXECUTE to PUBLIC by default on every new function — the same
-- default-open trap the table migrations have been closing since July. Revoke first,
-- then grant the two roles that must call it.
revoke all on function public.dossier_payload(text, text) from public;
grant execute on function public.dossier_payload(text, text) to anon, authenticated;
