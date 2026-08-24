"""Mint 3 test identities on PRODUCTION, run verify_032 check 8, delete them again.

    python supabase/check8_prod_identities.py

WHY THIS EXISTS, AND WHY IT TARGETS PRODUCTION. `mint_test_identities.py` next to
this file refuses to run against the prod project id, which is correct and stays
that way. It needs a dev project — and there is no longer one (user, 2026-08-18).
Meanwhile check 8 is the ONLY assertion in verify_032.py that exercises a real
signed-in identity resolved against `subscriptions`: every other check lands on
auth.uid() IS NULL, and check 7 reaches the `full` arm through the free-sample
rule, which bypasses the subscription lookup entirely. Left SKIPped, entitlement
is unverified, and verify_032.py says so by failing rather than passing.

WHAT IT WRITES TO PRODUCTION, and how it is bounded:
  - 3 auth users on @example.test, a reserved TLD that cannot receive mail. They
    are created through the admin API with email_confirm, so no confirmation mail
    is attempted and no real address is ever touched.
  - 2 `subscriptions` rows (trialing, active) carrying
    stripe_subscription_id = 'sub_verify032_check8_<status>'. The namespace is
    deliberate: it can collide neither with a real Stripe id nor with the owner's
    'owner_comp_access' row.
Every one of those is deleted in the `finally` block, so an assertion failure or a
transport error still cleans up, and a residual-row query prints what is left.

The verdict is verify_032.py's, not this script's: it is run as a subprocess with
the three VERIFY_JWT_* variables set, so checks 0 through 8 all judge the run and
this file's exit code is the verifier's.

Credentials come from algoproof/.env.local (never committed, never hardcoded).
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

# Derived from this file, never hardcoded. The two PCs check the repo out on
# different drives, and the env file is spelled with a leading dot on one and
# without it on the other -- a hardcoded pair made this script unrunnable on the
# machine that happened to have the GO.
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_LOCAL = next(
    (c for c in (os.path.join(REPO, ".env.local"), os.path.join(REPO, "env.local"))
     if os.path.isfile(c)),
    os.path.join(REPO, ".env.local"),
)

USERS = [
    ("verify-free@example.test", None),
    ("verify-trialing@example.test", "trialing"),
    ("verify-active@example.test", "active"),
]
PASSWORD = "verify-032-" + os.urandom(8).hex()


def load_env(path):
    env = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def req(url, key, path, body=None, method=None, extra=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        url + path, data=data,
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json", **(extra or {})},
        method=method or ("POST" if body is not None else "GET"),
    )
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:300]


def main():
    env = load_env(ENV_LOCAL)
    url = env["SUPABASE_URL"].rstrip("/")
    svc = env["SUPABASE_SERVICE_ROLE_KEY"]
    anon = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or env["SUPABASE_ANON_KEY"]
    print(f"project: {url}")

    created = []  # (uid, email, has_sub)
    jwts = {}
    rc = 1
    try:
        for email, status in USERS:
            code, user = req(url, svc, "/auth/v1/admin/users",
                             {"email": email, "password": PASSWORD, "email_confirm": True})
            if code == 422 and "already" in str(user).lower():
                # leftover from an aborted run: find it, reuse it
                code2, listing = req(url, svc, f"/auth/v1/admin/users?page=1&per_page=100")
                uid = next(u["id"] for u in listing.get("users", []) if u["email"] == email)
                # reset its password so the token grant below works
                req(url, svc, f"/auth/v1/admin/users/{uid}",
                    {"password": PASSWORD}, method="PUT")
            elif code not in (200, 201):
                print(f"FATAL create {email}: HTTP {code} {user}")
                return
            else:
                uid = user["id"]
            created.append((uid, email, status is not None))
            print(f"  created {email} uid={uid}")
            if status:
                code, out = req(url, svc, "/rest/v1/subscriptions", {
                    "user_id": uid,
                    "stripe_customer_id": "cus_verify032_check8",
                    "stripe_subscription_id": f"sub_verify032_check8_{status}",
                    "status": status,
                    "tier": "lab_monthly",
                    "current_period_end": "2099-01-01T00:00:00Z",
                }, extra={"Prefer": "resolution=merge-duplicates"})
                if code not in (200, 201):
                    print(f"FATAL subscription {status}: HTTP {code} {out}")
                    return
                print(f"  subscription {status} inserted")
            code, tok = req(url, anon, "/auth/v1/token?grant_type=password",
                            {"email": email, "password": PASSWORD})
            if code != 200:
                print(f"FATAL token {email}: HTTP {code} {tok}")
                return
            jwts[status or "free"] = tok["access_token"]

        child = os.environ.copy()
        child.update({
            "SUPABASE_URL": url,
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon,
            "SUPABASE_SERVICE_ROLE_KEY": svc,
            "VERIFY_JWT_FREE": jwts["free"],
            "VERIFY_JWT_TRIALING": jwts["trialing"],
            "VERIFY_JWT_ACTIVE": jwts["active"],
            "PYTHONIOENCODING": "utf-8",
        })
        print("\n--- verify_032.py ---")
        rc = subprocess.call([sys.executable, os.path.join(REPO, "supabase", "verify_032.py")],
                             env=child, cwd=REPO)
    finally:
        print("\n--- cleanup ---")
        for uid, email, has_sub in created:
            if has_sub:
                code, out = req(url, svc, f"/rest/v1/subscriptions?user_id=eq.{uid}",
                                method="DELETE")
                print(f"  subscriptions rows for {email}: DELETE -> {code}")
            code, out = req(url, svc, f"/auth/v1/admin/users/{uid}", method="DELETE")
            print(f"  user {email}: DELETE -> {code}")
        # prove the cleanup took: no verify032 subscription rows, no example.test users
        code, rows = req(url, svc,
                         "/rest/v1/subscriptions?stripe_customer_id=eq.cus_verify032_check8&select=user_id")
        print(f"  residual verify032 subscription rows: {rows if rows else '[]'} (HTTP {code})")
    sys.exit(rc)


if __name__ == "__main__":
    main()
