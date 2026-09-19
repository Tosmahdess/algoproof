-- survivor_rows_parity_live.sql
--
-- READ-ONLY parity checks between the engine's child rows (engine_verdict_survivor) and
-- the jsonb lists (engine_verdicts.survivors), for every unit that has rows. Plain SELECTs:
-- paste them one at a time in the Supabase SQL editor, or run the file with psql. Nothing
-- is written. Run after 050 is applied and the engine has written rows (flag on +
-- backfill), and again before 052. Every query says what a green result looks like.
--
-- Cost: queries 3-5 explode the jsonb lists of the units that have rows (the same work
-- the 037 trigger does on a publish). On the largest units expect seconds, not minutes.
--
-- The executable version of the same checks, plus the read switch itself inside a
-- rolled-back transaction, is supabase/tests/survivor_rows_gate.py.

-- 1. Units with child rows, and whether they are authoritative.
--    GREEN: every unit the engine has published since the flag went on appears, with
--    storage 'rows' and n_rows = n_go + n_marginal.
select v.base, v.tf, v.dataset_version, v.kmax, v.survivors_storage, v.current_publish_seq,
       coalesce(v.n_go, 0) + coalesce(v.n_marginal, 0) as n_expected,
       count(s.*) filter (where s.publish_seq = v.current_publish_seq) as n_rows,
       count(s.*) filter (where s.publish_seq is distinct from v.current_publish_seq) as n_stray,
       v.selection_control ->> 'survivors_status' as survivors_status
  from public.engine_verdicts v
  join public.engine_verdict_survivor s
    on s.base = v.base and s.tf = v.tf and s.dataset_version = v.dataset_version and s.kmax = v.kmax
 group by v.base, v.tf, v.dataset_version, v.kmax, v.survivors_storage, v.current_publish_seq,
          v.n_go, v.n_marginal, v.selection_control
 order by 1, 2, 3, 4;

-- 2. 050's invariant (052's view reads child rows unfiltered).
--    GREEN: 0 rows.
select s.base, s.tf, s.dataset_version, s.kmax, s.publish_seq, count(*) as stray_rows
  from public.engine_verdict_survivor s
  left join public.engine_verdicts v
    on v.base = s.base and v.tf = s.tf and v.dataset_version = s.dataset_version and v.kmax = s.kmax
 where v.base is null
    or v.survivors_storage is distinct from 'rows'
    or v.current_publish_seq is distinct from s.publish_seq
 group by 1, 2, 3, 4, 5;

-- 3. count(child) = jsonb_array_length(survivors), per rows-mode unit.
--    GREEN: 0 rows, except units whose jsonb list was deferred by the 8 MB breaker
--    (survivors_status = 'deferred_size': the jsonb is empty by design, the rows are not).
select v.base, v.tf, v.dataset_version, v.kmax,
       jsonb_array_length(case when jsonb_typeof(v.survivors) = 'array' then v.survivors else '[]'::jsonb end) as n_jsonb,
       c.n as n_rows,
       v.selection_control ->> 'survivors_status' as survivors_status
  from public.engine_verdicts v
  cross join lateral (
    select count(*) as n from public.engine_verdict_survivor s
     where s.base = v.base and s.tf = v.tf and s.dataset_version = v.dataset_version
       and s.kmax = v.kmax and s.publish_seq = v.current_publish_seq) c
 where v.survivors_storage = 'rows'
   and c.n <> jsonb_array_length(case when jsonb_typeof(v.survivors) = 'array' then v.survivors else '[]'::jsonb end);

-- 4. The SET of recipes is the same: md5 over the sorted md5s of {params, filters, exit}
--    on both sides (exit null / missing / {} are one thing to the engine).
--    GREEN: 0 rows.
with jsonb_side as (
  select v.base, v.tf, v.dataset_version, v.kmax,
         md5(string_agg(md5(jsonb_build_object(
               'params', coalesce(e -> 'params', '{}'::jsonb),
               'filters', coalesce(e -> 'filters', '{}'::jsonb),
               'exit', coalesce(nullif(e -> 'exit', 'null'::jsonb), '{}'::jsonb))::text), ','
             order by md5(jsonb_build_object(
               'params', coalesce(e -> 'params', '{}'::jsonb),
               'filters', coalesce(e -> 'filters', '{}'::jsonb),
               'exit', coalesce(nullif(e -> 'exit', 'null'::jsonb), '{}'::jsonb))::text))) as fp
    from public.engine_verdicts v
    cross join lateral jsonb_array_elements(
           case when jsonb_typeof(v.survivors) = 'array' then v.survivors else '[]'::jsonb end) e
   where v.survivors_storage = 'rows'
   group by 1, 2, 3, 4
), rows_side as (
  select s.base, s.tf, s.dataset_version, s.kmax,
         md5(string_agg(md5(jsonb_build_object(
               'params', coalesce(s.params, '{}'::jsonb),
               'filters', coalesce(s.filters, '{}'::jsonb),
               'exit', coalesce(nullif(s.exit, 'null'::jsonb), '{}'::jsonb))::text), ','
             order by md5(jsonb_build_object(
               'params', coalesce(s.params, '{}'::jsonb),
               'filters', coalesce(s.filters, '{}'::jsonb),
               'exit', coalesce(nullif(s.exit, 'null'::jsonb), '{}'::jsonb))::text))) as fp
    from public.engine_verdict_survivor s
    join public.engine_verdicts v
      on v.base = s.base and v.tf = s.tf and v.dataset_version = s.dataset_version
     and v.kmax = s.kmax and v.current_publish_seq = s.publish_seq
   where v.survivors_storage = 'rows'
   group by 1, 2, 3, 4
)
select coalesce(j.base, r.base) as base, coalesce(j.tf, r.tf) as tf,
       coalesce(j.dataset_version, r.dataset_version) as dataset_version,
       coalesce(j.kmax, r.kmax) as kmax, j.fp as jsonb_fp, r.fp as rows_fp
  from jsonb_side j
  full join rows_side r
    on r.base = j.base and r.tf = j.tf and r.dataset_version = j.dataset_version and r.kmax = j.kmax
 where j.fp is distinct from r.fp
   -- a deferred unit has no jsonb side at all; query 3 already lists it
   and j.base is not null;

