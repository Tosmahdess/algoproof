-- survivor_rows_gate_after.sql -- second half of the survivor-rows gate (after 052).
-- Assembled and run by supabase/tests/survivor_rows_gate.py; see the first half.

-- ---------------------------------------------------------------------------
-- F. The switch, structurally.

select pg_temp.gate('M3', 'survivor_family_member is now a view', c.relkind = 'v', c.relkind::text)
  from pg_class c where c.oid = 'public.survivor_family_member'::regclass;

select pg_temp.gate('M3', 'anon/authenticated cannot read ' || t,
                    not has_table_privilege('anon', t, 'select')
                    and not has_table_privilege('authenticated', t, 'select'))
  from unnest(array['public.survivor_family_member', 'public.survivor_family_member_jsonb']) t;

select pg_temp.gate('M3', 'the view has the 037 table''s columns, names, order and types',
                    count(*) = 18 and bool_and(v.column_name = t.column_name and v.data_type = t.data_type),
                    string_agg(v.column_name || ':' || v.data_type, ',' order by v.ordinal_position))
  from information_schema.columns v
  join information_schema.columns t
    on t.table_schema = 'public' and t.table_name = 'survivor_family_member_jsonb'
   and t.ordinal_position = v.ordinal_position
 where v.table_schema = 'public' and v.table_name = 'survivor_family_member';

select pg_temp.gate('M3', 'dossier_payload keeps its signature',
                    pg_get_function_arguments(p.oid) = 'p_base text, p_dataset text DEFAULT NULL::text'
                    and pg_get_function_result(p.oid) = 'jsonb' and p.prosecdef and p.provolatile = 'v',
                    pg_get_function_arguments(p.oid) || ' -> ' || pg_get_function_result(p.oid))
  from pg_proc p where p.oid = 'public.dossier_payload(text, text)'::regprocedure;

select pg_temp.gate('M3', 'survivor_lab_preset keeps its signature',
                    pg_get_function_arguments(p.oid) = 'p_survivor_id text'
                    and pg_get_function_result(p.oid) = 'jsonb' and p.prosecdef,
                    pg_get_function_arguments(p.oid))
  from pg_proc p where p.oid = 'public.survivor_lab_preset(text)'::regprocedure;

select pg_temp.gate('M3', 'anon and authenticated still execute the two RPCs',
                    bool_and(has_function_privilege(r, f, 'execute')))
  from unnest(array['anon', 'authenticated']) r,
       unnest(array['public.dossier_payload(text, text)', 'public.survivor_lab_preset(text)']) f;

select pg_temp.gate('M3', 'the two branches are disjoint (no jsonb member row of a rows-mode unit)',
                    count(*) = 0, count(*) || ' rows')
  from public.survivor_family_member_jsonb m
  join public.engine_verdicts v
    on v.base = m.base and v.tf = m.tf and v.dataset_version = m.dataset_version and v.kmax = m.kmax
 where pg_temp.is_rows(v);

select pg_temp.gate('M3', format('view members = n_go + n_marginal for %s %s %s k%s',
                                v.base, v.tf, v.dataset_version, v.kmax),
                    c.n = coalesce(v.n_go, 0) + coalesce(v.n_marginal, 0), c.n || ' members')
  from public.engine_verdicts v
  cross join lateral (select count(*) as n from public.survivor_family_member m
                       where m.base = v.base and m.tf = v.tf
                         and m.dataset_version = v.dataset_version and m.kmax = v.kmax) c
 where pg_temp.is_rows(v);

-- ---------------------------------------------------------------------------
-- G. Same outputs.

select pg_temp.snap('after');

