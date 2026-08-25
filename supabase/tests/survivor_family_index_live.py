#!/usr/bin/env python3
"""Executed-SQL gate for the survivor family RPCs.

This exists because the test it replaces could not fail. `survivor_family_payload_contract`
grepped the text of migration 036 and passed 3/3 while production returned PostgreSQL
57014 on every anonymous call: a test that never opens a connection cannot see a
statement timeout, a duplicate identifier, or a payload that moved.

Everything here runs against a real database, inside a transaction that is ALWAYS
rolled back, so it can be pointed at production without writing to it. Applying the
migration takes a SHARE ROW EXCLUSIVE lock on engine_verdicts for the duration: reads
keep working, a concurrent engine publish waits. It takes about 30 s.

    SUPA_PW=... python3 supabase/tests/survivor_family_index_live.py
    SUPA_DSN='host=... user=... password=... dbname=...' python3 .../survivor_family_index_live.py

Exit code 0 = every gate green. Non-zero = at least one gate failed, and the failing
gate is named on stdout.
"""
import os
import statistics
import sys
import time
from pathlib import Path

try:
    import psycopg2
except ImportError:  # pragma: no cover - the harness is only useful with a driver
    print("psycopg2 is required to run the live SQL gate")
    raise

MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "037_survivor_family_index.sql"

# The anon role carries statement_timeout=3s and authenticated 8s. The budgets below
# are deliberately far tighter: a gate that only just passes on today's corpus is a
# gate that fails the week the corpus grows, and it grew by 80% in the days before
# 037 was written.
BUDGET_CATALOG = 1.0
BUDGET_DETAIL = 0.5
BUDGET_ALL_TEASER = 1.0
BUDGET_ALL_SCOPED = 3.0

CUTOFF = "'2026-08-12T19:38:00Z'::timestamptz"

failures: list[str] = []


def dsn() -> str:
    if os.environ.get("SUPA_DSN"):
        return os.environ["SUPA_DSN"]
    pw = os.environ.get("SUPA_PW")
    if not pw:
        print("set SUPA_DSN, or SUPA_PW for the default Supabase direct connection")
        sys.exit(2)
    return ("host=db.avdegocswrhzdnvsyiui.supabase.co port=5432 user=postgres "
            "dbname=postgres sslmode=require connect_timeout=20 password=" + pw)


def check(label: str, ok: bool, detail: str = "") -> None:
    print("   %-5s %-60s %s" % ("PASS" if ok else "FAIL", label, detail))
    if not ok:
        failures.append(label)


def timed(cur, label: str, sql: str, args=None, runs: int = 3):
    times, out = [], None
    for _ in range(runs):
        t0 = time.time()
        cur.execute(sql, args)
        out = cur.fetchall()
        times.append(time.time() - t0)
    med = statistics.median(times)
    print("   %-60s median %6.3fs" % (label, med))
    return med, out


