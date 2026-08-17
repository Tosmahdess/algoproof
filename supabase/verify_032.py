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

# The base the product rule makes permanently public: one complete dossier anyone can read,
# so the format of the proof can be judged before paying for the other nine. Mirrors
# c_free_sample in the migration, and check 0 pins the two together the same way it pins
# CUTOFF — which base plays this part is an open question deferred to a later lot, so it is
# expected to move and must move in both files at once.
FREE_SAMPLE = "EMAcross"

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


# TWO CALLERS, TWO HEADER SHAPES. DO NOT "SIMPLIFY" THESE INTO ONE HELPER.
#
# MEASURED 2026-08-17 against the live project, same body, same not-yet-created function:
#
#   apikey=<service>  Authorization=Bearer <service>  ->  PGRST202  (reaches the lookup)
#   apikey=<anon>     Authorization=Bearer <service>  ->  PGRST301  "Expected 3 parts in JWT"
#
# Changing ONLY `apikey` flips 202 into 301, which settles what each header does. The gateway
# resolves the role from `apikey`; once `apikey` is the anon publishable key, `Authorization`
# is read as a USER access token, and this project's keys are the new `sb_…` format — one
# part, not three — so a non-JWT there is a parse error before the function is ever looked up.
#
# Hence the split, and it is conditional, not global:
#
#   rpc()          key-based callers (anon, service-role). The SAME key in both headers.
#                  Checks 1, 2, 3, 4, 5, 6 and 7.
#   rpc_as_user()  a real signed-in identity. anon publishable key in `apikey`, the user's
#                  access token in `Authorization`. GoTrue access tokens are three-part JWTs,
#                  so this shape is correct there and only there. Check 8.
#
# The earlier version of this file sent one token in both headers for everyone, which was
# right; a round of review then globalised the anon-in-apikey rule to protect check 8 and
# thereby guaranteed the DDL-time traceback it was written to prevent. The measurement above
# is the record of that being wrong.


def _post(url, apikey, bearer, base, dataset):
    """The one request. Errors come back MARKED, never raised.

    This script is run at DDL time with nobody watching, and a traceback halfway through
    prints no verdict at all for the checks that had already passed. `units: []` makes every
    check_over below fail closed on top of the named FAIL.
    """
    body = json.dumps({"p_base": base, "p_dataset": dataset}).encode()
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/dossier_payload",
        data=body,
        headers={
            "apikey": apikey,
            "Authorization": f"Bearer {bearer}",
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


def rpc(url, key, base, dataset=None):
    """A PROJECT KEY calling as itself: anon or service-role. Same key in both headers."""
    return _post(url, key, key, base, dataset)


def rpc_as_user(url, anon, token, base, dataset=None):
    """A REAL SIGNED-IN IDENTITY: anon key in `apikey`, the user's access token as bearer.

    The only shape that reaches auth.uid() with a value, and the only one that exercises the
    subscriptions lookup — every other caller in this file lands on auth.uid() IS NULL.
    """
    return _post(url, anon, token, base, dataset)


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
        # Same pinning, for the free-sample base. Which base it is will change; this makes
        # the two files change together instead of the verifier quietly testing the wrong one.
        marker = f"c_free_sample constant text := '{FREE_SAMPLE}';"
        ok &= check("c_free_sample == FREE_SAMPLE", marker in sql, FREE_SAMPLE)
    except OSError as e:
        ok &= check("migration file is readable", False, str(e))

    print("1. anon key -> teaser (on a base that is not the free sample)")
    payload = rpc(url, anon, base)
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
    payload = rpc(url, svc, base)
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
    payload = rpc(url, anon, "NoSuchBase")
    ok &= transport("unknown base", payload)
    ok &= check("units == []", payload.get("units") == [])

    print("5. one dataset only")
    payload = rpc(url, anon, base)
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
    given = rpc(url, anon, base)
    lowered = rpc(url, anon, base.lower())
    ok &= transport("base as given", given)
    ok &= transport("base lowercased", lowered)
    units_given = given.get("units", [])
    units_lower = lowered.get("units", [])
    ok &= check_over(f"{base} returns units", units_given, True)
    ok &= check_over(f"{base.lower()} returns the same number of units", units_lower,
                     len(units_lower) == len(units_given),
                     f"given={len(units_given)} lower={len(units_lower)}")

    # THE ONLY CHECK IN THIS FILE THAT TELLS THE TWO ARMS APART WITHOUT A USER JWT.
    #
    # Everything above runs the anon key against a paid base and confirms it is refused.
    # That is a one-sided test: a function that returned 'teaser' unconditionally — because
    # it is broken, because v_paid got wired to a constant false, because the recipe
    # concatenation was dropped — would pass every one of those checks. This is the other
    # side. The same anon key, the same absence of any identity, one base public by product
    # rule and one not: 'full' with the recipe on the first, 'teaser' without it on the
    # second. If the two answers are ever the same, either the free sample has been
    # withdrawn from the public or the paywall is not closing, and the pair says which.
    #
    # It is also the first assertion in the whole lot that can be run before any account
    # exists, which is why it is worth having: check 8 needs three minted JWTs and gets
    # SKIPped far more often than anyone would like.
    print("7. the free-sample base is fully public, and only that base")
    fs = rpc(url, anon, FREE_SAMPLE)
    ok &= transport("free sample", fs)
    ok &= check(f"{FREE_SAMPLE} -> full for the anon key", fs.get("access") == "full",
                fs.get("access"))
    fs_entries = [e for u in fs.get("units", []) for e in u.get("survivors", [])]
    ok &= check_over(f"{FREE_SAMPLE} carries the recipe", fs_entries,
                     {k for e in fs_entries for k in e} >= RECIPE_KEYS)
    # Lowercase too: this is the spelling every link, the sitemap and the canonical use, so
    # the product rule is worth nothing if it only fires on the camelCase form.
    fs_low = rpc(url, anon, FREE_SAMPLE.lower())
    ok &= transport("free sample lowercased", fs_low)
    ok &= check(f"{FREE_SAMPLE.lower()} -> full as well", fs_low.get("access") == "full",
                fs_low.get("access"))
    # The other side of the pair, on the same key. `base` defaults to a non-free base; if
    # VERIFY_BASE was pointed at the sample there is no contrast left to measure, and this
    # says so instead of printing a PASS that compares a thing with itself.
    if base.lower() == FREE_SAMPLE.lower():
        ok &= check("VERIFY_BASE differs from the free sample", False,
                    f"VERIFY_BASE={base}: nothing to contrast, pick a non-sample base")
    else:
        other = rpc(url, anon, base)
        ok &= transport("non-sample base", other)
        ok &= check(f"{base} -> teaser for the same anon key",
                    other.get("access") == "teaser", other.get("access"))
        other_entries = [e for u in other.get("units", []) for e in u.get("survivors", [])]
        ok &= check_over(f"{base} carries no recipe", other_entries,
                         not ({k for e in other_entries for k in e} & RECIPE_KEYS))

    # ── The assertions that actually decide whether the paywall works ──────────────
    # Everything above runs with a key, not with a user. A key is not an identity: anon
    # and service-role both land on auth.uid() IS NULL. Check 7 proves the function can
    # still emit both arms from there — but it does so through the free-sample rule, which
    # bypasses the subscription lookup entirely. The branch that matters — a real signed-in
    # account, entitled or not, actually resolved against `subscriptions` — is only
    # reachable with a user JWT. Set the three env vars below (see Step 3b for how to
    # mint them on the dev project) or this verifier proves nothing about entitlement.
    print("8. real user identities")
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
            payload = rpc_as_user(url, anon, jwt, base)
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
