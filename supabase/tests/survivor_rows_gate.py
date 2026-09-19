#!/usr/bin/env python3
"""Executed-SQL gate for "one row per survivor" (migrations 050, 051, 052).

It applies the three migrations to a real database INSIDE ONE TRANSACTION THAT IS ALWAYS
ROLLED BACK, with the checks in between:

    begin;
      050 (skipped if already applied)   051 (skipped if already applied)
      survivor_rows_gate_before.sql      M1/M2 checks, engine stand-in for units with no
                                         rows yet, parity, legacy map, snapshot of every RPC
      052                                the read switch
      survivor_rows_gate_after.sql       structure, same outputs, timings, guard behaviour
    rollback;

The migrations' own `begin;` / `commit;` / `notify` lines are removed (exactly one of each is
required, or the script refuses to run): a nested COMMIT would commit the gate itself. It
needs psql only -- no Python driver.

    # a throwaway local PostgreSQL (see survivor_rows_local_baseline.sql):
    python supabase/tests/survivor_rows_gate.py --local --dsn "host=localhost port=55439 user=postgres dbname=surv"

    # production, BEFORE applying 052 (read-only in effect: everything is rolled back):
    PGPASSWORD=... python supabase/tests/survivor_rows_gate.py \
        --dsn "host=db.avdegocswrhzdnvsyiui.supabase.co port=5432 user=postgres dbname=postgres sslmode=require" \
        --paid-uid <uuid of a live subscriber> --sample 200

LOCKS ON PRODUCTION, for the whole run: 052 renames survivor_family_member (ACCESS EXCLUSIVE:
every family RPC waits), and if 050 is not applied yet its ALTER TABLE locks engine_verdicts
(dossier_payload waits). The engine stand-in writes only units that have no child rows. Run
it in a quiet window; it prints its own timings.

Exit code 0 = gate green. Non-zero = a failing check (named in the output) or a SQL error.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
MIG = HERE.parent / "migrations"
M1 = MIG / "050_engine_verdict_survivor.sql"
M2 = MIG / "051_survivor_id_legacy_map.sql"
M3 = MIG / "052_survivor_rows_read_switch.sql"
BEFORE = HERE / "survivor_rows_gate_before.sql"
AFTER = HERE / "survivor_rows_gate_after.sql"


def strip_transaction(path: Path) -> str:
    """The migration without its top-level transaction control."""
    lines = path.read_text(encoding="utf-8").splitlines()
    begins = [i for i, l in enumerate(lines) if l.strip().lower() == "begin;"]
    commits = [i for i, l in enumerate(lines) if l.strip().lower() == "commit;"]
    if len(begins) != 1 or len(commits) != 1:
        raise SystemExit(f"{path.name}: expected exactly one top-level begin; and commit; "
                         f"(found {len(begins)} / {len(commits)}) -- refusing to run")
    kept = [l for i, l in enumerate(lines)
            if i not in (begins[0], commits[0]) and not l.lower().startswith("notify pgrst")]
    body = "\n".join(kept)
    # Belt and braces: nothing left that ends the gate's transaction.
    if re.search(r"^\s*(commit|end|rollback)\s*;", body, re.I | re.M) and not _only_in_bodies(body):
        raise SystemExit(f"{path.name}: transaction control left after stripping -- refusing")
    return body + "\n"


def _only_in_bodies(body: str) -> bool:
    """`end;` lines inside $$...$$ function bodies are plpgsql, not transaction control."""
    outside = re.sub(r"\$(\w*)\$.*?\$\1\$", "", body, flags=re.S)
    return not re.search(r"^\s*(commit|end|rollback)\s*;", outside, re.I | re.M)


def assemble() -> str:
    return "\n".join([
        "\\set ON_ERROR_STOP on",
        "\\pset pager off",
        "begin;",
        "select to_regclass('public.engine_verdict_survivor') is null as need_050 \\gset",
        "\\if :need_050",
        strip_transaction(M1),
        "\\endif",
        "select to_regclass('public.survivor_id_legacy_map') is null as need_051 \\gset",
        "\\if :need_051",
        strip_transaction(M2),
        "\\endif",
        BEFORE.read_text(encoding="utf-8"),
        strip_transaction(M3),
        AFTER.read_text(encoding="utf-8"),
        "rollback;",
        "",
    ])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dsn", default=os.environ.get("SURV_GATE_DSN", ""),
                    help="libpq connection string (password via PGPASSWORD)")
    ap.add_argument("--paid-uid", default="", help="uid of a live subscriber, for the paid arms")
    ap.add_argument("--local", action="store_true",
                    help="local replica: paid uid of the baseline fixture, stand-in writes as engine_telemetry")
    ap.add_argument("--as-writer", action="store_true",
                    help="write the stand-in rows as engine_telemetry (needs SET ROLE rights)")
    ap.add_argument("--psql", default=os.environ.get("PSQL") or shutil.which("psql")
                    or r"C:\Program Files\PostgreSQL\18\bin\psql.exe")
    ap.add_argument("--sample", type=int, default=0,
                    help="check at most N family details and N Lab links per phase (0 = all). "
                         "On production use e.g. 200: 052's rename holds every family RPC "
                         "for the whole run")
    ap.add_argument("--print", action="store_true", help="print the assembled script and exit")
    args = ap.parse_args()

    script = assemble()
    if args.print:
        sys.stdout.buffer.write(script.encode("utf-8"))
        return 0
    if not args.dsn:
        print("--dsn (or SURV_GATE_DSN) is required")
        return 2
    paid = args.paid_uid or ("00000000-0000-0000-0000-00000000beef" if args.local else "")
    as_writer = "on" if (args.as_writer or args.local) else "off"

    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(script)
        path = f.name
    try:
        cmd = [args.psql, "-X", "-q", "-d", args.dsn, "-v", f"paid_uid={paid}",
               "-v", f"as_writer={as_writer}", "-v", f"sample={args.sample or ''}", "-f", path]
        return subprocess.call(cmd)
    finally:
        os.unlink(path)


if __name__ == "__main__":
    sys.exit(main())
