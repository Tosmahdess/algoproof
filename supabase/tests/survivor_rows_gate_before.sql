-- survivor_rows_gate_before.sql -- first half of the survivor-rows gate.
--
-- NOT RUN ON ITS OWN. supabase/tests/survivor_rows_gate.py assembles
--   begin; [050] [051] THIS FILE [052] survivor_rows_gate_after.sql; rollback;
-- and pipes it to psql, so every write below is rolled back. It runs after 050/051 and
-- before 052: it records the M1/M2 checks and snapshots every RPC output the read switch
-- must preserve.
--
-- Result rows go to gate_result (PASS / FAIL / WARN). The after half prints them and fails
-- the run if any FAIL exists.

create temp table gate_result (
  n      serial,
  phase  text,
  label  text,
  status text check (status in ('PASS', 'FAIL', 'WARN', 'INFO')),
  detail text
);

create or replace function pg_temp.gate(p_phase text, p_label text, p_ok boolean, p_detail text default '',
                                        p_soft boolean default false)
returns void language sql as $$
  insert into gate_result (phase, label, status, detail)
  values (p_phase, p_label,
          case when p_ok then 'PASS' when p_soft then 'WARN' else 'FAIL' end,
          coalesce(p_detail, ''));
$$;

create or replace function pg_temp.info(p_phase text, p_label text, p_detail text)
returns void language sql as $$
  insert into gate_result (phase, label, status, detail) values (p_phase, p_label, 'INFO', p_detail);
$$;

-- The rows-mode predicate, the one 052 uses.
create or replace function pg_temp.is_rows(v public.engine_verdicts)
returns boolean language sql stable as $$
  select v.survivors_storage is not distinct from 'rows' and v.current_publish_seq is not null;
$$;

-- Same elements with the same multiplicities, compared as jsonb VALUES (2.0 = 2): EXCEPT ALL
-- uses jsonb's btree/hash semantics, which are numeric-aware.
create or replace function pg_temp.same_multiset(a jsonb, b jsonb)
returns boolean language sql immutable as $$
  select jsonb_array_length(coalesce(a, '[]'::jsonb)) = jsonb_array_length(coalesce(b, '[]'::jsonb))
     and not exists (select x from jsonb_array_elements(coalesce(a, '[]'::jsonb)) x
                     except all
                     select y from jsonb_array_elements(coalesce(b, '[]'::jsonb)) y);
$$;

-- Removes survivor_id from every variant, recursively enough for family payloads: the one
-- field the switch is ALLOWED to change (positional id -> public HMAC id).
create or replace function pg_temp.strip_ids(p jsonb)
returns jsonb language sql immutable as $$
  select case jsonb_typeof(p)
    when 'object' then (select coalesce(jsonb_object_agg(key, pg_temp.strip_ids(value)), '{}'::jsonb)
                          from jsonb_each(p) where key <> 'survivor_id')
    when 'array' then (select coalesce(jsonb_agg(pg_temp.strip_ids(value) order by ord), '[]'::jsonb)
                         from jsonb_array_elements(p) with ordinality as a(value, ord))
    else p end;
$$;

-- Session identity for the RPCs: '' = anonymous, else a paying member's uid.
create or replace function pg_temp.as_user(p_uid text)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    case when coalesce(p_uid, '') = '' then ''
                         else jsonb_build_object('sub', p_uid)::text end, true);
$$;

