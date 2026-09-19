-- 050_engine_verdict_survivor.sql  (M1 of "one row per survivor")
--
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
-- Apply order and rollback: supabase/migrations/README-survivor-rows.md
--
-- WHY. engine_verdicts.survivors holds every GO + MARGINAL of a unit as ONE jsonb value,
-- rewritten whole at each publish and re-exploded by survivor_family_index_sync (037). A
-- 16.3 MB value restarted production Postgres on 2026-09-18; an H4 unit has since reached
-- 26.4 MB. The engine (branch feat/survivor-rows in the vault) now writes one row per
-- survivor, in batches of 500, in ONE transaction per publication:
--
--   1. INSERT INTO engine_verdict_survivor ... ON CONFLICT (pk) DO UPDATE   (new publish_seq)
--   2. UPDATE engine_verdicts SET current_publish_seq = <new>, survivors_storage = 'rows'
--       WHERE <unit key> AND report_checksum = <checksum of the report the rows come from>
--   3. DELETE FROM engine_verdict_survivor WHERE <unit key> AND publish_seq <> <new>
--
-- and, when a child write did not land, `UPDATE engine_verdicts SET survivors_storage = NULL`.
--
-- WHAT THIS FILE DOES. Everything is additive: nothing that exists today reads any object
-- created here. The read switch is 052 and is applied separately, later.
--   a. engine_verdicts gains current_publish_seq and survivors_storage.
--   b. public.engine_verdict_survivor, closed like survivor_family_member (RLS on, grants
--      revoked from anon/authenticated) plus a writer policy for engine_telemetry, which is
--      a real role with real grants (not service_role, see _me/learnings-supabase.md).
--   c. A BEFORE trigger fills the family columns from the row's own recipe with the
--      existing survivor_family_signature(): one signature per row, no jsonb explode.
--   d. public.survivor_legacy_id(): the positional id of 037, verbatim, so 051/052 can
--      name the id a child row had before it had a public HMAC id; and
--      public.engine_verdict_survivor_entry(): a child row rebuilt as the jsonb entry.
--   e. A guard on engine_verdicts that keeps survivors_storage = 'rows' TRUE: it only holds
--      while the current publication's rows are complete (count = n_go + n_marginal), and
--      a unit that stops being rows-mode (demoted, or deleted) loses its child rows, so
--      every committed child row is an authoritative one (052's view depends on it).
--   f. survivor_family_index_sync (037) is narrowed to the columns it actually reads, so the
--      engine's header update (step 2) no longer re-explodes the unit's whole jsonb list.
--
-- CONTRACT ADDITION, flagged to the engine: `data_window jsonb`. Every published jsonb
-- survivor carries "window": {"start", "end"} (publisher._entry) and the Lab preload reads
-- recipe.window (algolab web/lib/survivor-lab-preset.ts recipeWindow); without it every
-- survivor of a dataset other than data_20260802 loses its "replay in the Lab" button.
-- The contract column list has no window, and `window` is a reserved word, hence the name.
-- Nullable: the engine's current insert keeps working, 052 just cannot rebuild the key.
--
-- LOCKS. ALTER TABLE engine_verdicts takes an ACCESS EXCLUSIVE lock for milliseconds, but it
-- queues behind a publish in flight and every reader queues behind it. lock_timeout makes it
-- fail fast instead; just re-run.

begin;

set local lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- a. The two header columns.
alter table public.engine_verdicts
  add column if not exists current_publish_seq bigint,
  add column if not exists survivors_storage text;

alter table public.engine_verdicts
  drop constraint if exists engine_verdicts_survivors_storage_check;
alter table public.engine_verdicts
  add constraint engine_verdicts_survivors_storage_check
  check (survivors_storage is null or survivors_storage = 'rows');

-- A publish_seq names ONE publication of ONE unit. The engine mints it from time_ns, strictly
-- increasing per process; this makes the uniqueness structural instead of probabilistic
-- (a clash fails the engine's header update, its transaction rolls back, it demotes and
-- logs), so "the rows at current_publish_seq" can never name two units' rows.
-- Several NULLs are allowed. engine_verdicts is ~200 rows: the build is instant.
create unique index if not exists engine_verdicts_current_publish_seq_uq
  on public.engine_verdicts (current_publish_seq);

comment on column public.engine_verdicts.current_publish_seq is
  'publish_seq of the engine_verdict_survivor rows that belong to the current publication '
  'of this unit. Written by the engine in the same transaction as those rows.';
comment on column public.engine_verdicts.survivors_storage is
  '''rows'' when engine_verdict_survivor at current_publish_seq is authoritative for this '
  'unit, NULL when the jsonb `survivors` list is. Kept honest by '
  'engine_verdicts_survivor_rows_guard: it cannot be ''rows'' unless the rows are complete.';

-- ---------------------------------------------------------------------------
-- b. The child table.
create table if not exists public.engine_verdict_survivor (
  -- identity of the source unit; matches engine_verdicts' primary key. `base` is the
  -- PUBLISHED base string, pass suffix included ("EMAcross+MI"), exactly as the header.
  base              text             not null,
  tf                text             not null,
  dataset_version   text             not null,
  kmax              integer          not null,
  -- PRIVATE recipe hash. Never leaves the database: the RPCs never select it.
  config_hash       text             not null,
  -- PUBLIC id, 'surv_' || 16 hex of an HMAC. Stable across dataset generations for the
  -- same recipe (owner decision), so it repeats once per dataset_version.
  survivor_id       text             not null
    constraint engine_verdict_survivor_id_format
    check (survivor_id ~ '^surv_[0-9a-f]{16}$'),
  publish_seq       bigint           not null,
  -- 0-based index in the published list, i.e. the jsonb order. 037's positional id is
  -- computed from position + 1 (its `ordinality`).
  position          integer          not null
    constraint engine_verdict_survivor_position_nonnegative check (position >= 0),
  search_mode       text,
  verdict           text,
  reasons           jsonb,
  pf                double precision,
  dd                double precision,
  n_trades          integer,
  params            jsonb,
  filters           jsonb,
  exit              jsonb,
  per_asset         jsonb,
  k                 integer,
  wf                double precision,
  published_at      timestamptz,
  data_window       jsonb,

  -- Family columns: same names, types and semantics as survivor_family_member (037).
  -- Filled by the BEFORE trigger below, never by the writer.
  family_id         text             not null,
  signature         jsonb            not null,
  eligible          boolean          not null,
  sample_sufficient boolean          not null,
  filter_keys_txt   text             not null,
  exit_keys_txt     text             not null,
  name_suffix       text             not null,
  -- survivor_family_member.published_at is the UNIT's publication time, and the readers
  -- filter on it (the 2026-08-12 freshness cutoff of 043/044). The child row's own
  -- published_at is the child WRITE time -- for a backfilled unit, months later -- and
  -- would let pre-cutoff units through. Copied from engine_verdicts by the trigger.
  unit_published_at timestamptz,

  primary key (base, tf, dataset_version, kmax, config_hash)
);

-- One publication = one dense, unambiguous order. Readers rebuild the legacy jsonb order
-- from it, and 037's positional ids hang on it, so two rows of one publication sharing a
-- position is a defect worth failing the engine's transaction over. It is also the index
-- every unit read (and the guard's count) uses.
create unique index if not exists engine_verdict_survivor_unit_order_uq
  on public.engine_verdict_survivor (base, tf, dataset_version, kmax, publish_seq, position);

-- UNIQUENESS OF THE PUBLIC ID: (survivor_id, dataset_version).
-- The id is stable across generations by design, so it may legitimately appear once per
-- dataset_version and not more. Inside one generation it must name exactly one survivor:
-- the engine hashes base, tf and rung into it, so two units of one generation cannot share
-- one, and a clash means a truncation collision or an id minted from the wrong input --
-- either would make a permalink ambiguous, silently. Stale rows of a previous publish_seq
-- cannot clash: same recipe = same config_hash = same primary key, updated in place.
create unique index if not exists engine_verdict_survivor_public_id_uq
  on public.engine_verdict_survivor (survivor_id, dataset_version);

create index if not exists engine_verdict_survivor_family_idx
  on public.engine_verdict_survivor (family_id);

-- NO covering twin of supabase/manual/2026-09-18_survivor_family_member_aggregate_index.sql
-- here, on purpose: measured on a 219 k-survivor local replica, an index on (base, tf,
-- dataset_version, unit_published_at) include (family_id, exit_keys_txt) made the planner
-- prefer it for the per-row "newest dataset" subquery and took survivor_family_catalog
-- from ~0.45 s to ~0.72 s through 052's view. unit_order_uq serves that subquery better.

-- Every URL the site produces is lowercase while bases are camelCase (see 044).
create index if not exists engine_verdict_survivor_lower_base_idx
  on public.engine_verdict_survivor (pg_catalog.lower(base));

alter table public.engine_verdict_survivor enable row level security;

-- Same two layers as survivor_family_member: RLS with no policy for anon/authenticated AND
-- the grants revoked. This table holds the paid corpus in the clear. Supabase's default
-- privileges grant new tables to anon and authenticated, so revoking from PUBLIC alone
-- would leave them readable.
revoke all on table public.engine_verdict_survivor from public;
revoke all on table public.engine_verdict_survivor from anon, authenticated;

comment on table public.engine_verdict_survivor is
  'One row per published survivor (GO_PAPER + MARGINAL) of an engine_verdicts unit. '
  'Written by the engine (engine_telemetry) in one transaction per publication; the family '
  'columns are filled by trigger. Closed to anon and authenticated: paid recipes verbatim. '
  'Only rows at engine_verdicts.current_publish_seq of a unit whose survivors_storage is '
  '''rows'' are authoritative.';

-- The writer. INSERT / UPDATE / DELETE, and SELECT on the columns it writes -- not on the
-- family columns. SELECT is not optional: `ON CONFLICT ... DO UPDATE SET c = excluded.c`
-- needs SELECT on every c it names (EXCLUDED is read through the target table's column
-- privileges), and the DELETE / ON CONFLICT predicates read the key and publish_seq.
-- Measured on a local replica: with SELECT on the key and publish_seq only, the engine's
-- upsert fails with "permission denied for table engine_verdict_survivor" -- with or
-- without RLS. The role already reads the same recipes in engine_verdicts.survivors.
-- The policy is required on top of the grants: the role is neither owner nor BYPASSRLS, so
-- RLS with no policy would block every write (the sweep_coverage trap of 2026-08-20).
-- Guarded so the file also applies on a database without the role (a local replica); on
-- production the role exists.
do $grants$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'engine_telemetry') then
    execute 'grant insert, update, delete on table public.engine_verdict_survivor to engine_telemetry';
    execute 'grant select (base, tf, dataset_version, kmax, config_hash, survivor_id, '
            'publish_seq, position, search_mode, verdict, reasons, pf, dd, n_trades, params, '
            'filters, exit, per_asset, k, wf, published_at, data_window) '
            'on table public.engine_verdict_survivor to engine_telemetry';
    execute 'drop policy if exists "engine_verdict_survivor writer" on public.engine_verdict_survivor';
    execute 'create policy "engine_verdict_survivor writer" on public.engine_verdict_survivor '
            'for all to engine_telemetry using (true) with check (true)';
    -- engine_verdicts: the header update and the demote. The role already holds table-level
    -- INSERT/SELECT/UPDATE here (measured 2026-08-20); these column grants state the part
    -- this feature relies on, so a later tightening of the table grant cannot drop it
    -- silently.
    execute 'grant update (current_publish_seq, survivors_storage) on table public.engine_verdicts to engine_telemetry';
    execute 'grant select (base, tf, dataset_version, kmax, report_checksum) on table public.engine_verdicts to engine_telemetry';
  else
    raise warning 'role engine_telemetry does not exist: no writer grant or policy created';
  end if;
