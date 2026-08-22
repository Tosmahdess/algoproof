-- 034_dossier_payload_n_no_go.sql
--
-- Adds `n_no_go` to the dossier payload so the judged count is computable.
--
-- WHY
-- `dossier_payload` (032) returned n_behaviors, n_go and n_marginal, and nothing
-- else about the verdict counts. The lab's /cockpit/dossier/[base] therefore
-- summed n_behaviors and labelled it « réglages jugés ». Those are different
-- quantities: n_behaviors is everything the engine SWEPT, while only the top
-- 20 000 behaviours per unit are judged (top-K finalize, 2026-08-06). On an older
-- unit the two coincide, which is what kept the difference invisible until a
-- 5,7 M-behaviour unit landed. Until this ships, that page honestly says
-- « balayés » (algolab, 2026-08-21) rather than claiming a number it cannot back.
--
-- This is a pure addition: one more key in the same jsonb object, on the paid and
-- teaser paths alike, since a count of rejected settings reveals nothing about any
-- individual recipe. The rest of the function is copied from 032 unchanged, because
-- Postgres has no way to amend a function body in place.
--
-- HOW TO APPLY (Supabase SQL editor, and it has to be you: DDL is not scripted)
--   1. Paste this whole file. Beware the known editor trap: a single long paste can
--      silently swallow characters. Paste, then re-read the first and last lines
--      before running.
--   2. Run it. A syntax error means NOTHING ran (the statement is parsed whole).
--   3. Verify:  select public.dossier_payload('emacross', null) -> 'units' -> 0;
--      the object must now carry n_no_go beside n_go and n_marginal.
--   4. Tell me, and I switch the lab's dossier label from « balayés » back to
--      « jugés » with the real arithmetic.

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
  -- THE FREE SAMPLE. A PRODUCT RULE, NOT A HOLE IN THE GATE.
  --
  -- One base is a permanent free sample: its dossier is complete and open to everyone,
  -- before the paywall flips and after it. That is the whole point of it. This site sells
  -- the CONTENT of a proof, so a reader has to be able to read one entire proof — the
  -- parameters, the filters, the exit, the cause, the shape of the whole thing — and judge
  -- the FORMAT for themselves before paying for the other nine. A locked corpus with no
  -- readable specimen is "trust me", which is the one thing this site exists to refuse.
  --
  -- The old page implemented this implicitly, by only ever existing for this one base. When
  -- the dossier became /cockpit/dossier/[base] over the whole corpus, the rule was left
  -- behind and the gate started treating all ten bases identically — so the sample would
  -- have been withdrawn from the public the day this migration applied, while /membre still
  -- advertised it. Nothing published is withdrawn now; the other nine become teasers, which
  -- costs no reader anything, because until the case-insensitive fix above they resolved to
  -- 404 for everybody.
  --
  -- WHY A CONSTANT AND NOT A LITERAL IN THE PREDICATE. Which base plays this part is an
  -- OPEN QUESTION, deferred to a later lot: EMAcross is the incumbent because /membre has
  -- always named it, and its corpus is being re-swept as this ships. The value is therefore
  -- expected to change. Naming it once, here, is what makes that a one-line edit instead of
  -- a hunt through the predicates.
  c_free_sample constant text := 'EMAcross';
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

  -- The second way to be entitled, and the only one that does not involve an identity.
  -- Scoped to THIS CALL's p_base, never to a row: one invocation asks about one base, every
  -- row the select below returns is that base, so a request for the free sample cannot
  -- widen anything past the sample itself. Same case-insensitive comparison as the row
  -- predicate below, and for the same reason — the URL is `/cockpit/dossier/emacross` and
  -- the corpus says `EMAcross`.
  if pg_catalog.lower(p_base) = pg_catalog.lower(c_free_sample) then
    v_paid := true;
  end if;

  select coalesce(
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
               -- 034: the payload carried n_go and n_marginal but never n_no_go, so no
               -- consumer could compute judged = n_go + n_marginal + n_no_go. The lab's
               -- dossier page printed n_behaviors under the label "réglages jugés"
               -- instead, and n_behaviors is the SWEPT corpus: since the top-K finalize
               -- of 2026-08-06 only the top 20 000 per unit are judged, so on a large
               -- unit the public figure was an order of magnitude too high. Migration
               -- 030 already computes n_judged this exact way for the public view.
               'n_no_go', v.n_no_go,
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
                 select coalesce(
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
                                       coalesce(e -> 'reasons', '[]'::jsonb)) > 0
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
                          coalesce(v.survivors, '[]'::jsonb)) e
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
     and v.dataset_version = coalesce(
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
  'only for status=active with a live period — OR for the free-sample base, which is fully '
  'public to everyone by product rule (c_free_sample in the body). p_base is matched '
  'case-insensitively: the corpus is camelCase and every URL the site produces is '
  'lowercase. See spec 2026-08-17 §4.2.';

-- Postgres grants EXECUTE to PUBLIC by default on every new function — the same
-- default-open trap the table migrations have been closing since July. Revoke first,
-- then grant the two roles that must call it.
revoke all on function public.dossier_payload(text, text) from public;
grant execute on function public.dossier_payload(text, text) to anon, authenticated;
