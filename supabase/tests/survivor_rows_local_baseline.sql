-- survivor_rows_local_baseline.sql
--
-- LOCAL ONLY. NEVER RUN AGAINST SUPABASE: it creates roles and tables that production
-- already has, and fills engine_verdicts with synthetic units.
--
-- A throwaway PostgreSQL (15+) that stands in for production closely enough to execute
-- 037..049 and the survivor-rows migrations 050..052 for real:
--   * the roles the migrations grant to (anon, authenticated, engine_telemetry);
--   * auth.uid() reading request.jwt.claims like Supabase's;
--   * subscriptions (has_live_subscription) and engine_verdicts with the columns the
--     engine writes (backtests_massive/telemetry.py _VERDICT_COLS);
--   * synthetic units whose survivors have the exact shapes publisher._entry emits
--     (sweep entries, ladder entries with k/wf, MARGINAL with per_asset null, exit null,
--     string params, a second generation of one pair), plus one float written "2.0".
--
-- Used by supabase/tests/survivor_rows_gate.py --local, which applies this file, then
-- 037 038 039 040 043 044 047 048 049 (as production has them), then runs the gate.

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'engine_telemetry') then create role engine_telemetry nologin; end if;
end
$roles$;

create schema if not exists auth;
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated, engine_telemetry;

create table if not exists public.subscriptions (
  user_id uuid not null,
  status text not null,
  current_period_end timestamptz
);

create table if not exists public.engine_verdicts (
  base text not null,
  tf text not null,
  dataset_version text not null,
  kmax integer not null,
  n_behaviors bigint,
  n_go integer,
  n_marginal integer,
  n_no_go integer,
  top_finalists jsonb,
  survivors jsonb,
  selection_control jsonb,
  report_checksum text,
  report_path text,
  published_at timestamptz,
  per_asset jsonb,
  dd_cluster_pct double precision,
  tuw_max_days double precision,
  tuw_censored boolean,
  judge_version integer,
  taker_fee double precision,
  slippage double precision,
  search_mode text,
  host text,
  primary key (base, tf, dataset_version, kmax)
);
grant insert, select, update on public.engine_verdicts to engine_telemetry;
revoke all on public.engine_verdicts from anon, authenticated;

-- A paying member, for the full arms of the RPCs.
insert into public.subscriptions values
  ('00000000-0000-0000-0000-00000000beef', 'active', null);

-- Synthetic units. The entry is built key by key like publisher._entry; floats go through
-- float8 -> jsonb so they print like Python's repr (no trailing zeros).
create or replace function pg_temp.fixture_entry(p_i integer, p_seed integer, p_ladder boolean)
returns jsonb language sql as $$
  select jsonb_build_object(
           'verdict', case when p_i % 5 = 0 then 'GO_PAPER' else 'MARGINAL' end,
           'reasons', case when p_i % 5 = 0 then '[]'::jsonb
                           else jsonb_build_array('wf_oos 0.' || (70 + p_i % 20) || '<1.15') end,
           'pf', (1 + ((p_i * 7919 + p_seed) % 1000) / 997.0)::float8,
           'dd', (1 + ((p_i * 104729 + p_seed) % 500) / 17.0)::float8,
           'n_trades', 10 + (p_i * 31 + p_seed) % 90,
           'params', jsonb_build_object('fast', 5 + (p_i + p_seed) % 7, 'slow', 20 + p_i % 11,
                                        'session_anchor', case when p_i % 4 = 0 then 'London' else 'NY' end),
           'filters', case when p_i % 3 = 0 then '{}'::jsonb
                           else jsonb_build_object('adx', jsonb_build_object('period', 14, 'min', 20 + p_i % 3),
                                                   'vol', case when p_i % 6 = 1 then '{}'::jsonb
                                                               else jsonb_build_object('mult', 1.5) end) end,
           'exit', case when p_i % 13 = 0 then 'null'::jsonb
                        else jsonb_build_object('sl_atr', (1.5 + (p_i % 4) * 0.5)::float8, 'tp_rr', 2) end,
           'per_asset', case when p_i % 5 = 0
                             then jsonb_build_object('BTC/USDT', jsonb_build_object('qualified', true, 'pf', 1.31, 'n', 40, 'dd', 12.5))
                             else 'null'::jsonb end,
           'window', jsonb_build_object('start', '2023-01-01T00:00:00Z', 'end', '2026-04-01T00:00:00Z'))
         || case when p_ladder
                 then jsonb_build_object('k', 4, 'wf', case when p_i % 7 = 0 then null
                                                            else (0.8 + (p_i % 9) / 10.0)::float8 end)
                 else '{}'::jsonb end;
$$;

insert into public.engine_verdicts (
  base, tf, dataset_version, kmax, n_behaviors, n_go, n_marginal, n_no_go,
  top_finalists, survivors, selection_control, report_checksum, report_path, published_at,
  per_asset, taker_fee, slippage, search_mode, host)
select u.base, u.tf, u.dv, u.kmax, 100000, n.n_go, n.n_marginal, 500,
       '[]'::jsonb, s.survivors, null, 'chk_' || u.seed, '/r/' || u.seed, u.published_at,
       jsonb_build_object('BTC/USDT', jsonb_build_object('qualified', true, 'pf', 1.2, 'n', 55)),
       0.0005, 0.0002, case when u.ladder then 'ladder' else 'sweep' end, 'box'
  from (values
    ('EMAcross',     'D1',  'data_20260802', 2, 40, 11, false, timestamptz '2026-08-20 10:00+00'),
    ('EMAcross',     'D1',  'data_20260831', 2, 35, 12, false, timestamptz '2026-09-10 10:00+00'),
    ('EMAcross',     'H4',  'data_20260802', 3, 30, 13, false, timestamptz '2026-08-21 10:00+00'),
    ('EMAcross',     'H4',  'data_20260802', 2, 18, 14, false, timestamptz '2026-08-21 11:00+00'),
    ('HMAcross',     'H1',  'data_20260831', 4, 20, 15, true,  timestamptz '2026-09-12 10:00+00'),
    ('ORB',          'M30', 'data_20260831', 2, 25, 16, false, timestamptz '2026-09-13 10:00+00'),
    ('ORB+MI',       'M30', 'data_20260831', 2, 12, 17, false, timestamptz '2026-09-13 12:00+00'),
    ('KeltnerBreak', 'D1',  'data_20260802', 2,  9, 18, false, timestamptz '2026-08-01 10:00+00')
  ) as u(base, tf, dv, kmax, n, seed, ladder, published_at)
  cross join lateral (
    select jsonb_agg(pg_temp.fixture_entry(i, u.seed, u.ladder) order by i) as survivors
      from generate_series(1, u.n) i
  ) s
  cross join lateral (
    select count(*) filter (where e ->> 'verdict' = 'GO_PAPER')::integer as n_go,
           count(*) filter (where e ->> 'verdict' = 'MARGINAL')::integer as n_marginal
      from jsonb_array_elements(s.survivors) e
  ) n;

-- One float written the way Python writes an integral float: "2.0". jsonb keeps the scale,
-- double precision cannot. The gate must report it as a TEXT difference with EQUAL values,
-- never as a failure.
update public.engine_verdicts
   set survivors = jsonb_set(survivors, '{0,pf}', '2.0'::jsonb)
 where base = 'ORB' and tf = 'M30';