-- Per dossier unit: identical text, else identical values in another order, else FAIL.
-- A unit whose jsonb list was deferred by the 8 MB breaker is ALLOWED to gain its list.
with a as (
  select s.key, s.who, u ->> 'base' as base, u ->> 'tf' as tf, u ->> 'dataset_version' as dv,
         (u ->> 'kmax')::int as kmax, u, s.payload ->> 'access' as access
    from gate_snap s, jsonb_array_elements(s.payload -> 'units') u
   where s.phase = 'after' and s.kind = 'dossier'
), b as (
  select s.key, s.who, u ->> 'base' as base, u ->> 'tf' as tf, u ->> 'dataset_version' as dv,
         (u ->> 'kmax')::int as kmax, u, s.payload ->> 'access' as access
    from gate_snap s, jsonb_array_elements(s.payload -> 'units') u
   where s.phase = 'before' and s.kind = 'dossier'
), cmp as (
  select coalesce(a.key, b.key) as key, coalesce(a.who, b.who) as who,
         coalesce(a.base, b.base) as base, coalesce(a.tf, b.tf) as tf,
         coalesce(a.dv, b.dv) as dv, coalesce(a.kmax, b.kmax) as kmax,
         a.u as ua, b.u as ub, a.access as aa, b.access as ab
    from a full join b
      on a.key = b.key and a.who = b.who and a.base = b.base and a.tf = b.tf
     and a.dv = b.dv and a.kmax = b.kmax
)
select pg_temp.gate('G', format('dossier_payload(%s) %s: %s %s %s k%s', c.key, c.who, c.base, c.tf, c.dv, c.kmax),
                    c.ua::text is not distinct from c.ub::text,
                    case when c.ua::text = c.ub::text then 'identical'
                         when c.ua is null or c.ub is null then 'unit present on one side only'
                         when c.values_equal
                           then 'same survivors and fields as values, different order/text: '
                                || jsonb_array_length(c.ua -> 'survivors') || ' entries'
                         else format('survivors differ: %s after vs %s before',
                                     jsonb_array_length(c.ua -> 'survivors'),
                                     jsonb_array_length(c.ub -> 'survivors')) end,
                    -- WARN (not FAIL) only when the values agree, or when the jsonb list was
                    -- deferred by the 8 MB breaker and the rows now show what it withheld.
                    c.values_equal
                    or exists (select 1 from public.engine_verdicts v
                                where v.base = c.base and v.tf = c.tf and v.dataset_version = c.dv
                                  and v.kmax = c.kmax
                                  and v.selection_control ->> 'survivors_status' = 'deferred_size'))
  from (select cmp.*,
               coalesce(cmp.aa = cmp.ab
                        and (cmp.ua - 'survivors') = (cmp.ub - 'survivors')
                        and pg_temp.same_multiset(cmp.ua -> 'survivors', cmp.ub -> 'survivors'),
                        false) as values_equal
          from cmp) c;

-- Whole-payload RPCs. survivor_id may change (positional -> public id) and nothing else.
with pairs as (
  select a.kind, a.key, a.who, a.payload as pa, b.payload as pb
    from gate_snap a
    join gate_snap b on b.kind = a.kind and b.key = a.key and b.who = a.who and b.phase = 'before'
   where a.phase = 'after'
     and a.kind in ('catalog', 'catalog_scoped', 'strategy_summary', 'preview', 'all', 'detail')
)
select pg_temp.gate('G', format('%s(%s) %s', kind, key, who),
                    pg_temp.strip_ids(pa) = pg_temp.strip_ids(pb),
                    case when pa::text = pb::text then 'identical text'
                         when pg_temp.strip_ids(pa)::text = pg_temp.strip_ids(pb)::text
                           then 'identical but survivor_id (public id replaces positional id)'
                         when pg_temp.strip_ids(pa) = pg_temp.strip_ids(pb)
                           then 'same values, different text (numeric scale)'
                         else 'DIFFERENT: md5 ' || md5(pa::text) || ' vs ' || md5(pb::text) end,
                    false)
  from pairs;

-- The 037 method on the whole catalogue, stated separately because it is the number the
-- family pages were accepted on.
select pg_temp.gate('G', 'catalog md5 (037 method) unchanged, ' || a.who,
                    md5(a.payload::text) = md5(b.payload::text),
                    md5(a.payload::text) || ' vs ' || md5(b.payload::text)
                    || case when a.payload = b.payload then ' (jsonb-equal: numeric scale only)' else '' end,
                    a.payload = b.payload)
  from gate_snap a join gate_snap b
    on b.kind = 'catalog' and b.who = a.who and b.phase = 'before'
 where a.phase = 'after' and a.kind = 'catalog';

-- Lab links shared before the switch resolve to the same recipe after it.
select pg_temp.gate('G', format('lab preset %s %s', a.key, a.who),
                    a.payload = b.payload,
                    case when a.payload::text = b.payload::text then 'identical'
                         when a.payload = b.payload then 'same values, different text'
                         else 'before ' || b.payload::text || ' / after ' || a.payload::text end)
  from gate_snap a join gate_snap b
    on b.kind = a.kind and b.key = a.key and b.who = a.who and b.phase = 'before'
 where a.phase = 'after' and a.kind = 'lab_preset';

