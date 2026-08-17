"""Create three dev accounts and print their access tokens.

DEV PROJECT ONLY. Reads SUPABASE_DEV_URL and SUPABASE_DEV_SERVICE_ROLE_KEY from the
environment; refuses to run against the production project id.
"""
import json
import os
import sys
import urllib.request

PROD_ID = "avdegocswrhzdnvsyiui"
USERS = [
    ("verify-free@example.test", None),
    ("verify-trialing@example.test", "trialing"),
    ("verify-active@example.test", "active"),
]
PASSWORD = "verify-032-" + os.urandom(6).hex()


def post(url, key, path, body, extra=None):
    req = urllib.request.Request(
        url + path,
        data=json.dumps(body).encode(),
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json", **(extra or {})},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b"{}")


def main():
    url = os.environ["SUPABASE_DEV_URL"].rstrip("/")
    key = os.environ["SUPABASE_DEV_SERVICE_ROLE_KEY"]
    if PROD_ID in url:
        sys.exit("refusing to create test users in production")
    env = {}
    for email, status in USERS:
        user = post(url, key, "/auth/v1/admin/users",
                    {"email": email, "password": PASSWORD, "email_confirm": True})
        uid = user["id"]
        if status:
            post(url, key, "/rest/v1/subscriptions", {
                "user_id": uid,
                "stripe_customer_id": "cus_verify032",
                "stripe_subscription_id": f"sub_verify032_{status}",
                "status": status,
                "tier": "lab_monthly",
                "current_period_end": "2099-01-01T00:00:00Z",
            }, extra={"Prefer": "resolution=merge-duplicates"})
        tok = post(url, key, "/auth/v1/token?grant_type=password",
                   {"email": email, "password": PASSWORD})
        env[status or "free"] = tok["access_token"]
    print(f'export VERIFY_JWT_FREE="{env["free"]}"')
    print(f'export VERIFY_JWT_TRIALING="{env["trialing"]}"')
    print(f'export VERIFY_JWT_ACTIVE="{env["active"]}"')


if __name__ == "__main__":
    main()