select set_config('gate.paid_uid', coalesce(nullif(:'paid_uid', ''), ''), true);
select set_config('gate.as_writer', :'as_writer', true);
-- 'quick' samples the per-family and per-link calls (the gate holds 052's lock meanwhile).
select set_config('gate.sample', :'sample', true);

-- ---------------------------------------------------------------------------
-- A. M1 / M2 static checks, on the live objects.

select pg_temp.gate('M1', 'survivor_legacy_id() reproduces every 037 survivor_id',
                    count(*) filter (where public.survivor_legacy_id(m.base, m.tf, m.kmax, m.ordinality)
                                           <> m.survivor_id) = 0,
                    count(*) || ' member rows checked')
  from public.survivor_family_member m;

select pg_temp.gate('M1', 'anon/authenticated cannot read ' || t,
                    not has_table_privilege('anon', t, 'select')
                    and not has_table_privilege('authenticated', t, 'select')
                    and not has_table_privilege('anon', t, 'insert')
                    and not has_table_privilege('authenticated', t, 'insert'))
  from unnest(array['public.engine_verdict_survivor', 'public.survivor_id_legacy_map']) t;

select pg_temp.gate('M1', 'RLS enabled on ' || c.relname, c.relrowsecurity)
  from pg_class c
 where c.oid in ('public.engine_verdict_survivor'::regclass, 'public.survivor_id_legacy_map'::regclass);

select pg_temp.gate('M1', 'no policy on survivor_id_legacy_map', count(*) = 0)
  from pg_policies where schemaname = 'public' and tablename = 'survivor_id_legacy_map';

select pg_temp.gate('M1', 'the only policy on engine_verdict_survivor is the engine_telemetry writer',
                    count(*) = 1 and bool_and(roles = array['engine_telemetry']::name[]),
                    string_agg(policyname || ' ' || roles::text, '; '))
  from pg_policies where schemaname = 'public' and tablename = 'engine_verdict_survivor';

select pg_temp.gate('M1', 'engine_telemetry: exactly the writer privileges on engine_verdict_survivor',
                    has_table_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'insert')
                    and has_table_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'update')
                    and has_table_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'delete')
                    and not has_table_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'select')
                    and has_column_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'publish_seq', 'select')
                    and has_column_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'config_hash', 'select')
                    and has_column_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'params', 'select')
                    and not has_column_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'family_id', 'select')
                    and not has_column_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'signature', 'select')
                    and not has_table_privilege('engine_telemetry', 'public.survivor_id_legacy_map', 'select'))
 where exists (select 1 from pg_roles where rolname = 'engine_telemetry');

select pg_temp.gate('M1', 'engine_telemetry can move the header columns',
                    has_column_privilege('engine_telemetry', 'public.engine_verdicts', 'current_publish_seq', 'update')
                    and has_column_privilege('engine_telemetry', 'public.engine_verdicts', 'survivors_storage', 'update')
                    and has_column_privilege('engine_telemetry', 'public.engine_verdicts', 'report_checksum', 'select'))
 where exists (select 1 from pg_roles where rolname = 'engine_telemetry');

select pg_temp.gate('M1', 'trigger ' || x.tgname || ' present',
                    exists (select 1 from pg_trigger t where t.tgname = x.tgname and not t.tgisinternal))
  from (values ('engine_verdict_survivor_family'), ('engine_verdicts_survivor_rows_guard'),
               ('engine_verdicts_survivor_rows_demoted'), ('engine_verdicts_survivor_rows_deleted'),
               ('survivor_family_index_sync')) x(tgname);

select pg_temp.gate('M1', 'survivor_family_index_sync no longer fires on header-only updates',
                    pg_get_triggerdef(t.oid) like '%UPDATE OF base, tf, dataset_version, kmax, published_at, survivors ON%',
                    pg_get_triggerdef(t.oid))
  from pg_trigger t
 where t.tgname = 'survivor_family_index_sync' and t.tgrelid = 'public.engine_verdicts'::regclass;

select pg_temp.gate('M1', 'no RPC-callable new function',
                    count(*) = 0, string_agg(p.oid::regprocedure::text, ', '))
  from pg_proc p
 where p.proname in ('engine_verdict_survivor_family', 'engine_verdicts_survivor_rows_guard',
                     'survivor_legacy_id', 'engine_verdict_survivor_entry',
                     'survivor_id_legacy_map_rebuild')
   and p.pronamespace = 'public'::regnamespace
   and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'));

select pg_temp.gate('M1', 'extra_float_digits > 0 (float8 -> jsonb is shortest exact)',
                    current_setting('extra_float_digits')::int > 0,
                    'extra_float_digits = ' || current_setting('extra_float_digits'));

-- ---------------------------------------------------------------------------
-- B. Stand in for the engine on units that have NO child rows yet, exactly as
--    telemetry.insert_survivor_rows writes (same statements, same order, one unit at a
--    time), as engine_telemetry when as_writer = on. Units the engine already wrote are
--    left alone: their rows are what is being verified.
--    config_hash / survivor_id here are test stand-ins (md5), not the engine's HMAC.
--    data_window is filled from the entry's "window", as the engine is asked to.

