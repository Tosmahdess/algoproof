"""Verify migration 032 from outside, the way a caller sees it.

Run:  python supabase/verify_032.py
Env:  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
      (read from env.local if present; never hardcode)

A grant statement that ran without error is not the same claim as the object
answering correctly (migration 030's banner). This asserts the answers.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

MIGRATION = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "migrations", "032_dossier_payload.sql"
)

# Mirrors CORRECTED_ENGINE_SINCE in algolab web/lib/engine-freshness.ts:31 and c_cutoff in
# the migration. The TS copy is pinned by a test in that repo; check 0 below pins the SQL
# copy against this one, so all three move together or the verifier says which file lags.
CUTOFF = "2026-08-12T19:38:00Z"

RECIPE_KEYS = {"params", "filters", "exit"}
TEASER_KEYS = {"k", "dd", "pf", "wf", "n_trades", "eligible", "cause"}
CONTROL_KEYS = {"n_behaviors", "bonferroni_bar", "resolution_ceiling", "bonferroni_expressible"}
# Engine prose that lives in the same jsonb column and must never reach a page.
CONTROL_FORBIDDEN = {"note", "alpha", "corrected", "n_null_ran"}


def load_env(path="env.local"):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def rpc(url, anon, token, base, dataset=None):
    """POST the RPC as `token`'s identity.

    TWO DIFFERENT HEADERS, TWO DIFFERENT JOBS — do not collapse them back into one.
    `apikey` is the PROJECT key and Supabase's gateway validates it against the project's
    API keys (anon / service_role) before the request ever reaches PostgREST. A user JWT is
    not a project key, so sending one there gets the call rejected at the gateway — which
    is check 6, the only entitlement test in the whole lot, aborting instead of answering.
    `Authorization` is the IDENTITY under test: the anon key, the service-role key, or a
    real user JWT. PostgREST reads the role and the claims from that one.

    A transport failure returns a marked payload instead of raising: this script is run at
    DDL time with nobody watching, and a traceback halfway through prints no verdict at all
    for the checks that had already passed. `units: []` makes every check_over below fail
    closed on top of the named FAIL.
    """
    body = json.dumps({"p_base": base, "p_dataset": dataset}).encode()
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/dossier_payload",
        data=body,
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:200]
        return {"__error__": f"HTTP {e.code}: {detail}", "access": None, "units": []}
    except Exception as e:  # noqa: BLE001 — any transport problem is a named FAIL, not a crash
        return {"__error__": f"{type(e).__name__}: {e}", "access": None, "units": []}


def transport(name, payload):
    """Name a transport failure as a FAIL of its own, before its checks read `[]`."""
    if "__error__" in payload:
        # ASCII only in anything PRINTED: this is run over ssh on the VPS and from a
        # Windows shell, where a cp1252 stdout turns a stray em dash into mojibake.
        return check(f"{name}: RPC reached the function", False, payload["__error__"])
    return True


def check(name, cond, detail=""):
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"  {detail}" if detail else ""))
    return cond


def check_over(name, seq, cond, detail=""):
    """A check over a collection must FAIL on an empty collection.

    `all([])` is True and `set()` is falsy, so every assertion below would print PASS
    against zero survivors — a paywall verifier reporting green while testing nothing.
    That failure mode has already cost this project twice (a 200 with `[]` read as
    proof of a working read; a `*/0` read as proof of a closed table). Emptiness is
    part of the condition, never an implicit precondition.
    """
    return check(name, len(seq) > 0 and cond, detail or f"n={len(seq)}")


def main():
    load_env()
    url = os.environ["SUPABASE_URL"] if "SUPABASE_URL" in os.environ \
        else os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    anon = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    svc = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    base = os.environ.get("VERIFY_BASE", "WilliamsVolBreak")

    ok = True
    # Check 0 needs no network: it compares two files. The cutoff lives in three places
    # (this constant, c_cutoff in the migration, CORRECTED_ENGINE_SINCE in algolab). The TS
    # copy is pinned by a test over there; nothing pinned the SQL copy, so a drift would
    # only ever show up as units silently missing from a page. Now it names the file.
    print("0. the cutoff constant agrees with the migration")
    try:
        with open(MIGRATION, encoding="utf-8") as fh:
            sql = fh.read()
        found = re.search(r"c_cutoff\s+constant\s+timestamptz\s*:=\s*'([^']+)'", sql)
        ok &= check("c_cutoff is present in 032_dossier_payload.sql", found is not None)
        if found:
            ok &= check("c_cutoff == CUTOFF", found.group(1) == CUTOFF,
                        f"sql={found.group(1)} py={CUTOFF}")
    except OSError as e:
        ok &= check("migration file is readable", False, str(e))

    print("1. anon key -> teaser")
    payload = rpc(url, anon, anon, base)
    ok &= transport("anon", payload)
    ok &= check("access == teaser", payload.get("access") == "teaser", payload.get("access"))
    entries = [e for u in payload.get("units", []) for e in u.get("survivors", [])]
    ok &= check("at least one survivor returned", len(entries) > 0, f"n={len(entries)}")
    leaked = {k for e in entries for k in e} & RECIPE_KEYS
    ok &= check_over("no recipe key in teaser", entries, not leaked, str(leaked))
    shapes = {frozenset(e) for e in entries}
    ok &= check_over("teaser keys are exactly the allow-list", entries,
                     shapes == {frozenset(TEASER_KEYS)}, str(shapes))
    ok &= check_over("no threshold in cause", entries,
                     all(" " not in (e.get("cause") or "") for e in entries))
    # Spec §3.4: no survivor is ever served without its drawdown. Asserted on the
    # function's REAL output, not on a literal written here — a fixture written by the
    # consumer is green whatever the producer emits (vault lesson 2026-08-16).
    ok &= check_over("every survivor carries a numeric dd", entries,
                     all(isinstance(e.get("dd"), (int, float)) for e in entries))
    # The engine stores survivors in (-null_pct, -pf) order and jsonb_agg preserves input
    # order, so the default row order on a public page would be a profit-factor
    # leaderboard. The function re-orders by md5. On a base with thousands of survivors the
    # chance that a hash order comes out pf-descending is nil, so this is decisive there;
    # on a 5-row base it is not, hence the explicit skip rather than a free PASS.
    pfs = [e["pf"] for e in entries if isinstance(e.get("pf"), (int, float))]
    if len(pfs) >= 50:
        ok &= check("survivors are not served in pf-descending order",
                    not all(a >= b for a, b in zip(pfs, pfs[1:])), f"n={len(pfs)}")
    else:
        print(f"  note  only {len(pfs)} survivors — order check not decisive, skipped")

    # HonestyNote is fed from here and must never be starved: the key is always present,
    # null only when the unit was judged before the measurement existed.
    units = payload.get("units", [])
    ok &= check_over("every unit carries selection_control (possibly null)", units,
                     all("selection_control" in u for u in units))
    controls = [u["selection_control"] for u in units if u.get("selection_control")]
    if controls:
        shapes = {frozenset(c) for c in controls}
        ok &= check("selection_control is the 4-key allow-list",
                    shapes == {frozenset(CONTROL_KEYS)}, str(shapes))
        ok &= check("no engine prose in selection_control",
                    not ({k for c in controls for k in c} & CONTROL_FORBIDDEN))
    else:
        print("  note  no non-null selection_control in this base — shape unexercised")

    print("2. service-role key -> teaser (auth.uid() is NULL, fail closed)")
    payload = rpc(url, anon, svc, base)
    ok &= transport("service-role", payload)
    ok &= check("access == teaser", payload.get("access") == "teaser", payload.get("access"))
    entries = [e for u in payload.get("units", []) for e in u.get("survivors", [])]
    leaked = {k for e in entries for k in e} & RECIPE_KEYS
    ok &= check_over("no recipe key for service-role", entries, not leaked, str(leaked))

    print("3. stale units are not served")
    units = payload.get("units", [])
    # CUTOFF minus its trailing Z: published_at arrives from PostgREST as
    # '2026-08-14T10:00:00+00:00', and this is a lexicographic comparison.
    ok &= check_over("every unit is post-cutoff", units,
                     all((u.get("published_at") or "") >= CUTOFF[:-1] for u in units))

    print("4. unknown base -> empty, not an error")
    payload = rpc(url, anon, anon, "NoSuchBase")
    ok &= transport("unknown base", payload)
    ok &= check("units == []", payload.get("units") == [])

    print("5. one dataset only")
    payload = rpc(url, anon, anon, base)
    ok &= transport("one dataset", payload)
    units = payload.get("units", [])
    datasets = {u.get("dataset_version") for u in units}
    # `<= 1` would pass on zero units. Exactly one, over a non-empty set of units.
    ok &= check_over("a single dataset_version is served", units,
                     len(datasets) == 1, str(datasets))

    # The corpus stores camelCase base names; every URL the site builds is lowercase
    # (links, sitemap, canonical). A case-sensitive `v.base = p_base` therefore matched
    # nothing for every real visitor and every dossier 404'd. Asserting on the SAME COUNT
    # rather than on "lowercase returns something" is what makes this decisive: it fails
    # both when lowercase returns nothing AND if a future rewrite made the two spellings
    # resolve to different corpora. check_over so it cannot pass on zero units either way.
    print("6. lowercase URL segments resolve (the case the site actually calls with)")
    given = rpc(url, anon, anon, base)
    lowered = rpc(url, anon, anon, base.lower())
    ok &= transport("base as given", given)
    ok &= transport("base lowercased", lowered)
    units_given = given.get("units", [])
    units_lower = lowered.get("units", [])
    ok &= check_over(f"{base} returns units", units_given, True)
    ok &= check_over(f"{base.lower()} returns the same number of units", units_lower,
                     len(units_lower) == len(units_given),
                     f"given={len(units_given)} lower={len(units_lower)}")

    # ── The assertions that actually decide whether the paywall works ──────────────
    # Everything above runs with a key, not with a user. A key is not an identity: anon
    # and service-role both land on auth.uid() IS NULL, so they exercise the SAME branch.
    # The branch that matters — a real signed-in account, entitled or not — is only
    # reachable with a user JWT. Set the three env vars below (see Step 3b for how to
    # mint them on the dev project) or this verifier proves nothing about entitlement.
    print("7. real user identities")
    jwts = {
        "free account": os.environ.get("VERIFY_JWT_FREE"),
        "trialing account": os.environ.get("VERIFY_JWT_TRIALING"),
        "active account": os.environ.get("VERIFY_JWT_ACTIVE"),
    }
    if not all(jwts.values()):
        print("  SKIP  no user JWTs supplied — entitlement is UNVERIFIED, not verified")
        ok = False
    else:
        for label, jwt in jwts.items():
            # anon key in `apikey` (the project key the gateway validates), the user JWT in
            # `Authorization` (the identity PostgREST reads auth.uid() from).
            payload = rpc(url, anon, jwt, base)
            ok &= transport(label, payload)
            entries = [e for u in payload.get("units", []) for e in u.get("survivors", [])]
            leaked = {k for e in entries for k in e} & RECIPE_KEYS
            if label == "active account":
                ok &= check(f"{label} -> full", payload.get("access") == "full",
                            payload.get("access"))
                ok &= check_over(f"{label} receives the recipe", entries,
                                 leaked == RECIPE_KEYS, str(leaked))
            else:
                # trialing is deliberately NOT entitled to the corpus (spec §3.3/§4.6).
                ok &= check(f"{label} -> teaser", payload.get("access") == "teaser",
                            payload.get("access"))
                ok &= check_over(f"{label} gets no recipe", entries, not leaked, str(leaked))

    print("\nRESULT:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
