-- 051_survivor_id_legacy_map.sql  (M2 of "one row per survivor")
--
-- Run in Supabase dashboard: https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
-- Apply order and rollback: supabase/migrations/README-survivor-rows.md
-- Precondition: 050 applied. Additive: nothing existing reads these objects (052 will).
--
-- WHY. Every /lab?survivor=surv_... link shared so far carries 037's POSITIONAL id:
-- md5(lower(base):tf:kmax:ordinality), i.e. "the n-th survivor of that unit". The engine's
-- child rows carry a different, public HMAC id that names the RECIPE. Nothing derives one
-- from the other, so the old links would die the day a unit's jsonb list is cut. This map
-- records, while the jsonb still exists, which recipe each positional id denoted.
--
-- WHICH RECIPE A POSITIONAL ID DENOTES. The positional id does not hash dataset_version,
-- so the same id exists once per generation, at the same rank, usually on a different
-- recipe. 043 settled it: a link resolves to the generation that MINTED it -- the earliest
-- by (published_at, dataset_version) among the generations of the same (base, tf, kmax)
-- whose list reaches that ordinality. The rebuild below applies exactly that rule, and maps
-- an id only from the unit that minted it. An id minted by a unit WITHOUT child rows is
-- not mapped at all -- mapping it from a later generation's rows would be the silent
-- re-point 043 exists to forbid. 052's resolver falls back to the positional rule for it.
--
-- STICKY BY DEFAULT. A republish of the same unit reshuffles positions, so the recipe at a
-- position can change under a live link. The first mapping recorded is kept (on conflict
-- do nothing) and the rebuild reports how many ids now point elsewhere; p_replace = true
-- re-points them deliberately.
--
-- The contract names two columns; the src_* columns are additive (nullable) and record the
-- exact child row the mapping was taken from, so 052 can serve the minting generation
-- while it is still published instead of guessing one.

begin;

create table if not exists public.survivor_id_legacy_map (
  legacy_survivor_id  text        primary key
    constraint survivor_id_legacy_map_legacy_format
    check (legacy_survivor_id ~ '^surv_[0-9a-f]{16}$'),
  survivor_id         text        not null
    constraint survivor_id_legacy_map_public_format
    check (survivor_id ~ '^surv_[0-9a-f]{16}$'),
  src_base            text,
  src_tf              text,
  src_dataset_version text,
  src_kmax            integer,
  src_config_hash     text,
  mapped_at           timestamptz not null default pg_catalog.now()
);

create index if not exists survivor_id_legacy_map_survivor_idx
  on public.survivor_id_legacy_map (survivor_id);

alter table public.survivor_id_legacy_map enable row level security;
-- Closed exactly like survivor_family_member: no policy, grants revoked. It holds private
-- config hashes; only SECURITY DEFINER functions read it.
revoke all on table public.survivor_id_legacy_map from public;
revoke all on table public.survivor_id_legacy_map from anon, authenticated;

comment on table public.survivor_id_legacy_map is
  'Positional survivor id (037, shared in /lab?survivor= links) -> public HMAC survivor_id '
  'of the recipe it denoted in the generation that minted it. Built by '
  'survivor_id_legacy_map_rebuild() while the jsonb lists still exist. Closed table.';