create temp table gate_stage as
select v.base, v.tf, v.dataset_version, v.kmax,
       md5(concat_ws('|', v.base, v.tf, v.kmax, coalesce(e.recipe -> 'params', '{}'::jsonb)::text,
                     coalesce(e.recipe -> 'filters', '{}'::jsonb)::text,
                     coalesce(e.recipe -> 'exit', 'null'::jsonb)::text)) as config_hash,
       'surv_' || substr(md5('gate-hmac|' || concat_ws('|', v.base, v.tf, v.kmax,
                     coalesce(e.recipe -> 'params', '{}'::jsonb)::text,
                     coalesce(e.recipe -> 'filters', '{}'::jsonb)::text,
                     coalesce(e.recipe -> 'exit', 'null'::jsonb)::text)), 1, 16) as survivor_id,
       (e.ordinality - 1)::integer as position,
       coalesce(v.search_mode, 'sweep') as search_mode,
       e.recipe ->> 'verdict' as verdict,
       case when e.recipe ? 'reasons' then nullif(e.recipe -> 'reasons', 'null'::jsonb) else '[]'::jsonb end as reasons,
       (e.recipe ->> 'pf')::double precision as pf,
       (e.recipe ->> 'dd')::double precision as dd,
       (e.recipe ->> 'n_trades')::integer as n_trades,
       case when e.recipe ? 'params' then nullif(e.recipe -> 'params', 'null'::jsonb) else '{}'::jsonb end as params,
       case when e.recipe ? 'filters' then nullif(e.recipe -> 'filters', 'null'::jsonb) else '{}'::jsonb end as filters,
       case when e.recipe ? 'exit' then nullif(e.recipe -> 'exit', 'null'::jsonb) else '{}'::jsonb end as exit,
       nullif(e.recipe -> 'per_asset', 'null'::jsonb) as per_asset,
       (e.recipe ->> 'k')::integer as k,
       (e.recipe ->> 'wf')::double precision as wf,
       nullif(e.recipe -> 'window', 'null'::jsonb) as data_window,
       v.report_checksum
  from public.engine_verdicts v
  cross join lateral jsonb_array_elements(
         case when jsonb_typeof(v.survivors) = 'array' then v.survivors else '[]'::jsonb end)
         with ordinality as e(recipe, ordinality)
 where v.published_at is not null
   and not exists (select 1 from public.engine_verdict_survivor s
                    where s.base = v.base and s.tf = v.tf
                      and s.dataset_version = v.dataset_version and s.kmax = v.kmax);

do $emulate$
declare
  u record;
  v_seq bigint := coalesce((select max(current_publish_seq) from public.engine_verdicts), 0)
                  + (extract(epoch from clock_timestamp()) * 1000000)::bigint;
  v_as_writer boolean := current_setting('gate.as_writer', true) = 'on'
                         and exists (select 1 from pg_roles where rolname = 'engine_telemetry');
  v_n integer;
  v_ok integer := 0;
begin
  if v_as_writer then
    execute 'grant select on gate_stage to engine_telemetry';
  end if;

  for u in
    select base, tf, dataset_version, kmax, min(report_checksum) as report_checksum,
           count(*) as n, count(distinct config_hash) as n_distinct
      from gate_stage group by 1, 2, 3, 4 order by 1, 2, 3, 4
  loop
    if u.n <> u.n_distinct then
      -- publisher.survivor_rows raises on a duplicate recipe and writes nothing.
      perform pg_temp.gate('B', format('emulate %s %s %s k%s', u.base, u.tf, u.dataset_version, u.kmax),
                           false, format('%s entries, %s distinct recipes: the engine refuses this unit',
                                         u.n, u.n_distinct), true);
      continue;
    end if;
    v_seq := v_seq + 1;
    begin
      if v_as_writer then
        execute 'set local role engine_telemetry';
      end if;
      insert into public.engine_verdict_survivor (
        base, tf, dataset_version, kmax, config_hash, survivor_id, publish_seq, position,
        search_mode, verdict, reasons, pf, dd, n_trades, params, filters, exit, per_asset,
        k, wf, published_at, data_window)
      select g.base, g.tf, g.dataset_version, g.kmax, g.config_hash, g.survivor_id, v_seq, g.position,
             g.search_mode, g.verdict, g.reasons, g.pf, g.dd, g.n_trades, g.params, g.filters, g.exit,
             g.per_asset, g.k, g.wf, now(), g.data_window
        from gate_stage g
       where g.base = u.base and g.tf = u.tf and g.dataset_version = u.dataset_version and g.kmax = u.kmax
      on conflict (base, tf, dataset_version, kmax, config_hash) do update set
        survivor_id = excluded.survivor_id, publish_seq = excluded.publish_seq,
        position = excluded.position, search_mode = excluded.search_mode,
        verdict = excluded.verdict, reasons = excluded.reasons, pf = excluded.pf, dd = excluded.dd,
        n_trades = excluded.n_trades, params = excluded.params, filters = excluded.filters,
        exit = excluded.exit, per_asset = excluded.per_asset, k = excluded.k, wf = excluded.wf,
        published_at = excluded.published_at, data_window = excluded.data_window;

      update public.engine_verdicts
         set current_publish_seq = v_seq, survivors_storage = 'rows'
       where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax
         and report_checksum is not distinct from u.report_checksum;
      get diagnostics v_n = row_count;
      if v_n <> 1 then
        raise exception 'header update matched % rows', v_n;
      end if;

      delete from public.engine_verdict_survivor
       where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax
         and publish_seq <> v_seq;
      if v_as_writer then
        execute 'reset role';
      end if;
      v_ok := v_ok + 1;
    exception when others then
      -- The subtransaction rolled back, SET LOCAL ROLE included.
      perform pg_temp.gate('B', format('emulate %s %s %s k%s', u.base, u.tf, u.dataset_version, u.kmax),
                           false, sqlerrm);
    end;
  end loop;

  perform pg_temp.info('B', 'engine stand-in', format('%s units written%s', v_ok,
                       case when v_as_writer then ' as engine_telemetry' else ' as the current user' end));
