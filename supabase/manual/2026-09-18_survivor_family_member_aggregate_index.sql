-- 2026-09-18_survivor_family_member_aggregate_index.sql
--
-- ⚠️ NOT A MIGRATION, AND DELIBERATELY NOT IN supabase/migrations/.
--
-- `run_migration.mjs` reads a file and hands the WHOLE thing to `client.query(sql)` (l. 41),
-- i.e. a single multi-command string. The Supabase SQL editor does the same with whatever
-- is pasted into it. PostgreSQL refuses VACUUM and CREATE INDEX CONCURRENTLY there --
-- "cannot be executed from a function or multi-command string" -- so a file containing them
-- can never be replayed by this project's runner. Left in migrations/, it would be a trap
-- for whoever replays the folder: the failure is at statement 1, nothing applies, and there
-- is no migration state table to repair afterwards (the runner is generic).
--
-- HOW TO RUN IT: one statement per execution. Select statement 1 alone, run it; then
-- statement 2 alone; and so on. In the SQL editor that means selecting the text of a single
-- statement before hitting run. With psql (18.1 is installed on the perso machine at
-- "C:\Program Files\PostgreSQL\18\bin\psql.exe"), open an interactive session against the
-- connection string from Project Settings -> Database -> Connection string, session mode,
-- port 5432 -- NOT the transaction pooler on 6543 -- and paste them one at a time.
--
-- ---------------------------------------------------------------------------
-- WHY AN INDEX, when 047's comment says nothing needs indexing for the correlation.
--
-- Two different costs, and only one of them is the correlation. Measured on the live
-- database on 2026-09-18:
--
--   count(*) with a CORRELATED dataset predicate ... 13.48 s instrumented, 569 984 buffers
--   count(*) with a CONSTANT dataset predicate ....   2.29 s
--
-- 047 removes the first. The second is the floor, and it is pure width: 182 MB of data for
-- 136 661 rows, i.e. 1.33 KB per row, almost all of it the `recipe` and `signature` jsonb
-- columns. The aggregate reads base, tf, dataset_version, published_at, family_id and
-- exit_keys_txt -- a few dozen bytes -- yet a heap scan drags every recipe through memory to
-- get them.
--
-- This index carries exactly those columns, at an estimated 17-20 MB. The point is less the
-- bytes read than what fits in cache: 20 MB stays resident on a small compute, 182 MB does
-- not. WHETHER the planner then chooses an index-only scan is a measurement, not a promise --
-- see the acceptance check at the end. If it does not, DROP IT: an index that does not earn
-- its write amplification on a table a publication trigger rewrites is a liability.
--
-- The leading columns are (base, tf) rather than (dataset_version, ...) on purpose: the
-- `current_generation` CTE of 047 groups by (base, tf), so this ordering lets that aggregate
-- run without a sort, and it is also the right order for the nested loop the planner may
-- choose for the corpus join. It is a full scan of the index either way -- PostgreSQL has no
-- loose index scan -- so the gain comes from the width, not from the order.
--
-- The two indexes created by 037, (dataset_version, published_at) and
-- (dataset_version, lower(base)), are left alone: other callers use them.
--
-- ---------------------------------------------------------------------------
-- WHY THE VACUUM, and why it is not enough on its own.
--
-- On 2026-09-18 this table reported last_vacuum = NULL AND last_autovacuum = NULL, with
-- n_dead_tup = 0. No bloat -- and no visibility map either. PostgreSQL cannot serve an
-- index-only scan without one: it visits the heap for every tuple, which is exactly the
-- 182 MB this index exists to avoid. Building the index without vacuuming first would
-- produce a measurement showing "the index changes nothing", and the wrong conclusion would
-- be drawn from it.
--
-- And it will degrade again on its own. The publication trigger DELETEs then INSERTs a whole
-- unit at a time (037), so every publication clears the all-visible bit on the pages it
-- touches. The default autovacuum threshold here is 50 + 0.2 x 136 661, about 27 000 dead
-- tuples -- and `last_autovacuum = NULL` proves that threshold has never once been reached.
-- Statement 2 lowers it for this table only. It is a storage parameter: it takes a brief
-- SHARE UPDATE EXCLUSIVE lock, and it does not touch the trigger or the engine's write path.

-- ---------------------------------------------------------------------------
-- Statement 1. Build the visibility map, and refresh statistics last computed on
-- 2026-09-11 while rows kept being published until 2026-09-14.
-- A plain VACUUM blocks no read and no write. It is NOT VACUUM FULL, which would rewrite
-- the table under an exclusive lock -- do not substitute one for the other.
-- It does take SHARE UPDATE EXCLUSIVE, so it queues behind any other VACUUM, CREATE INDEX
-- or ALTER TABLE on this table, and vice versa.
vacuum (analyze) public.survivor_family_member;

-- Statement 2. Keep the visibility map alive between publications.
alter table public.survivor_family_member set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 500
);

-- Statement 3. The covering index. CONCURRENTLY so the publication trigger keeps writing.
-- The build itself takes seconds on 136 661 rows; what is unbounded is the wait -- CIC
-- finishes by waiting for every transaction older than its snapshot to end, so if the engine
-- publishes inside a long transaction this sits there saying nothing. Watch it rather than
-- guess: select phase, lockers_total, lockers_done, current_locker_pid
--                from pg_stat_progress_create_index;
create index concurrently if not exists survivor_family_member_aggregate_idx
  on public.survivor_family_member (base, tf, dataset_version, published_at)
  include (family_id, exit_keys_txt);

-- Statement 4. An interrupted CONCURRENTLY build leaves an INVALID index behind: it costs
-- write amplification on every publication and serves no read.
-- ⚠️ AND `IF NOT EXISTS` above will then see it and do NOTHING, silently, on every retry.
-- So if `indisvalid` is false here, the retry is: drop it first, outside a multi-command
-- string like everything else --
--     drop index concurrently public.survivor_family_member_aggregate_idx;
-- and only then run statement 3 again.
select indexrelid::regclass as index_name,
       indisvalid,
       pg_size_pretty(pg_relation_size(indexrelid)) as size
  from pg_index
 where indrelid = 'public.survivor_family_member'::regclass
 order by index_name;

-- Statement 5. Acceptance. The criterion is NOT the clock -- a timing also measures how busy
-- the instance is. It is `Heap Fetches: 0` on an Index Only Scan: that, and only that, says
-- the 182 MB are no longer being traversed.
explain (analyze, buffers)
select m.base, m.tf, pg_catalog.max(m.dataset_version)
  from public.survivor_family_member m
 where m.published_at is not null
   and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
 group by m.base, m.tf;

comment on index public.survivor_family_member_aggregate_idx is
  'Covering index for survivor_strategy_summary: lets the strategy aggregate run as an '
  'index-only scan over ~20 MB instead of a heap scan over 182 MB of jsonb recipes it never '
  'reads. Needs the visibility map, which is why this table carries lowered autovacuum '
  'thresholds: the publication trigger deletes and reinserts whole units.';