-- ---------------------------------------------------------------------------
-- (Re)build. Operator-run (postgres), idempotent, one statement. Returns a report; read it.
--
--   select public.survivor_id_legacy_map_rebuild();            -- every unit with rows
--   select public.survivor_id_legacy_map_rebuild('EMAcross');  -- one base (case-insensitive)
--
-- Units considered: current_publish_seq set and rows present at that seq -- whether or not
-- survivors_storage is 'rows' yet, because the map has to exist BEFORE a unit is switched
-- and long before its jsonb is cut.
--
-- Report keys:
--   units              units with child rows at their current_publish_seq
--   legacy_ids         jsonb entries of those units (= positional ids they carry)
--   minted_here        of which this unit is the minting generation (043's rule)
--   joined             of which a child row sits at position = ordinality - 1
--   recipe_mismatch    joined, but params/filters/exit/verdict differ  -> NOT mapped
--   no_row_at_position minted here, but no child row at that position  -> NOT mapped
--   inserted           new map rows
--   repointed          existing map rows changed (only with p_replace)
--   stale              existing map rows that now name a different recipe (kept unless p_replace)
-- A non-zero recipe_mismatch or no_row_at_position means the child rows do not describe
-- the same list as the jsonb: stop and investigate before 052.
create or replace function public.survivor_id_legacy_map_rebuild(
  p_base text default null,
  p_replace boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_report jsonb;
begin
  with units as (
    select v.base, v.tf, v.dataset_version, v.kmax, v.published_at,
           v.current_publish_seq, v.survivors
      from public.engine_verdicts v
     where v.published_at is not null
       and v.current_publish_seq is not null
       and (p_base is null or pg_catalog.lower(v.base) = pg_catalog.lower(p_base))
       and exists (
         select 1
           from public.engine_verdict_survivor s
          where s.base = v.base
            and s.tf = v.tf
            and s.dataset_version = v.dataset_version
            and s.kmax = v.kmax
            and s.publish_seq = v.current_publish_seq)
  ), generations as (
    -- Every published generation of the same rung, and how far its jsonb list reaches.
    select g.base, g.tf, g.kmax, g.dataset_version, g.published_at,
           case when pg_catalog.jsonb_typeof(g.survivors) = 'array'
                then pg_catalog.jsonb_array_length(g.survivors) else 0 end as n_legacy
      from public.engine_verdicts g
     where g.published_at is not null
       and exists (select 1 from units u
                    where u.base = g.base and u.tf = g.tf and u.kmax = g.kmax)
  ), legacy as (
    -- THE jsonb list, exploded WITH ORDINALITY exactly as 037 explodes it.
    select u.base, u.tf, u.dataset_version, u.kmax, u.published_at, u.current_publish_seq,
           e.recipe, e.ordinality,
           public.survivor_legacy_id(u.base, u.tf, u.kmax, e.ordinality) as legacy_survivor_id
      from units u
      cross join lateral pg_catalog.jsonb_array_elements(
             case when pg_catalog.jsonb_typeof(u.survivors) = 'array'
                  then u.survivors else '[]'::jsonb end) with ordinality as e(recipe, ordinality)
  ), minted_here as (
    -- 043's order: published_at asc, dataset_version asc. An earlier generation of the same
    -- rung whose list reaches this ordinality minted the id first.
    select l.*
      from legacy l
     where not exists (
       select 1
         from generations g
        where g.base = l.base
          and g.tf = l.tf
          and g.kmax = l.kmax
          and g.n_legacy >= l.ordinality
          and (g.published_at, g.dataset_version) < (l.published_at, l.dataset_version))
  ), joined as (
    select m.legacy_survivor_id,
           s.survivor_id,
           s.base, s.tf, s.dataset_version, s.kmax, s.config_hash,
           (coalesce(m.recipe -> 'params', '{}'::jsonb) = coalesce(s.params, '{}'::jsonb)
            and coalesce(m.recipe -> 'filters', '{}'::jsonb) = coalesce(s.filters, '{}'::jsonb)
            -- exit: json null, a missing key and {} all mean "the base's own fallback" to
            -- the engine; the writer serialises a missing key as {}.
            and coalesce(nullif(m.recipe -> 'exit', 'null'::jsonb), '{}'::jsonb)
                = coalesce(nullif(s.exit, 'null'::jsonb), '{}'::jsonb)
            and (m.recipe ->> 'verdict') is not distinct from s.verdict) as same_recipe
      from minted_here m
      join public.engine_verdict_survivor s
        on s.base = m.base
       and s.tf = m.tf
       and s.dataset_version = m.dataset_version
       and s.kmax = m.kmax
       and s.publish_seq = m.current_publish_seq
       and s.position = m.ordinality - 1
  ), existing as (
    select j.legacy_survivor_id
      from joined j
      join public.survivor_id_legacy_map x
        on x.legacy_survivor_id = j.legacy_survivor_id
     where j.same_recipe
       and x.survivor_id is distinct from j.survivor_id
  ), written as (
    insert into public.survivor_id_legacy_map as x (
      legacy_survivor_id, survivor_id,
      src_base, src_tf, src_dataset_version, src_kmax, src_config_hash)
    select j.legacy_survivor_id, j.survivor_id,
           j.base, j.tf, j.dataset_version, j.kmax, j.config_hash
      from joined j
     where j.same_recipe
    on conflict (legacy_survivor_id) do update
      set survivor_id = excluded.survivor_id,
          src_base = excluded.src_base,
          src_tf = excluded.src_tf,
          src_dataset_version = excluded.src_dataset_version,
          src_kmax = excluded.src_kmax,
          src_config_hash = excluded.src_config_hash,
          mapped_at = pg_catalog.now()
      where p_replace
        and (x.survivor_id, x.src_config_hash, x.src_dataset_version)
            is distinct from (excluded.survivor_id, excluded.src_config_hash,
                              excluded.src_dataset_version)
    returning (xmax = 0) as is_insert
  )
  select pg_catalog.jsonb_build_object(
           'units', (select pg_catalog.count(*) from units),
           'legacy_ids', (select pg_catalog.count(*) from legacy),
           'minted_here', (select pg_catalog.count(*) from minted_here),
           'joined', (select pg_catalog.count(*) from joined),
           'recipe_mismatch', (select pg_catalog.count(*) from joined where not same_recipe),
           'no_row_at_position',
             (select pg_catalog.count(*) from minted_here) - (select pg_catalog.count(*) from joined),
           'inserted', (select pg_catalog.count(*) from written where is_insert),
           'repointed', (select pg_catalog.count(*) from written where not is_insert),
           'stale', case when p_replace then 0
                         else (select pg_catalog.count(*) from existing) end)
    into v_report;

  return v_report;
end;
$$;

comment on function public.survivor_id_legacy_map_rebuild(text, boolean) is
  'Rebuilds survivor_id_legacy_map from units that have child rows at their '
  'current_publish_seq, joined to their jsonb list on position = ordinality - 1, mapping '
  'only the ids each unit minted (043 rule). Sticky unless p_replace. Operator-only.';

revoke all on function public.survivor_id_legacy_map_rebuild(text, boolean) from public, anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICATION:
--   select public.survivor_id_legacy_map_rebuild();
--     -- recipe_mismatch = 0 and no_row_at_position = 0, or stop.
--   select has_table_privilege('anon', 'public.survivor_id_legacy_map', 'select'),
--          has_table_privilege('authenticated', 'public.survivor_id_legacy_map', 'select');
--                                                                                -- f, f
--   -- every mapped id really is the positional id of its source row:
--   select count(*) from public.survivor_id_legacy_map x
--     join public.engine_verdict_survivor s
--       on s.base = x.src_base and s.tf = x.src_tf and s.dataset_version = x.src_dataset_version
--      and s.kmax = x.src_kmax and s.config_hash = x.src_config_hash
--    where public.survivor_legacy_id(s.base, s.tf, s.kmax, s.position + 1) <> x.legacy_survivor_id;
--                                          -- 0 (until a republish reshuffles; see `stale`)