end
$emulate$;

-- ---------------------------------------------------------------------------
-- C. Parity, per unit with authoritative rows (engine-written or stand-in): the child rows
--    describe the same list as the jsonb. The same checks, read-only, live in
--    survivor_rows_parity_live.sql for the engine's real rows.

create temp table gate_pairs as
select v.base, v.tf, v.dataset_version, v.kmax, e.ordinality, e.recipe as entry,
       s.config_hash, s.survivor_id, public.engine_verdict_survivor_entry(s) as rebuilt,
       s.params, s.filters, s.exit
  from public.engine_verdicts v
  cross join lateral jsonb_array_elements(
         case when jsonb_typeof(v.survivors) = 'array' then v.survivors else '[]'::jsonb end)
         with ordinality as e(recipe, ordinality)
  left join public.engine_verdict_survivor s
    on s.base = v.base and s.tf = v.tf and s.dataset_version = v.dataset_version
   and s.kmax = v.kmax and s.publish_seq = v.current_publish_seq
   and s.position = e.ordinality - 1
 where pg_temp.is_rows(v);

select pg_temp.gate('C', format('count(child) = jsonb_array_length(survivors) for %s %s %s k%s',
                                v.base, v.tf, v.dataset_version, v.kmax),
                    c.n = coalesce(jsonb_array_length(case when jsonb_typeof(v.survivors) = 'array'
                                                          then v.survivors end), 0)
                    or v.selection_control ->> 'survivors_status' = 'deferred_size',
                    format('%s rows, %s in jsonb, n_go+n_marginal=%s%s', c.n,
                           coalesce(jsonb_array_length(case when jsonb_typeof(v.survivors) = 'array'
                                                           then v.survivors end), 0),
                           coalesce(v.n_go, 0) + coalesce(v.n_marginal, 0),
                           case when v.selection_control ->> 'survivors_status' = 'deferred_size'
                                then ' (jsonb deferred by the 8 MB breaker)' else '' end))
  from public.engine_verdicts v
  cross join lateral (select count(*) as n from public.engine_verdict_survivor s
                       where s.base = v.base and s.tf = v.tf and s.dataset_version = v.dataset_version
                         and s.kmax = v.kmax and s.publish_seq = v.current_publish_seq) c
 where pg_temp.is_rows(v);

select pg_temp.gate('C', 'unit_published_at of every authoritative row = the unit''s published_at',
                    count(*) filter (where s.unit_published_at is distinct from v.published_at) = 0,
                    count(*) || ' rows')
  from public.engine_verdicts v
  join public.engine_verdict_survivor s
    on s.base = v.base and s.tf = v.tf and s.dataset_version = v.dataset_version
   and s.kmax = v.kmax and s.publish_seq = v.current_publish_seq
 where pg_temp.is_rows(v);

-- 050's invariant, which 052's unfiltered view relies on.
select pg_temp.gate('C', 'every child row belongs to a rows-mode unit at its current_publish_seq',
                    count(*) = 0, count(*) || ' stray rows')
  from public.engine_verdict_survivor s
  left join public.engine_verdicts v
    on v.base = s.base and v.tf = s.tf and v.dataset_version = s.dataset_version and v.kmax = s.kmax
 where v.base is null or not pg_temp.is_rows(v) or v.current_publish_seq <> s.publish_seq;