end
$grants$;

-- ---------------------------------------------------------------------------
-- c. Family columns, one signature per row.
--
-- The recipe handed to survivor_family_signature is {params, filters, exit} built from the
-- row's own columns. The signature reads those three keys and nothing else, and it is
-- total on SQL NULL / json null / non-object (037 section 1), so this is the same value the
-- 037 trigger computes from the jsonb entry. Derivations below are 037's, verbatim.
create or replace function public.engine_verdict_survivor_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signature jsonb;
begin
  -- The jsonb path never carried a non-finite float: the engine serialises them as null
  -- (telemetry._json_dumps_safe). Same rule here, so a NaN cannot become numeric 'NaN' on
  -- one path and null on the other.
  if new.pf in ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) then
    new.pf := null;
  end if;
  if new.dd in ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) then
    new.dd := null;
  end if;
  if new.wf in ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) then
    new.wf := null;
  end if;

  v_signature := public.survivor_family_signature(
    new.base,
    pg_catalog.jsonb_build_object('params', new.params,
                                  'filters', new.filters,
                                  'exit', new.exit));

  new.signature := v_signature;
  new.family_id := 'fam_' || pg_catalog.substr(pg_catalog.md5(v_signature::text), 1, 16);
  new.eligible := coalesce(new.verdict = 'GO_PAPER', false);
  new.sample_sufficient := coalesce(new.n_trades >= 20, false);
  new.filter_keys_txt := (v_signature -> 'filters')::text;
  new.exit_keys_txt := coalesce(
    (select pg_catalog.jsonb_agg(exit_key order by exit_key)
       from pg_catalog.jsonb_object_keys(v_signature -> 'exit_shape') as keys(exit_key)),
    '[]'::jsonb)::text;
  new.name_suffix := case
    when pg_catalog.jsonb_array_length(v_signature -> 'filters') > 0
      then ' + ' || pg_catalog.array_to_string(
             array(select pg_catalog.jsonb_array_elements_text(v_signature -> 'filters')),
             ' + ')
    else ' sans filtre actif'
  end;
  -- The unit's publication time (NULL if the verdict row is not there yet). A later
  -- republish of the verdict row demotes the unit (guard below) until its rows are
  -- rewritten, which re-stamps this.
  select v.published_at
    into new.unit_published_at
    from public.engine_verdicts v
   where v.base = new.base
     and v.tf = new.tf
     and v.dataset_version = new.dataset_version
     and v.kmax = new.kmax;
  return new;
