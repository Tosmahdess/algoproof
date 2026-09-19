# One row per survivor: apply order, gates, rollback

`engine_verdicts.survivors` holds every GO_PAPER + MARGINAL of a unit as one jsonb value,
rewritten whole at each publish and re-exploded by `survivor_family_index_sync` (037). A
16.3 MB value restarted production Postgres on 2026-09-18, and an H4 unit reached 26.4 MB.
The engine (vault branch `feat/survivor-rows`, flag `APEX_PUBLISH_CHILD_ROWS=1`) now writes
one row per survivor into `engine_verdict_survivor`, in batches of 500, in one transaction
per publication: rows (new `publish_seq`) → header (`current_publish_seq`,
`survivors_storage = 'rows'`, matched on `report_checksum`) → purge of the old seq.

| File | Step | What it does |
|---|---|---|
| `050_engine_verdict_survivor.sql` | M1 | Child table, family trigger, header columns, storage guard, purge on demotion, positional-id function, 037's trigger narrowed |
| `051_survivor_id_legacy_map.sql` | M2 | Positional id → public HMAC id map, and its rebuild function |
| `052_survivor_rows_read_switch.sql` | M3 | The read switch: `survivor_family_member` becomes a view, `dossier_payload` and `survivor_lab_preset` read child rows for rows-mode units |
| `../manual/survivor_rows_rollback.sql` | — | Rollback of M3, M2, M1, one section each |
| `../tests/survivor_rows_gate.py` | — | Executed gate: applies 050/051/052 in one rolled-back transaction and compares every RPC output before/after |
| `../tests/survivor_rows_parity_live.sql` | — | Read-only parity queries on the engine's real rows |
| `../tests/survivor_rows_contract.test.ts` | — | Static checks (vitest) |
| `../tests/generate_survivor_rows_sql.py` | — | Rebuilds the blocks copied from 037/043/044; `--check` in CI |

## Apply order

Each step is gated on the one before. "Live" means measured on production, not assumed.

### 1. M1 — `050` (additive, nothing reads it)

Apply when no engine publish is in flight (it takes a short ACCESS EXCLUSIVE lock on
`engine_verdicts`; `lock_timeout` is 5 s, re-run if it trips). Then check the verification
block at the end of the file. Must be true live before going on:

- `engine_telemetry` has INSERT/UPDATE/DELETE and column SELECT on the child table, EXECUTE on
  `survivor_legacy_id`, UPDATE on the two header columns, and the writer policy exists.
- `anon` / `authenticated` have nothing on the child table.
- `survivor_family_index_sync` reads `AFTER INSERT OR DELETE OR UPDATE OF base, tf, ...`.

### 2. Engine flag on, then backfill

`APEX_PUBLISH_CHILD_ROWS=1` and `APEX_SURVIVOR_ID_KEY` on the box; `backfill_survivor_rows.py`
for the units already published. Every successful child write sets `survivors_storage = 'rows'`
— that is harmless before 052, nothing reads it. Watch the engine log for
`child rows NOT written` (the guard raises when rows ≠ `n_go + n_marginal`).

**The engine must also write `data_window`** (the entry's `"window"`). It is not in the
contract column list; without it the rebuilt entry lacks `window` and the Lab loses its
replay window for every dataset except `data_20260802` (`LEGACY_WINDOWS` in
`algolab web/lib/survivor-lab-preset.ts`). Parity query 5 reports it as `value_diff`.

### 3. M2 — `051`, then build the map

```sql
-- one base per call, never the whole corpus at once
select public.survivor_id_legacy_map_rebuild('<base>');
```

**Base by base.** On 2026-09-19 the single all-bases call (188 550 rows) filled the Supabase
disk with temp files (DiskFull, instance read-write again after a `VACUUM FULL` of
`survivor_family_member_jsonb`). Called once per base it took 0 to 9 s each and grew the
database by 50 MB in total (`manual/logs/2026-09-19_051_map_rebuild_by_base.txt`).

`recipe_mismatch = 0` and `no_row_at_position = 0`, or stop. Rebuild again after any
backfill or before 052; it is idempotent and sticky (it never re-points an id it has
already mapped unless `p_replace => true`).

### 4. Parity — before 052

- `survivor_rows_parity_live.sql`: queries 2, 3, 4, 6 return no rows; query 5 has
  `recipe_diff = 0` and `value_diff = 0` everywhere (`text_diff` is tolerated: an engine float
  written `2.0` comes back `2`, equal as jsonb, it only moves that entry in the dossier's
  neutral order).
- `survivor_rows_gate.py` against production, with a live subscriber's uid:
  ```
  PGPASSWORD=... python supabase/tests/survivor_rows_gate.py \
      --dsn "host=db.avdegocswrhzdnvsyiui.supabase.co port=5432 user=postgres dbname=postgres sslmode=require" \
      --paid-uid <uuid> --sample 200
  ```
  Everything is rolled back. While it runs, 052's rename blocks the family RPCs (about 7 min
  locally at 219 k survivors with `--sample 200`): run it in a quiet window. Exit 0 = green.
  It fails on any output difference other than (a) the `survivor_id` field of family
  variants (positional → public id, by design) and (b) text that is equal as jsonb (WARN).
  Its timings are reported, not gated: calls made from plpgsql inside one long transaction
  are distorted (same catalogue call, unchanged database: 0.38 s top-level, 3.7 s from a DO
  block).
