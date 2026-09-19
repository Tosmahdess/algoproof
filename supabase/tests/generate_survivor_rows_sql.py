#!/usr/bin/env python3
"""Fills the generated blocks of the "one row per survivor" SQL from the live migrations.

Nothing below is retyped by hand. Function bodies are cut out of the migration that holds
their CURRENT definition, and every swap asserts it happened exactly once:

  052_survivor_rows_read_switch.sql
    dossier_payload             044 + ONE hunk (the source of `survivors`)
  supabase/manual/survivor_rows_rollback.sql, section M3
    survivor_family_index_sync  037 verbatim
    backfill for rows units     037's backfill INSERT, restricted to rows-mode units
    dossier_payload             044 verbatim
    survivor_lab_preset         043 verbatim (NOT 037/039/040: 043 is the live one)

    python supabase/tests/generate_survivor_rows_sql.py          # rewrite in place
    python supabase/tests/generate_survivor_rows_sql.py --check  # exit 1 if stale
"""
import re
import sys
from pathlib import Path

SUPA = Path(__file__).resolve().parents[1]
MIG = SUPA / "migrations"
M037 = MIG / "037_survivor_family_index.sql"
M043 = MIG / "043_generation_scoped_survivors.sql"
M044 = MIG / "044_dossier_payload_per_pair_generation.sql"
M052 = MIG / "052_survivor_rows_read_switch.sql"
ROLLBACK = SUPA / "manual" / "survivor_rows_rollback.sql"

OLD_SOURCE = """                   from pg_catalog.jsonb_array_elements(
                          coalesce(v.survivors, '[]'::jsonb)) e
               )
"""

NEW_SOURCE = """                   -- 052: THE ONLY CHANGE TO 044. `e` is the unit's jsonb list entry, or
                   -- the same entry rebuilt from its child row when the unit's rows are
                   -- authoritative (survivors_storage = 'rows', current_publish_seq set;
                   -- 050's guard makes that mean "complete"). Exactly one branch runs per
                   -- unit: each is gated by a predicate on `v` alone (a one-time filter).
                   from (
                     select j.e
                       from pg_catalog.jsonb_array_elements(
                              coalesce(v.survivors, '[]'::jsonb)) j(e)
                      where not (v.survivors_storage is not distinct from 'rows'
                                 and v.current_publish_seq is not null)
                     union all
                     select public.engine_verdict_survivor_entry(s)
                       from public.engine_verdict_survivor s
                      where v.survivors_storage is not distinct from 'rows'
                        and v.current_publish_seq is not null
                        and s.base = v.base
                        and s.tf = v.tf
                        and s.dataset_version = v.dataset_version
                        and s.kmax = v.kmax
                        and s.publish_seq = v.current_publish_seq
                   ) src(e)
               )
"""

BACKFILL_FROM = """  from public.engine_verdicts v
  cross join lateral pg_catalog.jsonb_array_elements(
         coalesce(v.survivors, '[]'::jsonb)) with ordinality as e(recipe, ordinality)
  cross join lateral (
    select public.survivor_family_signature(v.base, e.recipe) as signature
  ) s;
"""
BACKFILL_TO = """  from public.engine_verdicts v
  cross join lateral pg_catalog.jsonb_array_elements(
         coalesce(v.survivors, '[]'::jsonb)) with ordinality as e(recipe, ordinality)
  cross join lateral (
    select public.survivor_family_signature(v.base, e.recipe) as signature
  ) s
 -- rollback of 052: only the units 052 kept out of this table
 where v.survivors_storage is not distinct from 'rows'
   and v.current_publish_seq is not null;
"""


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")  # universal newlines: CRLF sources become LF


def function_block(text: str, name: str, source: Path) -> str:
    pat = r"create or replace function public\." + re.escape(name) + r"\(.*?\n\$\$;\n"
    found = re.findall(pat, text, re.S)
    if len(found) != 1:
        raise SystemExit(f"{name}: expected exactly one definition in {source.name}, found {len(found)}")
    return found[0]


def swap_once(text: str, old: str, new: str, what: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f"{what}: expected exactly one hunk, found {text.count(old)}")
    return text.replace(old, new)


def blocks() -> dict:
    t037, t043, t044 = read(M037), read(M043), read(M044)
    dossier = function_block(t044, "dossier_payload", M044)
    # 037's section 4 only: its trigger body holds a similar INSERT.
    section4 = t037[t037.index("truncate table public.survivor_family_member;"):]
    backfill = re.findall(r"insert into public\.survivor_family_member \(\n.*?\) s;\n", section4, re.S)
    if len(backfill) != 1:
        raise SystemExit(f"037 backfill: expected exactly one, found {len(backfill)}")
    return {
        (M052, "044 dossier_payload + survivors hunk"):
            swap_once(dossier, OLD_SOURCE, NEW_SOURCE, "044 survivors source"),
        (ROLLBACK, "037 survivor_family_index_sync"):
            function_block(t037, "survivor_family_index_sync", M037),
        (ROLLBACK, "037 backfill for rows-mode units"):
            swap_once(backfill[0], BACKFILL_FROM, BACKFILL_TO, "037 backfill"),
        (ROLLBACK, "044 dossier_payload"): dossier,
        (ROLLBACK, "043 survivor_lab_preset"): function_block(t043, "survivor_lab_preset", M043),
    }


def fill(text: str, label: str, body: str) -> str:
    begin = f"-- >>> generated: {label}\n"
    end = "-- <<< end generated\n"
    pat = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    if len(pat.findall(text)) != 1:
        raise SystemExit(f"marker '{label}': expected exactly one block")
    return pat.sub(lambda _: begin + body + end, text)


def main() -> int:
    outputs = {M052: read(M052), ROLLBACK: read(ROLLBACK)}
    before = dict(outputs)
    for (path, label), body in blocks().items():
        outputs[path] = fill(outputs[path], label, body)
    stale = [p.name for p in outputs if outputs[p] != before[p]]
    if "--check" in sys.argv:
        if stale:
            print("stale:", ", ".join(stale), "-- run python supabase/tests/generate_survivor_rows_sql.py")
            return 1
        print("generated blocks match 037/043/044")
        return 0
    for path, text in outputs.items():
        path.write_text(text, encoding="utf-8", newline="\n")
    print("wrote", ", ".join(p.name for p in outputs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