end;
$$;

drop trigger if exists engine_verdict_survivor_family on public.engine_verdict_survivor;
create trigger engine_verdict_survivor_family
  before insert or update on public.engine_verdict_survivor
  for each row execute function public.engine_verdict_survivor_family();

-- ---------------------------------------------------------------------------
-- d. The positional id of 037, as a function.
--
-- COPIED VERBATIM from 037_survivor_family_index.sql (trigger and backfill):
--   'surv_' || pg_catalog.substr(pg_catalog.md5(
--     pg_catalog.lower(new.base) || ':' || new.tf || ':' ||
--     new.kmax::text || ':' || e.ordinality::text), 1, 16)
-- with new.* -> p_*, and e.ordinality (bigint, 1-based) -> p_ordinality. A child row's
-- ordinality is position + 1. It does NOT hash dataset_version: the same id exists once
-- per generation, which is why 043 resolves it to the generation that minted it.
-- supabase/tests/survivor_rows_gate.sql checks it against every survivor_family_member row.
create or replace function public.survivor_legacy_id(
  p_base text,
  p_tf text,
  p_kmax integer,
  p_ordinality bigint
)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'surv_' || pg_catalog.substr(pg_catalog.md5(
    pg_catalog.lower(p_base) || ':' || p_tf || ':' ||
    p_kmax::text || ':' || p_ordinality::text), 1, 16);