- **Timings, the representative way**: on a committed copy of production (Supabase branch or
  restored dump), apply 050/051, backfill, 052, `VACUUM ANALYZE`, then time the RPCs as
  top-level `select`. Local 219 k-survivor replica, before → after 052: catalogue 0.37 →
  0.45 s, strategy summary 0.30 → 0.41 s, scoped catalogue 0.30 → 0.43 s, preview 0.25 →
  0.30 s, dossier 0.25 → 0.29 s (only 59 of 168 units in rows mode there; measure with all
  of them). anon's `statement_timeout` is 3 s.

### 5. M3 — `052`, the read switch

Its header lists the same preconditions. Right after it, outside any transaction:
`vacuum analyze public.survivor_family_member_jsonb; vacuum analyze public.engine_verdict_survivor;`
(052 deletes the rows-mode units' rows from the jsonb side). The switch is per unit: a unit reads child rows iff
`survivors_storage = 'rows' and current_publish_seq is not null`; any unit can be turned
back with `update engine_verdicts set survivors_storage = null where <unit>` (its child rows
are purged, the jsonb list serves again). After applying, check the verification block and
the pages: `/cockpit/survivants`, a `/cockpit/dossier/<base>`, a `/lab?survivor=` link shared
before the switch (it must load the same recipe).

### 6. Later — cutting the jsonb list

Not part of this change. Before the engine stops writing `survivors` for a unit, the map must
hold that unit's positional ids (step 3), because 052's positional fallback needs the
jsonb side (or the child rows) to find a minting generation. The M3 rollback becomes lossy
for a unit the day its jsonb list is cut.

## Rollback, per step

All in `supabase/manual/survivor_rows_rollback.sql`, one section per step, newest first.

| Undo | How | Loses |
|---|---|---|
| Engine flag (any time) | Unset `APEX_PUBLISH_CHILD_ROWS`, then `update engine_verdicts set survivors_storage = null where survivors_storage = 'rows';` | Every child row: 050's purge trigger deletes the rows of each demoted unit. Re-enabling means re-running the backfill. With 052 applied, each demotion re-explodes that unit's jsonb list (037's cost, once per unit). |
| M3 (`052`) | Section M3: drops the view, renames the table back, restores 037's trigger function and 044's `dossier_payload` / 043's `survivor_lab_preset` verbatim, re-explodes the rows-mode units from jsonb | Nothing while the jsonb lists are written in full. Units whose jsonb was deferred (8 MB breaker) or cut come back with that (empty) list. |
| M2 (`051`) | Section M2 (only with M3 undone) | The recorded positional-id mappings. |
| M1 (`050`) | Section M1 (flag off first; only with M2, M3 undone) | All child rows and the two header columns. |

Verified on a local replica: apply 050 → rows → 051 → 052 → the three rollback sections
restores `survivor_family_member` byte for byte (md5 over all rows), the catalogue md5 and the
Lab presets. `dossier_payload`'s units come back identical but possibly in another ORDER:
044 has no `order by` on units, so their order is heap order and moves whenever a row of
`engine_verdicts` is updated — which is why the gate compares dossiers unit by unit, never
by whole-payload md5.

## Decisions taken here

- **Uniqueness.** `(survivor_id, dataset_version)` unique: the public id is stable across
  generations, so it repeats once per generation and never inside one (the engine hashes base,
  tf and rung into it). `(base, tf, dataset_version, kmax, publish_seq, position)` unique: one
  dense order per publication, which the positional ids hang on. `current_publish_seq` unique
  on `engine_verdicts`.
- **Where the "rows are complete" rule lives.** At write time, in `engine_verdicts_survivor_rows_guard`
  (050), not in the readers: promotion requires rows = `n_go + n_marginal` (else it raises and
  the engine's transaction rolls back), and a newer verdict row landing without its rows demotes
  the unit on the spot. Readers only test `survivors_storage = 'rows'`.
- **Why demotion deletes the rows.** 052's view must be a UNION ALL of two unfiltered tables:
  PostgreSQL does not flatten a UNION ALL member that has a WHERE clause, and the family RPCs'
  per-row correlated "newest dataset of the pair" then sorts the whole pair per row. First
  draft, measured on a 219 k-survivor replica: `survivor_family_catalog` from 0.37 s to more
  than 60 s. With both branches unfiltered: ~0.45 s.
- **`unit_published_at`.** The view's `published_at` is the unit's publication time (stamped by
  050's trigger), not the child write time: a backfilled pre-cutoff unit would otherwise pass
  the readers' 2026-08-12 freshness filter. The gate caught it.
- **Dossier order.** `order by md5(e::text)` is kept, over the rebuilt entry. Identical order
  whenever the rebuilt text is identical; the site does not depend on the permutation anyway
  (full arm re-sorted by `neutralOrder(configKey)`, teaser arm keyed on `k` with input order
  as tie-break).
- **Lab permalinks.** Public id → newest generation of that recipe. Positional id → the map
  (exact source row while current, else the same recipe newest) → else 043's rule over both
  storages (generation that minted it).
