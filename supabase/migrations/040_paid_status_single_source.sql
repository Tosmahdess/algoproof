-- 040_paid_status_single_source.sql
--
-- One answer to "does this account currently pay?", instead of three.
--
-- The question had three different answers depending on which reader you asked:
--   * the lab API      (api/entitlement_status.py) -> active, trialing, past_due
--   * algoproof        (src/lib/entitlement.ts)    -> active, trialing
--   * these SQL gates                              -> active only
-- so a member whose renewal was failing kept the lab, lost the dossiers, and read
-- "free" on their account page: three products, one customer, and no sentence
-- that could describe it truthfully in the terms.
--
-- The rule, decided 2026-09-03: a failing renewal KEEPS its access for as long as
-- Stripe is retrying. `past_due` means a card expired, not a refusal to pay, and
-- the retry window is short and bounded. Cutting a paying member off the morning
-- their card expires is punitive, generates support, and loses people who would
-- have fixed it in one click. `unpaid` and `canceled` end access: that is where
-- the line belongs, and Stripe is the one that draws it.
--
-- The argument this overrules, recorded because it is a real one: the dossier
-- gate was `active` only ON PURPOSE (spec 4.6) -- compute cannot be stolen, a
-- recipe once read can. True, but it protects against a deliberate actor, and a
-- deliberate actor does not need a failing card: one paid month copies
-- everything. The gate never stopped them; it only punished the honest member.
--
-- Generated mechanically from the CURRENT definitions in this folder (034, 037,
-- 039). Every line below is byte-identical to the function that is live today
-- except its subscription predicate, which now calls the helper. Nothing was
-- retyped by hand.
--
-- Verification, after applying:
--   select public.has_live_subscription(id) from auth.users limit 5;   -- runs
--   select prosrc like '%has_live_subscription%' from pg_proc
--    where proname in ('dossier_payload','survivor_family_detail',
--                      'survivor_family_all','survivor_lab_preset');   -- all true