-- 5. Position by position: the rebuilt entry (engine_verdict_survivor_entry) against the
--    jsonb entry at ordinality = position + 1.
--      recipe_diff  -> MUST be 0 (another recipe at that rank: legacy ids would re-point)
--      value_diff   -> MUST be 0 (jsonb '=' : a key or a value differs -- e.g. `window`
--                      missing because data_window is not written; the Lab loses its
--                      replay window for every dataset but data_20260802)
--      text_diff    -> tolerated (numeric scale "2.0" vs "2"); moves those entries in
--                      dossier_payload's md5(e::text) order, nothing else
select v.base, v.tf, v.dataset_version, v.kmax,
       count(*) as positions,
       count(*) filter (where s.config_hash is null) as no_row,
       count(*) filter (where coalesce(e.recipe -> 'params', '{}'::jsonb) <> coalesce(s.params, '{}'::jsonb)
                           or coalesce(e.recipe -> 'filters', '{}'::jsonb) <> coalesce(s.filters, '{}'::jsonb)
                           or coalesce(nullif(e.recipe -> 'exit', 'null'::jsonb), '{}'::jsonb)
                              <> coalesce(nullif(s.exit, 'null'::jsonb), '{}'::jsonb)) as recipe_diff,
       count(*) filter (where public.engine_verdict_survivor_entry(s) <> e.recipe) as value_diff,
       count(*) filter (where public.engine_verdict_survivor_entry(s)::text <> e.recipe::text) as text_diff,
       min(case when public.engine_verdict_survivor_entry(s) <> e.recipe
                then e.recipe::text || '  VS  ' || public.engine_verdict_survivor_entry(s)::text end) as first_value_diff
  from public.engine_verdicts v
  cross join lateral jsonb_array_elements(
         case when jsonb_typeof(v.survivors) = 'array' then v.survivors else '[]'::jsonb end)
         with ordinality as e(recipe, ordinality)
  left join public.engine_verdict_survivor s
    on s.base = v.base and s.tf = v.tf and s.dataset_version = v.dataset_version
   and s.kmax = v.kmax and s.publish_seq = v.current_publish_seq and s.position = e.ordinality - 1
 where v.survivors_storage = 'rows'
 group by 1, 2, 3, 4
 order by (count(*) filter (where public.engine_verdict_survivor_entry(s) <> e.recipe)) desc, 1, 2, 3, 4;

-- 6. Family columns: the trigger's family_id equals 037's for the same survivor.
--    GREEN: 0 rows. (Valid while 052 is NOT applied: survivor_family_member is still the
--    037 table exploded from the jsonb.)
select s.base, s.tf, s.dataset_version, s.kmax, s.position, s.family_id as rows_family, m.family_id as jsonb_family
  from public.engine_verdict_survivor s
  join public.engine_verdicts v
    on v.base = s.base and v.tf = s.tf and v.dataset_version = s.dataset_version
   and v.kmax = s.kmax and v.current_publish_seq = s.publish_seq
  join public.survivor_family_member m
    on m.base = s.base and m.tf = s.tf and m.dataset_version = s.dataset_version
   and m.kmax = s.kmax and m.ordinality = s.position + 1
 where (m.family_id, m.filter_keys_txt, m.exit_keys_txt, m.name_suffix, m.eligible, m.sample_sufficient)
       is distinct from
       (s.family_id, s.filter_keys_txt, s.exit_keys_txt, s.name_suffix, s.eligible, s.sample_sufficient)
 limit 50;

-- 7. The family catalogue, the 037 way: md5 of the whole payload. Record it before 052 and
--    compare after (the gate does both inside one rolled-back transaction).
select md5(public.survivor_family_catalog()::text) as catalog_md5,
       length(public.survivor_family_catalog()::text) as catalog_bytes;

-- 8. The legacy map (after 051).
--    GREEN: recipe_mismatch = 0, no_row_at_position = 0. The call WRITES the map (that is
--    its job, and it is idempotent); skip it if you only want to read.
-- select public.survivor_id_legacy_map_rebuild();
select count(*) as mapped,
       count(*) filter (where s.config_hash is null) as source_row_gone
  from public.survivor_id_legacy_map x
  left join public.engine_verdict_survivor s
    on s.base = x.src_base and s.tf = x.src_tf and s.dataset_version = x.src_dataset_version
   and s.kmax = x.src_kmax and s.config_hash = x.src_config_hash;