select pg_temp.gate('G', format('public id %s resolves after the switch (%s)', a.key, a.who),
                    a.payload ->> 'access' = case when a.who = 'paid' then 'full' else 'locked' end,
                    a.payload ->> 'access')
  from gate_snap a
 where a.phase = 'after' and a.kind = 'lab_preset_public';

-- ---------------------------------------------------------------------------
-- H. Time. anon's statement_timeout is 3 s, authenticated's 8 s.

select pg_temp.gate('H', format('%s %s: max %s ms after vs %s ms before', a.kind, a.who,
                                round(max(a.ms)), round(max(b.ms))),
                    max(a.ms) < 3000 and max(a.ms) <= 2 * max(b.ms) + 50,
                    format('sum %s ms after vs %s ms before', round(sum(a.ms)), round(sum(b.ms))),
                    max(a.ms) < 3000)
  from gate_snap a
  join gate_snap b on b.kind = a.kind and b.key = a.key and b.who = a.who and b.phase = 'before'
 where a.phase = 'after'
 group by a.kind, a.who;

-- ---------------------------------------------------------------------------
-- I. Behaviour of the guard and the index trigger, on one rows-mode unit. Mutating, so last.

do $behaviour$
declare
  u record;
  v_seq bigint;
  v_storage text;
  v_members bigint;
  v_jsonb_side bigint;
  v_children bigint;
  v_raised boolean := false;
