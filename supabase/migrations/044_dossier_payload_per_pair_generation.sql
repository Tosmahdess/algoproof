-- 044_dossier_payload_per_pair_generation.sql
--
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- THE LAST READER THAT STILL RESOLVED A GENERATION PER BASE.
--
-- Migration 043 (applied 2026-09-04) corrected the four survivor-family RPCs, which took a
-- GLOBAL max(dataset_version): the first verdict of a new generation flipped every family
-- page to it and emptied the 29 pairs that had not been recomputed yet. The cockpit's own
-- half shipped the same day (algolab 1aae227) and passes p_dataset NULL so that fallback
-- actually fires.
--
-- `dossier_payload` was left out on purpose and recorded as a known defect (plan
-- 2026-09-04-cockpit-generation-par-paire.md §3.4, FUTURE_CHECKS.md). It has the same
-- defect at ONE GRANULARITY'S DISTANCE: its max is correlated on `base` but not on `tf`.
--
-- What that costs, concretely. The tour started 2026-09-04 republishes (base, tf) pairs one
-- at a time over about three weeks. The day EMAcross D1 lands under data_20260831:
--
--     max(dataset_version) where base = 'EMAcross'   ->  data_20260831
--     outer predicate: v.dataset_version = data_20260831
--     rows surviving:  D1 only.  H4, H1 and M30 are still on data_20260802 and vanish.
--
-- Measured today, before any 0831 verdict exists: dossier_payload('emacross') returns 7
-- units across D1/H1/H4/M30, all data_20260802. So the defect is currently INVISIBLE and
-- becomes visible on the first timeframe the tour republishes — there is no failure to
-- observe until then, which is exactly why it is being fixed now rather than when it bites.
--
-- ── The change ─────────────────────────────────────────────────────────────────────────
-- One predicate: `and w.tf = v.tf` inside the max sub-select. Everything else below is
-- byte-identical to the function that is live today, extracted mechanically from
-- 040_paid_status_single_source.sql (the CURRENT definition — NOT 032, which the plan named
-- and which 034 and then 040 have since superseded; 040 was verified applied in production
-- on 2026-09-04 by calling has_live_subscription, which answers instead of erroring).
-- Nothing was retyped by hand.
--
-- ── ⚠️ THIS MIGRATION HAS A FRONT HALF, AND THEY MUST SHIP TOGETHER ────────────────────
-- algolab web/app/(cockpit)/cockpit/dossier/[base]/page.tsx:57 reads
--
--     const frozen = freezeDate(dossier.units[0].dataset_version)
--
-- — the generation of the FIRST unit, and nothing else. That is safe only while a dossier
-- holds one generation, which is precisely the invariant this migration removes. Applied
-- alone, it trades an amputated dossier for a dossier that NAMES ONE OF TWO generations,
-- which D-ALG-GEN-3 records as worse than saying nothing. The front half is one line:
--
--     const frozen = freezeNotice(dossier.units.map((u) => u.dataset_version))
--
-- `freezeNotice` already exists (algolab web/components/pilot/HeroBlock.tsx), already
-- renders the single-generation case unchanged, and already names every generation present
-- when there are several. Ship it first or in the same window — it degrades harmlessly
-- while this migration is not yet applied, so front-first is the safe order.
--
-- ── Verification, after applying ───────────────────────────────────────────────────────
--   -- the predicate is in the live function:
--   select prosrc like '%w.tf = v.tf%' from pg_proc where proname = 'dossier_payload';
--   -- and the free sample still returns all four timeframes:
--   select jsonb_array_length(public.dossier_payload('emacross') -> 'units');   -- 7 today
--   -- once the tour has republished one timeframe of a base, that base's dossier must show
--   -- BOTH generations rather than only the new one:
--   select distinct u ->> 'tf', u ->> 'dataset_version'
--     from jsonb_array_elements(public.dossier_payload('<base>') -> 'units') u;
--
-- Rollback: re-run 040_paid_status_single_source.sql, which restores the per-base max.

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
    v_paid := public.has_live_subscription(v_uid);
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
     -- ONE DATASET PER (base, tf), NOT ONE PER BASE — migration 044, 2026-09-04.
     --
     -- This sub-select used to take the freshest generation THIS BASE has, anywhere.
     -- During a tour that republishes one (base, tf) pair at a time, the first timeframe
     -- to land under data_20260831 raised the max for the whole base, and the outer
     -- predicate then dropped every timeframe still on data_20260802: a dossier that
     -- had D1, H4, H1 and M30 would have shown ONLY D1, for the weeks it took the other
     -- three to follow — amputated, with nothing on the page saying so.
     --
     -- It is the same defect migration 043 fixed for the survivor families, at one
     -- granularity's distance, and the fix is the same one: correlate the sub-select on
     -- the outer row's timeframe so a pair yields to its OWN newer generation and to
     -- nothing else. `w.base` needs no extra predicate — it is already pinned to
     -- p_base, which the outer row equals.
     --
     -- What this DELIBERATELY gives up: the old comment argued for one dataset per page,
     -- so figures measured on different data are never put side by side under one
     -- heading. That argument was right and it does not survive contact with a tour that
     -- takes three weeks — the alternative it defends is not "one coherent page" but "a
     -- page missing three of its four timeframes". The honesty debt moves to the page,
     -- which now MUST name every generation it shows: `dossier_payload` returns
     -- `dataset_version` per unit precisely so it can. See the front half below.
     and v.dataset_version = coalesce(
           p_dataset,
           (select pg_catalog.max(w.dataset_version)
              from public.engine_verdicts w
             -- Same case-insensitive rule as the main predicate above, and for the same
             -- reason: this sub-select filters on `base` on its own.
             where pg_catalog.lower(w.base) = pg_catalog.lower(p_base)
               -- THE WHOLE CHANGE OF MIGRATION 044. Correlated on the outer row's
               -- timeframe; without it the max is per base and amputates the dossier.
               and w.tf = v.tf
               and w.published_at is not null
               and w.published_at >= c_cutoff)
         );

  return pg_catalog.jsonb_build_object(
    'access', case when v_paid then 'full' else 'teaser' end,
    'units', v_units
  );
end;
$$;