create or replace function public.has_live_subscription(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $helper$
  select pg_catalog.count(*) > 0
    from public.subscriptions s
   where s.user_id = p_uid
     and s.status in ('active', 'trialing', 'past_due')
     and (s.current_period_end is null or s.current_period_end > pg_catalog.now());
$helper$;

comment on function public.has_live_subscription(uuid) is
  'Single source for paid access in SQL. Mirrors api/entitlement_status.py PAID_STATUSES and web/lib/entitlement.ts. A failing renewal (past_due) keeps access while Stripe retries; unpaid and canceled do not.';


-- ---------------------------------------------------------------------------
-- public.dossier_payload (from 034_dossier_payload_n_no_go.sql, shape A)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- public.survivor_family_detail (from 037_survivor_family_index.sql, shape B)
-- ---------------------------------------------------------------------------

create or replace function public.survivor_family_detail(
  p_family_id text,
  p_dataset text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_free_sample constant text := 'EMAcross';
  v_uid uuid := auth.uid();
  v_access text := 'teaser';
  v_strategy text;
  v_summary jsonb;
  v_full_variants jsonb := '[]'::jsonb;
begin
  -- 036 computed the signature of the whole corpus and only then kept one family, so
  -- every family page cost the same 2.55 s, including a page for a family that does
  -- not exist. The family_id index makes this read only the family asked for.
  with selected as (
    select m.*,
           pg_catalog.row_number() over (
             partition by m.family_id
             order by m.eligible desc,
                      m.sample_sufficient desc,
                      m.pf desc nulls last,
                      m.dd asc nulls last,
                      m.n_trades desc,
                      m.tf,
                      m.ordinality,
                      m.kmax
           ) as representative_rank
      from public.survivor_family_member m
     where m.family_id = p_family_id
       and m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and m.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.survivor_family_member latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
         )
       )
  )
  select pg_catalog.min(base),
         pg_catalog.jsonb_build_object(
           'id', p_family_id,
           'strategy', pg_catalog.min(base),
           'name', pg_catalog.min(base) || pg_catalog.min(name_suffix),
           'robustness', case
             when pg_catalog.count(distinct tf) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct tf) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end,
           'timeframes', pg_catalog.jsonb_agg(distinct tf order by tf),
           'filter_keys', pg_catalog.min(filter_keys_txt)::jsonb,
           'exit_keys', pg_catalog.min(exit_keys_txt)::jsonb,
           'survivor_count', pg_catalog.count(*)::integer,
           'isolated', pg_catalog.count(*) = 1,
           'representative', pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max(pf) filter (where representative_rank = 1),
             'dd', pg_catalog.max(dd) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max(n_trades) filter (where representative_rank = 1)
           )
         ),
         pg_catalog.jsonb_agg(
           pg_catalog.jsonb_build_object(
             'survivor_id', survivor_id,
             'timeframe', tf,
             'eligible', eligible,
             'sample_sufficient', sample_sufficient,
             'pf', pf,
             'dd', dd,
             'n_trades', n_trades,
             'params', coalesce(recipe -> 'params', '{}'::jsonb),
             'filters', coalesce(recipe -> 'filters', '{}'::jsonb),
             'exit', coalesce(recipe -> 'exit', '{}'::jsonb)
           )
           order by tf,
                    eligible desc,
                    sample_sufficient desc,
                    pf desc nulls last,
                    dd asc nulls last,
                    n_trades desc,
                    ordinality,
                    kmax
         )
    into v_strategy, v_summary, v_full_variants
    from selected;

  if v_summary is null then
    return null;
  end if;

  if pg_catalog.lower(v_strategy) = pg_catalog.lower(c_free_sample) then
    v_access := 'full';
  elsif v_uid is not null and public.has_live_subscription(v_uid) then
    v_access := 'full';
  end if;

  return pg_catalog.jsonb_build_object(
    'access', v_access,
    'family', v_summary,
    'variants', case when v_access = 'full' then v_full_variants else '[]'::jsonb end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- public.survivor_family_all (from 037_survivor_family_index.sql, shape B)
-- ---------------------------------------------------------------------------

create or replace function public.survivor_family_all(
  p_dataset text default null,
  p_strategy text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_access text := 'teaser';
  v_families jsonb;
begin
  if v_uid is not null and public.has_live_subscription(v_uid) then
    v_access := 'full';
  end if;

  if v_access = 'teaser' then
    return pg_catalog.jsonb_build_object(
      'access', v_access,
      'families', coalesce(
        (
          select pg_catalog.jsonb_agg(f)
            from pg_catalog.jsonb_array_elements(
                   coalesce(public.survivor_family_catalog(p_dataset) -> 'families',
                            '[]'::jsonb)) f
           where p_strategy is null
              or pg_catalog.lower(f ->> 'strategy') = pg_catalog.lower(p_strategy)
        ),
        '[]'::jsonb)
    );
  end if;

  with corpus as (
    select m.*
      from public.survivor_family_member m
     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and (p_strategy is null
            or pg_catalog.lower(m.base) = pg_catalog.lower(p_strategy))
       and m.dataset_version = coalesce(
         p_dataset,
         (
           select pg_catalog.max(latest.dataset_version)
             from public.survivor_family_member latest
            where latest.published_at is not null
              and latest.published_at >= '2026-08-12T19:38:00Z'::timestamptz
         )
       )
  ), ranked as (
    select *,
           pg_catalog.row_number() over (
             partition by family_id
             order by eligible desc, sample_sufficient desc,
                      pf desc nulls last, dd asc nulls last, n_trades desc,
                      tf, ordinality, kmax
           ) as representative_rank
      from corpus
  ), grouped as (
    select family_id,
           pg_catalog.min(base) as strategy,
           pg_catalog.min(filter_keys_txt) as filter_keys_txt,
           pg_catalog.min(exit_keys_txt) as exit_keys_txt,
           pg_catalog.min(name_suffix) as name_suffix,
           pg_catalog.count(*)::integer as survivor_count,
           pg_catalog.count(*) = 1 as isolated,
           case
             when pg_catalog.count(distinct tf) filter (where eligible) >= 2
               then 'multi_horizon'
             when pg_catalog.count(distinct tf) filter (where eligible) = 1
               then 'single_horizon'
             else 'probation'
           end as robustness,
           pg_catalog.jsonb_agg(distinct tf order by tf) as timeframes,
           pg_catalog.jsonb_build_object(
             'pf', pg_catalog.max(pf) filter (where representative_rank = 1),
             'dd', pg_catalog.max(dd) filter (where representative_rank = 1),
             'n_trades', pg_catalog.max(n_trades) filter (where representative_rank = 1)
           ) as representative,
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'survivor_id', survivor_id,
               'timeframe', tf,
               'eligible', eligible,
               'sample_sufficient', sample_sufficient,
               'pf', pf,
               'dd', dd,
               'n_trades', n_trades,
               'params', coalesce(recipe -> 'params', '{}'::jsonb),
               'filters', coalesce(recipe -> 'filters', '{}'::jsonb),
               'exit', coalesce(recipe -> 'exit', '{}'::jsonb)
             )
             order by tf, eligible desc, sample_sufficient desc,
                      pf desc nulls last, dd asc nulls last, n_trades desc,
                      ordinality, kmax
           ) as variants
      from ranked
     group by family_id
  )
  select coalesce(
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'id', family_id,
               'strategy', strategy,
               'name', strategy || name_suffix,
               'robustness', robustness,
               'timeframes', timeframes,
               'filter_keys', filter_keys_txt::jsonb,
               'exit_keys', exit_keys_txt::jsonb,
               'survivor_count', survivor_count,
               'isolated', isolated,
               'representative', representative,
               'variants', variants
             )
             order by strategy, family_id
           ),
           '[]'::jsonb
         )
    into v_families
    from grouped;

  return pg_catalog.jsonb_build_object('access', v_access, 'families', v_families);
