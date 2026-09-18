-- 048_survivor_family_member_aggregate_index.sql
--
-- ⚠️ THIS ONE CANNOT BE PASTED INTO THE SUPABASE SQL EDITOR.
--
-- CREATE INDEX CONCURRENTLY and VACUUM both refuse to run inside a transaction block, and
-- the SQL editor wraps what it sends. The failure is explicit -- "cannot run inside a
-- transaction block" -- so nothing is half-applied, but nothing is applied either.
--
-- Run it with a direct client instead, one statement at a time. psql 18.1 is installed on
-- the perso machine at "C:\Program Files\PostgreSQL\18\bin\psql.exe"; the connection string
-- is the one Supabase publishes under Project Settings -> Database -> Connection string
-- (session mode, port 5432 -- NOT the transaction pooler on 6543, which cannot hold the
-- session-level state these statements need):
--
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" "<connection string>" -f 048_....sql
--
-- If the direct connection is not reachable, the fallback is a plain VACUUM and a
-- non-concurrent CREATE INDEX during a quiet minute -- but a non-concurrent build takes an
-- exclusive lock on a table the publication trigger writes to, so it is a deliberate
-- choice, not a shortcut to take without noticing.
--
-- Why an index at all, when 047's comment says nothing needs indexing.
--
-- Those are two different costs and only one of them is the correlation. Measured on the
-- live database on 2026-09-18:
--
--   count(*) with a CORRELATED dataset predicate ... 13.48 s instrumented, 569 984 buffers
--   count(*) with a CONSTANT dataset predicate ....   2.29 s
--
-- 047 removes the first. The second is the floor, and it is pure width: the table is
-- 182 MB of data for 136 661 rows, i.e. 1.33 KB per row, almost all of it the `recipe` and
-- `signature` jsonb columns. The aggregate reads base, tf, dataset_version, published_at,
-- family_id and exit_keys_txt -- a few dozen bytes -- yet a heap scan drags every recipe
-- through memory to get them.
--
-- This index carries exactly those columns, so the aggregate can be answered by an
-- index-only scan over roughly 15 MB instead of 182 MB. The number to beat, end to end on
-- survivor_strategy_summary(null): 2.3 s without it, a few hundred ms with it. If the
-- measurement does not show that, DROP IT -- an index that does not earn its write
-- amplification on a table a publication trigger writes to is a liability, not a hedge.
--
-- The leading columns are (base, tf) rather than (dataset_version, ...) on purpose: the
-- `current_generation` CTE of 047 groups by (base, tf) and takes max(dataset_version),
-- which this ordering answers directly. The two indexes created by 037
-- (dataset_version, published_at) and (dataset_version, lower(base)) are left alone --
-- other callers use them, and nothing here replaces them.
--
-- ---------------------------------------------------------------------------
-- The vacuum is not housekeeping, it is the precondition.
--
-- On 2026-09-18 this table reported last_vacuum = NULL AND last_autovacuum = NULL, with
-- n_dead_tup = 0. No bloat, but also no visibility map -- and PostgreSQL cannot serve an
-- index-only scan without one: it falls back to visiting the heap for every tuple, which
-- is exactly the 182 MB this index exists to avoid. Creating the index without vacuuming
-- first would produce a measurement showing "the index changes nothing", and the wrong
-- conclusion would be drawn from it.
--
-- A plain VACUUM takes no lock that blocks reads or writes. It is not VACUUM FULL, which
-- would rewrite the table and take an exclusive lock -- do not substitute one for the other.

-- Statement 1. Build the visibility map (and refresh the planner's statistics, last
-- computed on 2026-09-11 while rows were published until 2026-09-14).
vacuum (analyze) public.survivor_family_member;

-- Statement 2. The covering index. CONCURRENTLY so the publication trigger keeps writing
-- while it builds; expect a few minutes on 136 661 rows.
create index concurrently if not exists survivor_family_member_aggregate_idx
  on public.survivor_family_member (base, tf, dataset_version, published_at)
  include (family_id, exit_keys_txt);

-- Statement 3. A CONCURRENTLY build that is interrupted leaves an INVALID index behind: it
-- costs write amplification and serves no read. Check, and if `indisvalid` is false, drop
-- it and build again rather than leaving it in place.
select indexrelid::regclass as index_name,
       indisvalid,
       pg_size_pretty(pg_relation_size(indexrelid)) as size
  from pg_index
 where indrelid = 'public.survivor_family_member'::regclass
 order by index_name;

comment on index public.survivor_family_member_aggregate_idx is
  'Covering index for survivor_strategy_summary: lets the strategy aggregate run as an '
  'index-only scan over ~15 MB instead of a heap scan over 182 MB of jsonb recipes it '
  'never reads. Needs the visibility map, so the table must stay vacuumed.';