def main() -> int:
    conn = psycopg2.connect(dsn())
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("set statement_timeout = '600s'")
    cur.execute("set lock_timeout = '15s'")

    print("=== applying 037 in a transaction that will be rolled back ===")
    t0 = time.time()
    cur.execute(MIGRATION.read_text(encoding="utf-8"))
    print("   applied in %.2fs" % (time.time() - t0))

    # ---------------------------------------------------------------- reconciliation
    print()
    print("=== reconciliation: every survivor, once, in exactly one family ===")
    cur.execute("""
      select count(*) from public.engine_verdicts v
      cross join lateral pg_catalog.jsonb_array_elements(coalesce(v.survivors,'[]'::jsonb)) e
       where v.published_at is not null
         and v.published_at >= """ + CUTOFF + """
         and v.dataset_version = (select pg_catalog.max(l.dataset_version)
                                    from public.engine_verdicts l
                                   where l.published_at is not null
                                     and l.published_at >= """ + CUTOFF + """)
    """)
    corpus = cur.fetchone()[0]

    cur.execute("""
      select pg_catalog.sum((f ->> 'survivor_count')::int),
             count(*), count(distinct f ->> 'id')
        from pg_catalog.jsonb_array_elements(
               public.survivor_family_catalog() -> 'families') f
    """)
    total, families, ids = cur.fetchone()
    check("family totals equal the live corpus, zero missing, zero double-counted",
          total == corpus, "families sum=%s corpus=%s" % (total, corpus))
    check("no family id is served twice", families == ids,
          "%d families, %d distinct ids" % (families, ids))

    cur.execute("""
      select count(*) from (
        select family_id from public.survivor_family_member
         where published_at >= """ + CUTOFF + """
         group by family_id having count(distinct pg_catalog.lower(base)) > 1) t
    """)
    check("no family mixes two source strategies", cur.fetchone()[0] == 0)

    cur.execute("""
      select count(*), count(distinct survivor_id) from public.survivor_family_member
       where published_at is not null and published_at >= """ + CUTOFF + """
         and dataset_version = (select pg_catalog.max(dataset_version)
                                  from public.survivor_family_member
                                 where published_at >= """ + CUTOFF + """)
    """)
    n, distinct = cur.fetchone()
    check("every survivor carries its own id", n == distinct,
          "%d survivors, %d ids" % (n, distinct))

    # ---------------------------------------------------------------------- budgets
    print()
    print("=== time budgets (anon gets 3 s, a signed-in caller 8 s) ===")
    cat, _ = timed(cur, "survivor_family_catalog",
                   "select pg_catalog.md5(public.survivor_family_catalog()::text)")
    check("catalog under %.1f s" % BUDGET_CATALOG, cat < BUDGET_CATALOG, "%.3fs" % cat)

    cur.execute("select (public.survivor_family_catalog() -> 'families' -> 0 ->> 'id')")
    family_id = cur.fetchone()[0]
    det, _ = timed(cur, "survivor_family_detail, largest family",
                   "select pg_catalog.length(public.survivor_family_detail(%s)::text)", (family_id,))
    check("a family page under %.1f s" % BUDGET_DETAIL, det < BUDGET_DETAIL, "%.3fs" % det)

    unknown, _ = timed(cur, "survivor_family_detail, unknown id",
                       "select public.survivor_family_detail('fam_nope') is null")
    check("an unknown family does not scan the corpus", unknown < 0.2, "%.3fs" % unknown)

    teaser, _ = timed(cur, "survivor_family_all, teaser",
                      "select pg_catalog.length(public.survivor_family_all()::text)", None, 2)
    check("exhaustive teaser under %.1f s" % BUDGET_ALL_TEASER,
          teaser < BUDGET_ALL_TEASER, "%.3fs" % teaser)

    # ------------------------------------------------------------------ entitlement
    print()
    print("=== the paid boundary, decided by auth.uid() and nothing else ===")
    cur.execute("""
      select s.user_id from public.subscriptions s
       where s.status = 'active'
         and (s.current_period_end is null or s.current_period_end > pg_catalog.now())
       limit 1
    """)
    row = cur.fetchone()

    cur.execute("select set_config('request.jwt.claims', '', true)")
    cur.execute("select public.survivor_family_detail(%s) ->> 'access', "
                "pg_catalog.jsonb_array_length(public.survivor_family_detail(%s) -> 'variants')",
                (family_id, family_id))
    access, variants = cur.fetchone()
    check("anonymous gets a teaser and zero variants on a paid family",
          access == "teaser" and variants == 0, "access=%s variants=%s" % (access, variants))

    cur.execute("""
      select f ->> 'id' from pg_catalog.jsonb_array_elements(
        public.survivor_family_catalog() -> 'families') f
       where f ->> 'strategy' = 'EMAcross' limit 1
    """)
    ema = cur.fetchone()
    if ema:
        cur.execute("select public.survivor_family_detail(%s) ->> 'access', "
                    "pg_catalog.jsonb_array_length(public.survivor_family_detail(%s) -> 'variants')",
                    (ema[0], ema[0]))
        access, variants = cur.fetchone()
        check("EMAcross, the free sample, stays fully open to anonymous",
              access == "full" and variants > 0, "access=%s variants=%s" % (access, variants))
    else:
        check("an EMAcross family is present to check the free sample against", False)

    cur.execute("""
      select count(*) from pg_catalog.jsonb_array_elements(
        public.survivor_family_catalog() -> 'families') f
       where f ?| array['params','filters','exit','variants','recipe']
    """)
    check("no paid key reaches the catalog payload", cur.fetchone()[0] == 0)

    if row:
        uid = str(row[0])
        cur.execute("select set_config('request.jwt.claims', '{\"sub\":\"' || %s || '\"}', true)", (uid,))
        cur.execute("select public.survivor_family_detail(%s) ->> 'access', "
                    "pg_catalog.jsonb_array_length(public.survivor_family_detail(%s) -> 'variants')",
                    (family_id, family_id))
        access, variants = cur.fetchone()
        check("an active subscriber gets the full variants", access == "full" and variants > 0,
              "access=%s variants=%s" % (access, variants))

        cur.execute("select pg_catalog.min(pg_catalog.lower(base)) from public.survivor_family_member")
        strategy = cur.fetchone()[0]
        scoped, out = timed(cur, "survivor_family_all, paid, scoped to one strategy",
                            "select pg_catalog.length(public.survivor_family_all(null, %s)::text), "
                            "public.survivor_family_all(null, %s) ->> 'access'",
                            (strategy, strategy), 2)
        check("scoped exhaustive view under %.1f s" % BUDGET_ALL_SCOPED,
              scoped < BUDGET_ALL_SCOPED, "%.3fs, %s bytes" % (scoped, out[0][0]))
        check("scoped exhaustive view still reports full access", out[0][1] == "full", str(out[0]))
        cur.execute("select set_config('request.jwt.claims', '', true)")
    else:
        check("an active subscription exists to exercise the paid branch with", False,
              "none found in this database")

    # ------------------------------------------------------------------ the closure
    print()
    print("=== the index table holds paid recipes, so it stays shut ===")
    for role in ("anon", "authenticated"):
        cur.execute("select has_table_privilege(%s, 'public.survivor_family_member', 'select')", (role,))
        check("%s cannot select survivor_family_member" % role, cur.fetchone()[0] is False)
    cur.execute("select relrowsecurity from pg_class where oid = 'public.survivor_family_member'::regclass")
    check("row level security is on", cur.fetchone()[0] is True)
    cur.execute("select count(*) from pg_policies where tablename = 'survivor_family_member'")
    check("no policy exists, so RLS denies every row", cur.fetchone()[0] == 0)

    cur.execute("""
      select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'survivor_family_all'
    """)
    check("survivor_family_all is not overloaded, so PostgREST cannot pick the wrong one",
          cur.fetchone()[0] == 1)

    # --------------------------------------------------------------------- the sync
    print()
    print("=== the trigger keeps the index true ===")
    cur.execute("select base, tf, dataset_version, kmax from public.engine_verdicts "
                "where published_at >= " + CUTOFF + " order by base, tf, kmax limit 1")
    unit = cur.fetchone()
    fingerprint = ("select count(*), pg_catalog.md5(pg_catalog.string_agg("
                   "survivor_id || family_id, ',' order by ordinality)) "
                   "from public.survivor_family_member "
                   "where base=%s and tf=%s and dataset_version=%s and kmax=%s")
    cur.execute(fingerprint, unit)
    before = cur.fetchone()
    cur.execute("update public.engine_verdicts set published_at = published_at "
                "where base=%s and tf=%s and dataset_version=%s and kmax=%s", unit)
    cur.execute(fingerprint, unit)
    check("an UPDATE rebuilds that unit identically", before == cur.fetchone(), str(before))

    cur.execute("delete from public.engine_verdicts "
                "where base=%s and tf=%s and dataset_version=%s and kmax=%s", unit)
    cur.execute("select count(*) from public.survivor_family_member "
                "where base=%s and tf=%s and dataset_version=%s and kmax=%s", unit)
    check("a DELETE drops that unit from the index", cur.fetchone()[0] == 0)

    # ------------------------------------------------------------------- signature
    print()
    print("=== the signature is total: a non-object params/filters/exit must not raise ===")
    for shape in ('{"params":{},"filters":{},"exit":null}',
                  '{"params":null,"filters":[],"exit":"nope"}',
                  '{}'):
        try:
            cur.execute("select public.survivor_family_signature('X', %s::jsonb) is not null", (shape,))
            check("signature survives %s" % shape, cur.fetchone()[0] is True)
        except Exception as exc:  # noqa: BLE001 - the whole point is to catch anything
            conn.rollback()
            check("signature survives %s" % shape, False, str(exc).splitlines()[0])
            print("   transaction aborted by the raise; remaining gates skipped")
            break

    conn.rollback()
    cur.execute("select to_regclass('public.survivor_family_member') is null")
    print()
    print("rolled back; the index table is gone again:", cur.fetchone()[0])

    if failures:
        print()
        print("RESULT: FAIL — %d gate(s) failed: %s" % (len(failures), "; ".join(failures)))
        return 1
    print()
    print("RESULT: PASS — every gate green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