end;
$$;

-- ---------------------------------------------------------------------------
-- public.survivor_lab_preset (from 039_survivor_lab_preset.sql, shape C)
-- ---------------------------------------------------------------------------

create or replace function public.survivor_lab_preset(p_survivor_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.survivor_family_member%rowtype;
  v_unit jsonb := '{}'::jsonb;
  v_asset_metrics jsonb;
  v_metric_scope text;
begin
  if p_survivor_id is null
     or p_survivor_id !~ '^surv_[0-9a-f]{16}$' then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  select m.*
    into v_member
    from public.survivor_family_member m
   where m.survivor_id = p_survivor_id
     and m.published_at is not null
   order by m.published_at desc, m.dataset_version desc,
            m.base, m.tf, m.kmax, m.ordinality
   limit 1;

  if not found then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  if v_uid is null or not public.has_live_subscription(v_uid) then
    -- Keep this response deliberately constant. In particular, do not construct a
    -- recipe and remove it afterward: protected bytes must never enter the result.
    return pg_catalog.jsonb_build_object('access', 'locked');
  end if;

  select pg_catalog.to_jsonb(e)
    into v_unit
    from public.engine_verdicts e
   where e.base = v_member.base
     and e.tf = v_member.tf
     and e.dataset_version = v_member.dataset_version
     and e.kmax = v_member.kmax
   limit 1;

  v_unit := coalesce(v_unit, '{}'::jsonb);

  if pg_catalog.jsonb_typeof(v_member.recipe -> 'per_asset') = 'object' then
    v_asset_metrics := v_member.recipe -> 'per_asset';
    v_metric_scope := 'survivor';
  else
    v_asset_metrics := case
      when pg_catalog.jsonb_typeof(v_unit -> 'per_asset') = 'object'
        then v_unit -> 'per_asset'
      else null
    end;
    v_metric_scope := 'unit_champion';
  end if;

  return pg_catalog.jsonb_build_object(
    'access', 'full',
    'survivor_id', v_member.survivor_id,
    'strategy', v_member.base,
    'timeframe', v_member.tf,
    'dataset_version', v_member.dataset_version,
    'recipe', v_member.recipe,
    'asset_metrics', v_asset_metrics,
    'metric_scope', v_metric_scope,
    'taker_fee', case
      when pg_catalog.jsonb_typeof(v_unit -> 'taker_fee') = 'number'
        then (v_unit ->> 'taker_fee')::numeric
      else null
    end,
    'slippage', case
      when pg_catalog.jsonb_typeof(v_unit -> 'slippage') = 'number'
        then (v_unit ->> 'slippage')::numeric
      else null
    end
  );
end;
$$;