select pg_temp.gate('C', 'every jsonb entry has a child row at position = ordinality - 1',
                    count(*) filter (where config_hash is null) = 0,
                    count(*) filter (where config_hash is null) || ' of ' || count(*) || ' missing')
  from gate_pairs;

select pg_temp.gate('C', 'recipe (params/filters/exit) identical at every position',
                    count(*) filter (where md5(jsonb_build_object(
                                              'params', coalesce(entry -> 'params', '{}'::jsonb),
                                              'filters', coalesce(entry -> 'filters', '{}'::jsonb),
                                              'exit', coalesce(nullif(entry -> 'exit', 'null'::jsonb), '{}'::jsonb))::text)
                                         <> md5(jsonb_build_object(
                                              'params', coalesce(params, '{}'::jsonb),
                                              'filters', coalesce(filters, '{}'::jsonb),
                                              'exit', coalesce(nullif(exit, 'null'::jsonb), '{}'::jsonb))::text)) = 0,
                    count(*) || ' positions')
  from gate_pairs where config_hash is not null;

select pg_temp.gate('C', 'rebuilt entry equals the jsonb entry as a VALUE (jsonb =)',
                    count(*) filter (where rebuilt <> entry) = 0,
                    count(*) filter (where rebuilt <> entry) || ' of ' || count(*) || ' differ; first: '
                    || coalesce(min(case when rebuilt <> entry then entry::text || ' VS ' || rebuilt::text end), '-'))
  from gate_pairs where config_hash is not null;

select pg_temp.gate('C', 'rebuilt entry equals the jsonb entry as TEXT (md5 order preserved)',
                    count(*) filter (where rebuilt::text <> entry::text) = 0,
                    count(*) filter (where rebuilt::text <> entry::text) || ' of ' || count(*)
                    || ' differ in text only (numeric scale, e.g. 2.0 vs 2): dossier order moves for those',
                    true)
  from gate_pairs where config_hash is not null and rebuilt = entry;

-- ---------------------------------------------------------------------------
-- D. The legacy map.

create temp table gate_map_report as select public.survivor_id_legacy_map_rebuild() as r;

select pg_temp.info('D', 'survivor_id_legacy_map_rebuild()', r::text) from gate_map_report;
select pg_temp.gate('D', 'legacy map: no recipe mismatch, no hole',
                    (r ->> 'recipe_mismatch')::int = 0 and (r ->> 'no_row_at_position')::int = 0, r::text)
  from gate_map_report;

select pg_temp.gate('D', 'every mapped id is the positional id of its source row',
                    count(*) filter (where public.survivor_legacy_id(s.base, s.tf, s.kmax, s.position + 1)
                                           <> x.legacy_survivor_id) = 0,
                    count(*) || ' mapped')
  from public.survivor_id_legacy_map x
  join public.engine_verdict_survivor s
    on s.base = x.src_base and s.tf = x.src_tf and s.dataset_version = x.src_dataset_version
   and s.kmax = x.src_kmax and s.config_hash = x.src_config_hash;

-- Every id the 043 resolver would serve from a rows-mode unit is in the map.
select pg_temp.gate('D', 'every positional id minted by a rows-mode unit is mapped',
                    count(*) filter (where x.legacy_survivor_id is null) = 0,
                    count(*) filter (where x.legacy_survivor_id is null) || ' of ' || count(*) || ' unmapped')
  from (select distinct on (m.survivor_id) m.*
          from public.survivor_family_member m
         where m.published_at is not null
         order by m.survivor_id, m.published_at asc, m.dataset_version asc, m.base, m.tf, m.kmax, m.ordinality) minted
  join public.engine_verdicts v
    on v.base = minted.base and v.tf = minted.tf and v.dataset_version = minted.dataset_version
   and v.kmax = minted.kmax
  left join public.survivor_id_legacy_map x on x.legacy_survivor_id = minted.survivor_id
 where pg_temp.is_rows(v);

-- ---------------------------------------------------------------------------
-- E. Snapshot every output the switch must preserve, timed.

create temp table gate_snap (
  phase   text,          -- 'before' | 'after'
  kind    text,
  key     text,
  who     text,          -- 'anon' | 'paid'
  payload jsonb,
  ms      numeric
);