begin
  select v.base, v.tf, v.dataset_version, v.kmax, v.current_publish_seq,
         coalesce(v.n_go, 0) + coalesce(v.n_marginal, 0) as n,
         jsonb_array_length(case when jsonb_typeof(v.survivors) = 'array' then v.survivors else '[]'::jsonb end) as n_jsonb
    into u
    from public.engine_verdicts v
   where pg_temp.is_rows(v)
     and coalesce(v.n_go, 0) + coalesce(v.n_marginal, 0) > 1
     and v.selection_control ->> 'survivors_status' is distinct from 'deferred_size'
   order by v.base, v.tf, v.dataset_version, v.kmax
   limit 1;

  if u.base is null then
    perform pg_temp.gate('I', 'behaviour tests', false, 'no rows-mode unit to test on', true);
    return;
  end if;

  -- What the engine would write again for this unit.
  create temp table gate_unit_rows as
  select * from public.engine_verdict_survivor s
   where s.base = u.base and s.tf = u.tf and s.dataset_version = u.dataset_version and s.kmax = u.kmax;

  -- 1. A new publication of the verdict row, rows not written yet: demoted on the spot, its
  --    (now stale) child rows purged, and the jsonb list back on the jsonb side.
  update public.engine_verdicts
     set published_at = published_at + interval '1 second'
   where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax;
  select survivors_storage into v_storage from public.engine_verdicts
   where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax;
  select count(*) into v_members from public.survivor_family_member m
   where m.base = u.base and m.tf = u.tf and m.dataset_version = u.dataset_version and m.kmax = u.kmax;
  select count(*) into v_children from public.engine_verdict_survivor s
   where s.base = u.base and s.tf = u.tf and s.dataset_version = u.dataset_version and s.kmax = u.kmax;
  perform pg_temp.gate('I', 'a newer verdict row without its rows demotes the unit and purges its rows',
                       v_storage is null and v_members = u.n_jsonb and v_children = 0,
                       format('storage=%s, members=%s (jsonb %s), child rows=%s',
                              coalesce(v_storage, 'NULL'), v_members, u.n_jsonb, v_children));

  -- 2. The engine's next child write, one row short: promotion refused, all of it rolled back.
  v_seq := (select max(current_publish_seq) from public.engine_verdicts) + 1;
  begin
    insert into public.engine_verdict_survivor (
      base, tf, dataset_version, kmax, config_hash, survivor_id, publish_seq, position,
      search_mode, verdict, reasons, pf, dd, n_trades, params, filters, exit, per_asset,
      k, wf, published_at, data_window)
    select base, tf, dataset_version, kmax, config_hash, survivor_id, v_seq, position,
           search_mode, verdict, reasons, pf, dd, n_trades, params, filters, exit, per_asset,
           k, wf, now(), data_window
      from gate_unit_rows where position > 0;
    update public.engine_verdicts set current_publish_seq = v_seq, survivors_storage = 'rows'
     where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax;
  exception when check_violation then
    v_raised := true;
  end;
  perform pg_temp.gate('I', 'promotion of an incomplete publication raises check_violation', v_raised);

  -- 3. The complete child write: accepted; the jsonb side of the unit is emptied by the
  --    header-only update, without an explode.
  insert into public.engine_verdict_survivor (
    base, tf, dataset_version, kmax, config_hash, survivor_id, publish_seq, position,
    search_mode, verdict, reasons, pf, dd, n_trades, params, filters, exit, per_asset,
    k, wf, published_at, data_window)
  select base, tf, dataset_version, kmax, config_hash, survivor_id, v_seq, position,
         search_mode, verdict, reasons, pf, dd, n_trades, params, filters, exit, per_asset,
         k, wf, now(), data_window
    from gate_unit_rows;
  update public.engine_verdicts set current_publish_seq = v_seq, survivors_storage = 'rows'
   where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax;
  select survivors_storage into v_storage from public.engine_verdicts
   where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax;
  select count(*) into v_jsonb_side from public.survivor_family_member_jsonb m
   where m.base = u.base and m.tf = u.tf and m.dataset_version = u.dataset_version and m.kmax = u.kmax;
  select count(*) into v_members from public.survivor_family_member m
   where m.base = u.base and m.tf = u.tf and m.dataset_version = u.dataset_version and m.kmax = u.kmax;
  perform pg_temp.gate('I', 'complete promotion accepted; unit served from rows only',
                       v_storage = 'rows' and v_jsonb_side = 0 and v_members = u.n,
                       format('storage=%s, jsonb side=%s, members=%s (expected %s)',
                              coalesce(v_storage, 'NULL'), v_jsonb_side, v_members, u.n));

  -- 3b. Resolver paths other than the map: an unmapped positional id falls back to 043's
  --     rule over the child rows (step c) and serves the same recipe; a well-formed id that
  --     names nothing is 'missing'.
  if current_setting('gate.paid_uid', true) <> '' then
    perform pg_temp.as_user(current_setting('gate.paid_uid'));
    declare
      v_id text := public.survivor_legacy_id(u.base, u.tf, u.kmax, 1);
      v_want jsonb;
      v_got jsonb;
    begin
      -- The before-switch answer if the snapshot sampled this id, else the map's answer
      -- (section G already held the map path to the before-switch answers).
      select payload into v_want from gate_snap
       where phase = 'before' and kind = 'lab_preset' and key = v_id and who = 'paid';
      v_want := coalesce(v_want, public.survivor_lab_preset(v_id));
      delete from public.survivor_id_legacy_map where legacy_survivor_id = v_id;
      v_got := public.survivor_lab_preset(v_id);
      perform pg_temp.gate('I', 'unmapped positional id resolves by 043''s rule over child rows',
                           v_got = v_want,
                           coalesce(v_got ->> 'dataset_version', 'NULL') || ' vs '
                           || coalesce(v_want ->> 'dataset_version', 'NULL'));
      v_got := public.survivor_lab_preset('surv_0000000000000000');
      perform pg_temp.gate('I', 'an id that names nothing is missing',
                           v_got = '{"access": "missing"}'::jsonb, v_got::text);
    end;
    perform pg_temp.as_user('');
  end if;

  -- 4. The demote statement the engine and the README rollback use: rows purged, jsonb served.
  update public.engine_verdicts set survivors_storage = null
   where base = u.base and tf = u.tf and dataset_version = u.dataset_version and kmax = u.kmax;
  select count(*) into v_members from public.survivor_family_member m
   where m.base = u.base and m.tf = u.tf and m.dataset_version = u.dataset_version and m.kmax = u.kmax;
  select count(*) into v_children from public.engine_verdict_survivor s
   where s.base = u.base and s.tf = u.tf and s.dataset_version = u.dataset_version and s.kmax = u.kmax;
  perform pg_temp.gate('I', 'demote (survivors_storage = NULL) serves the jsonb list again',
                       v_members = u.n_jsonb and v_children = 0,
                       format('%s members, %s child rows', v_members, v_children));
end
$behaviour$;

-- ---------------------------------------------------------------------------
-- Verdict.

\pset pager off
select n, phase, status, label, left(detail, 400) as detail
  from gate_result
 order by case status when 'FAIL' then 0 when 'WARN' then 1 when 'INFO' then 2 else 3 end, n;

select status, count(*) from gate_result group by status order by status;

do $verdict$
declare
  v_fail bigint;
begin
  select count(*) into v_fail from gate_result where status = 'FAIL';
  if v_fail > 0 then
    raise exception 'SURVIVOR ROWS GATE FAILED: % failing check(s) (everything was rolled back)', v_fail;
  end if;
  raise notice 'SURVIVOR ROWS GATE GREEN (everything was rolled back)';
end
$verdict$;