$$;

comment on function public.survivor_legacy_id(text, text, integer, bigint) is
  'The positional survivor id of migration 037, verbatim. Legacy only: new ids are the '
  'engine''s HMAC ids in engine_verdict_survivor.survivor_id.';

-- Built while the table is empty, so it costs nothing now; 052's legacy fallback in
-- survivor_lab_preset looks child rows up by it.
create index if not exists engine_verdict_survivor_legacy_id_idx
  on public.engine_verdict_survivor (public.survivor_legacy_id(base, tf, kmax, position + 1));

-- ---------------------------------------------------------------------------
-- d'. The entry as the jsonb list carried it, rebuilt from one row.
--
-- publisher._entry publishes {verdict, reasons, pf, dd, n_trades, params, filters, exit,
-- per_asset, window}; a ladder entry adds {k, wf} (_public_ladder_entry), a sweep entry
-- has neither key. jsonb stores keys in its own normalised order, so rebuilding the same
-- keys with the same values gives the same jsonb -- and the same ::text, which is what
-- dossier_payload orders by (md5(e::text)). Two known ways the TEXT can still differ, both
-- measured by supabase/tests/survivor_rows_parity_live.sql and neither changing a value:
--   * a float the engine wrote as "2.0" comes back as "2" (double precision keeps no
--     scale; jsonb numeric does). Equal as jsonb, different md5.
--   * `window` needs data_window, which the engine does not write yet (see header).
-- STABLE, not IMMUTABLE: double precision -> jsonb goes through float8out, which reads
-- extra_float_digits (PostgreSQL default 1 = shortest exact form, same as Python's repr).
create or replace function public.engine_verdict_survivor_entry(
  p_row public.engine_verdict_survivor
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
           'verdict',   p_row.verdict,
           'reasons',   p_row.reasons,
           'pf',        p_row.pf,
           'dd',        p_row.dd,
           'n_trades',  p_row.n_trades,
           'params',    p_row.params,
           'filters',   p_row.filters,
           'exit',      p_row.exit,
           'per_asset', p_row.per_asset)
         || case when p_row.data_window is null then '{}'::jsonb
                 else pg_catalog.jsonb_build_object('window', p_row.data_window) end
         || case when p_row.search_mode = 'ladder'
                 then pg_catalog.jsonb_build_object('k', p_row.k, 'wf', p_row.wf)
                 else '{}'::jsonb end;
$$;

comment on function public.engine_verdict_survivor_entry(public.engine_verdict_survivor) is
  'One child row rebuilt as the jsonb survivor entry the engine published in '
  'engine_verdicts.survivors. Read-side only; paid content, never an RPC.';

-- ---------------------------------------------------------------------------
-- e. survivors_storage = 'rows' must mean "the rows are complete".
--
-- The engine sets survivors_storage = 'rows' on every successful child write. Two moments
-- would make that a lie, and both are closed here, at write time, once per unit, instead
-- of by a count(*) in every read (052's view is evaluated inside per-row correlated
-- subplans -- 136 661 loops measured in 047 -- where a per-unit count is unaffordable):
--
--   1. The verdict row of a NEW publication commits (new published_at / checksum / counts)
--      a few seconds before its child rows do. Until they land, the header still names the
--      previous publication's rows beside the new counts. -> demoted to NULL on the spot;
--      readers use the jsonb that was just written. The child write re-promotes it.
--   2. A promotion (storage becomes 'rows', or current_publish_seq moves) whose rows at the
--      new seq do not number n_go + n_marginal. -> raises: the engine's transaction rolls
--      back, its publisher demotes and logs "child rows NOT written". Nothing half-true is
--      ever committed.
--
-- The count runs inside the engine's own transaction, after its INSERTs and before its
-- DELETE of the old seq, so it sees exactly the publication being promoted.
create or replace function public.engine_verdicts_survivor_rows_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows bigint;
  v_expected bigint;
begin
  if new.survivors_storage is distinct from 'rows' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.survivors_storage is not distinct from 'rows'
     and new.current_publish_seq is not distinct from old.current_publish_seq then
    if new.published_at is distinct from old.published_at
       or new.report_checksum is distinct from old.report_checksum
       or new.n_go is distinct from old.n_go
       or new.n_marginal is distinct from old.n_marginal then
      new.survivors_storage := null;
    end if;
    return new;
  end if;

  -- A promotion: INSERT with 'rows', NULL -> 'rows', or a new current_publish_seq.
  if new.current_publish_seq is null then
    raise exception 'survivors_storage = ''rows'' needs current_publish_seq (% % % k%)',
      new.base, new.tf, new.dataset_version, new.kmax
      using errcode = 'check_violation';
  end if;

  select pg_catalog.count(*)
    into v_rows
    from public.engine_verdict_survivor s
   where s.base = new.base
     and s.tf = new.tf
     and s.dataset_version = new.dataset_version
     and s.kmax = new.kmax
     and s.publish_seq = new.current_publish_seq;

  v_expected := coalesce(new.n_go, 0) + coalesce(new.n_marginal, 0);
  if v_rows <> v_expected then
    raise exception 'survivor rows incomplete for % % % k%: % rows at publish_seq %, n_go + n_marginal = %',
      new.base, new.tf, new.dataset_version, new.kmax, v_rows, new.current_publish_seq, v_expected
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists engine_verdicts_survivor_rows_guard on public.engine_verdicts;
create trigger engine_verdicts_survivor_rows_guard
  before insert or update on public.engine_verdicts
  for each row execute function public.engine_verdicts_survivor_rows_guard();

-- e'. Child rows exist only for rows-mode units.
--
-- INVARIANT: every committed engine_verdict_survivor row belongs to a unit whose
-- survivors_storage is 'rows', at that unit's current_publish_seq. The engine's own
-- transaction keeps the seq half (rows, header, purge of the old seq -- or a rollback of
-- all three). This keeps the other half: when a unit leaves rows mode, its rows go.
--
-- Why delete instead of leaving them for readers to filter: 052 reads child rows through a
-- UNION ALL view, and PostgreSQL only flattens a UNION ALL member that has NO WHERE clause
-- (is_safe_append_member). A filtered member stays a subquery, loses the min/max rewrite,
-- and the family RPCs' per-row correlated "newest dataset of this pair" (136 661 loops
-- measured in 047) turns into a sort of the whole pair per loop: measured on a local
-- replica of 219 k survivors, survivor_family_catalog went from 0.37 s to over 60 s.
--
-- The rows deleted here are never the current truth: a demotion means either a newer
-- verdict row landed without its rows (they are the previous publication's), the engine's
-- child write failed (same), or an operator turned rows mode off -- in which case the
-- next child write, or backfill_survivor_rows.py, writes them again.
create or replace function public.engine_verdicts_survivor_rows_purge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.engine_verdict_survivor s
   where s.base = old.base
     and s.tf = old.tf
     and s.dataset_version = old.dataset_version
     and s.kmax = old.kmax;
  return null;
end;
$$;

drop trigger if exists engine_verdicts_survivor_rows_demoted on public.engine_verdicts;
create trigger engine_verdicts_survivor_rows_demoted
  after update on public.engine_verdicts
  for each row
  when (old.survivors_storage is not distinct from 'rows'
        and new.survivors_storage is distinct from 'rows')
  execute function public.engine_verdicts_survivor_rows_purge();

drop trigger if exists engine_verdicts_survivor_rows_deleted on public.engine_verdicts;
create trigger engine_verdicts_survivor_rows_deleted
  after delete on public.engine_verdicts
  for each row
  execute function public.engine_verdicts_survivor_rows_purge();

-- ---------------------------------------------------------------------------
-- f. 037's explode fires only when one of its inputs is in the SET list.
--
-- survivor_family_index_sync reads new.base, tf, dataset_version, kmax, published_at and
-- survivors -- nothing else. Fired on ANY update, the engine's header update (step 2,
-- which sets only current_publish_seq and survivors_storage) would delete and re-explode
-- the unit's whole jsonb list inside the child-row transaction: the exact cost profile of
-- the 2026-09-18 incident. The engine's verdict upsert sets every column, so it still
-- fires exactly as before; so do INSERT and DELETE. The function body is untouched.
drop trigger if exists survivor_family_index_sync on public.engine_verdicts;
create trigger survivor_family_index_sync
  after insert
     or update of base, tf, dataset_version, kmax, published_at, survivors
     or delete
  on public.engine_verdicts
  for each row execute function public.survivor_family_index_sync();

