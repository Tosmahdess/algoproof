"""Verify migration 032 from outside, the way a caller sees it.

Run:  python supabase/verify_032.py
Env:  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
      (read from env.local if present; never hardcode)

A grant statement that ran without error is not the same claim as the object
answering correctly (migration 030's banner). This asserts the answers.
"""
import json
import os
import sys
import urllib.request

RECIPE_KEYS = {"params", "filters", "exit"}
TEASER_KEYS = {"k", "dd", "pf", "wf", "n_trades", "eligible", "cause"}


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


def rpc(url, key, base, dataset=None):
    body = json.dumps({"p_base": base, "p_dataset": dataset}).encode()
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/dossier_payload",
        data=body,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


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
    print("1. anon key -> teaser")
    payload = rpc(url, anon, base)
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

    print("2. service-role key -> teaser (auth.uid() is NULL, fail closed)")
    payload = rpc(url, svc, base)
    ok &= check("access == teaser", payload.get("access") == "teaser", payload.get("access"))
    entries = [e for u in payload.get("units", []) for e in u.get("survivors", [])]
    leaked = {k for e in entries for k in e} & RECIPE_KEYS
    ok &= check_over("no recipe key for service-role", entries, not leaked, str(leaked))

    print("3. stale units are not served")
    units = payload.get("units", [])
    ok &= check_over("every unit is post-cutoff", units,
                     all((u.get("published_at") or "") >= "2026-08-12T19:38:00"
                         for u in units))

    print("4. unknown base -> empty, not an error")
    payload = rpc(url, anon, "NoSuchBase")
    ok &= check("units == []", payload.get("units") == [])

    print("5. one dataset only")
    payload = rpc(url, anon, base)
    units = payload.get("units", [])
    datasets = {u.get("dataset_version") for u in units}
    # `<= 1` would pass on zero units. Exactly one, over a non-empty set of units.
    ok &= check_over("a single dataset_version is served", units,
                     len(datasets) == 1, str(datasets))

    # ── The assertions that actually decide whether the paywall works ──────────────
    # Everything above runs with a key, not with a user. A key is not an identity: anon
    # and service-role both land on auth.uid() IS NULL, so they exercise the SAME branch.
    # The branch that matters — a real signed-in account, entitled or not — is only
    # reachable with a user JWT. Set the three env vars below (see Step 3b for how to
    # mint them on the dev project) or this verifier proves nothing about entitlement.
    print("6. real user identities")
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
            payload = rpc(url, jwt, base)
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