create or replace function pg_temp.snap(p_phase text)
returns void language plpgsql as $$
declare
  b text;
  f text;
  id text;
  who text;
  t0 timestamptz;
  out jsonb;
begin
  foreach who in array case when current_setting('gate.paid_uid', true) <> ''
                            then array['anon', 'paid'] else array['anon'] end loop
    perform pg_temp.as_user(case when who = 'paid' then current_setting('gate.paid_uid') else '' end);

    t0 := clock_timestamp();
    out := public.survivor_family_catalog();
    insert into gate_snap values (p_phase, 'catalog', '*', who, out,
                                  extract(epoch from clock_timestamp() - t0) * 1000);

    t0 := clock_timestamp();
    out := public.survivor_strategy_summary();
    insert into gate_snap values (p_phase, 'strategy_summary', '*', who, out,
                                  extract(epoch from clock_timestamp() - t0) * 1000);

    for b in select distinct lower(base) from public.engine_verdicts
              where published_at >= '2026-08-12T19:38:00Z' order by 1 loop
      t0 := clock_timestamp();
      out := public.dossier_payload(b);
      insert into gate_snap values (p_phase, 'dossier', b, who, out,
                                    extract(epoch from clock_timestamp() - t0) * 1000);
      t0 := clock_timestamp();
      out := public.survivor_family_catalog(null, b);
      insert into gate_snap values (p_phase, 'catalog_scoped', b, who, out,
                                    extract(epoch from clock_timestamp() - t0) * 1000);
      t0 := clock_timestamp();
      out := public.survivor_family_preview(null, b, null, 20);
      insert into gate_snap values (p_phase, 'preview', b, who, out,
                                    extract(epoch from clock_timestamp() - t0) * 1000);
      t0 := clock_timestamp();
      out := public.survivor_family_all(null, b);
      insert into gate_snap values (p_phase, 'all', b, who, out,
                                    extract(epoch from clock_timestamp() - t0) * 1000);
    end loop;

    for f in select d.id
               from (select distinct x ->> 'id' as id
                       from gate_snap s, jsonb_array_elements(s.payload -> 'families') x
                      where s.phase = 'before' and s.kind = 'catalog' and s.who = 'anon') d
              order by md5(d.id)
              limit nullif(current_setting('gate.sample'), '')::int loop
      t0 := clock_timestamp();
      out := public.survivor_family_detail(f);
      insert into gate_snap values (p_phase, 'detail', f, who, out,
                                    extract(epoch from clock_timestamp() - t0) * 1000);
    end loop;

    -- Lab permalinks: every positional id at ranks 1, 2 and last of each rows-mode unit
    -- (links shared before the switch; must resolve to the same recipe after it).
    for id in
      select distinct public.survivor_legacy_id(v.base, v.tf, v.kmax, o)
        from public.engine_verdicts v
        cross join lateral unnest(array[1, 2, greatest(coalesce(v.n_go, 0) + coalesce(v.n_marginal, 0), 1)]) o
       where pg_temp.is_rows(v)
       order by 1
       limit nullif(current_setting('gate.sample'), '')::int
    loop
      t0 := clock_timestamp();
      out := public.survivor_lab_preset(id);
      insert into gate_snap values (p_phase, 'lab_preset', id, who, out,
                                    extract(epoch from clock_timestamp() - t0) * 1000);
    end loop;

    -- The public id at rank 1 of each rows-mode unit: 'missing' before the switch by
    -- construction, must resolve after it.
    for id in
      select s.survivor_id
        from public.engine_verdicts v
        join public.engine_verdict_survivor s
          on s.base = v.base and s.tf = v.tf and s.dataset_version = v.dataset_version
         and s.kmax = v.kmax and s.publish_seq = v.current_publish_seq and s.position = 0
       where pg_temp.is_rows(v)
       order by 1
       limit nullif(current_setting('gate.sample'), '')::int
    loop
      t0 := clock_timestamp();
      out := public.survivor_lab_preset(id);
      insert into gate_snap values (p_phase, 'lab_preset_public', id, who, out,
                                    extract(epoch from clock_timestamp() - t0) * 1000);
    end loop;
  end loop;
  perform pg_temp.as_user('');
end;
$$;

select pg_temp.snap('before');

select pg_temp.info('E', 'snapshot before 052',
                    count(*) || ' outputs, ' || round(sum(ms)) || ' ms total')
  from gate_snap where phase = 'before';