-- ---------------------------------------------------------------------------
-- Functions are callable by PUBLIC (and by anon/authenticated through Supabase's default
-- privileges) until revoked. None of these is an RPC.
revoke all on function public.engine_verdict_survivor_family() from public, anon, authenticated;
revoke all on function public.engine_verdicts_survivor_rows_guard() from public, anon, authenticated;
revoke all on function public.engine_verdicts_survivor_rows_purge() from public, anon, authenticated;
revoke all on function public.survivor_legacy_id(text, text, integer, bigint) from public, anon, authenticated;
revoke all on function public.engine_verdict_survivor_entry(public.engine_verdict_survivor) from public, anon, authenticated;

-- An expression index is evaluated with the WRITER's rights: without EXECUTE on the
-- function engine_verdict_survivor_legacy_id_idx indexes, every engine INSERT fails with
-- "permission denied for function survivor_legacy_id" (measured on a local replica). The
-- function is a pure md5 of its four arguments and reads no table.
do $grant_fn$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'engine_telemetry') then
    execute 'grant execute on function public.survivor_legacy_id(text, text, integer, bigint) to engine_telemetry';
  end if;
end
$grant_fn$;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICATION (read every output):
--   select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'engine_verdicts'
--      and column_name in ('current_publish_seq', 'survivors_storage');          -- 2 rows
--   select has_table_privilege('anon', 'public.engine_verdict_survivor', 'select'),
--          has_table_privilege('authenticated', 'public.engine_verdict_survivor', 'select');
--                                                                                 -- f, f
--   select has_table_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'insert'),
--          has_table_privilege('engine_telemetry', 'public.engine_verdict_survivor', 'delete'),
--          has_column_privilege('engine_telemetry', 'public.engine_verdict_survivor',
--                               'publish_seq', 'select'),
--          has_column_privilege('engine_telemetry', 'public.engine_verdict_survivor',
--                               'family_id', 'select');                           -- t, t, t, f
--   select policyname, roles::text from pg_policies
--    where tablename = 'engine_verdict_survivor';           -- one writer policy, engine_telemetry
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid = 'public.engine_verdicts'::regclass and not tgisinternal;
--      -- survivor_family_index_sync now reads "AFTER INSERT OR DELETE OR UPDATE OF base, ..."
--   select count(*) from public.engine_verdicts where survivors_storage is not null;  -- 0
-- The executable gate: supabase/tests/survivor_rows_gate.sql (rolled back, psql).
