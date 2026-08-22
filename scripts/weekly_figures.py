#!/usr/bin/env python3
"""Weekly figures, computed the way the site computes them.

Why this exists: every weekly post used to carry hand-typed numbers. They drifted
(the published all-time real-money total went +36.02 -> +57.09 across a LOSING
week, then +95.03 -> +11.60 across another). The page was wrong too, differently:
/overview split real from lab on the bot's CURRENT status, so promoting a paper bot
turned its whole simulated past into real money (+45.52 EUR of v1-spot's paper period
counted as real). Both are fixed: the rule is now "a trade is real money from the day
its bot went live, never before", implemented once in src/lib/fleet-aggregate.ts and
mirrored here, so a post and the page can no longer tell different stories.

Read-only. Uses the anon key from env.local (same key the public site uses).

Usage
  python scripts/weekly_figures.py                    # current week
  python scripts/weekly_figures.py --week 2026-08-16  # week ENDING that day
  python scripts/weekly_figures.py --audit            # every past weekly vs its post
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
BLOG = ROOT / "content" / "blog"


def load_env() -> dict[str, str]:
    """env.local sits at the repo root and is NOT committed."""
    env: dict[str, str] = {}
    path = ROOT / "env.local"
    if not path.exists():
        path = ROOT / ".env.local"
    if not path.exists():
        sys.exit("env.local not found at the repo root")
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def fetch(env: dict[str, str], table: str, params: dict[str, str]) -> list[dict]:
    """PostgREST GET with keyset pagination (the trades table outgrew one page)."""
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    rows: list[dict] = []
    step = 1000
    offset = 0
    while True:
        query = dict(params)
        query["limit"] = str(step)
        query["offset"] = str(offset)
        url = f"{base}/rest/v1/{table}?{urllib.parse.urlencode(query)}"
        req = urllib.request.Request(url, headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=60) as resp:
            page = json.loads(resp.read().decode("utf-8"))
        rows.extend(page)
        if len(page) < step:
            return rows
        offset += step


def load_fleet(env: dict[str, str]) -> tuple[list[dict], dict[str, str], dict[str, str]]:
    """Returns (trades, {bot_id: first real-money day}, {bot_id: slug}).

    The real/lab split is the site's rule, and it is a DATE rule, not a status
    rule: every bot here starts in paper and is promoted later, so reading
    `status == 'live'` and applying it to a bot's whole history rewrites its
    simulated past into real money. See computeFleetAggregate in
    src/lib/fleet-aggregate.ts, which was fixed the same day this script landed.
    """
    bots = fetch(env, "bots", {"select": "id,slug,name,status,live_since"})
    live_ids = {b["id"]: b["live_since"][:10]
                for b in bots
                if b.get("status") == "live" and b.get("live_since")}
    name_by_id = {b["id"]: (b.get("slug") or b["id"]) for b in bots}
    trades = fetch(env, "trades", {"select": "bot_id,asset,side,pnl,closed_at,created_at",
                                   "order": "closed_at.asc"})
    return trades, live_ids, name_by_id


def trade_day(trade: dict) -> str | None:
    stamp = trade.get("closed_at") or trade.get("created_at")
    return stamp[:10] if stamp else None


def is_real(trade: dict, live_ids: dict[str, str]) -> bool:
    """Real money from the day the bot went live, never before."""
    start = live_ids.get(trade["bot_id"])
    day = trade_day(trade)
    return bool(start and day and day >= start)


def totals(trades: list[dict], live_ids: dict[str, str], upto: str | None = None,
           since: str | None = None) -> dict:
    """Same split as computeFleetAggregate."""
    real = lab = 0.0
    n_real = n_lab = 0
    for t in trades:
        day = trade_day(t)
        if not day:
            continue
        if upto and day > upto:
            continue
        if since and day < since:
            continue
        pnl = float(t.get("pnl") or 0)
        if is_real(t, live_ids):
            real += pnl
            n_real += 1
        else:
            lab += pnl
            n_lab += 1
    return {"real": real, "lab": lab, "n_real": n_real, "n_lab": n_lab}


def side_split(trades: list[dict], live_ids: dict[str, str], since: str, upto: str) -> dict:
    out = {"long": {"pnl": 0.0, "n": 0, "wins": 0}, "short": {"pnl": 0.0, "n": 0, "wins": 0}}
    best = worst = None
    for t in trades:
        day = trade_day(t)
        if not day or day < since or day > upto or not is_real(t, live_ids):
            continue
        side = (t.get("side") or "").lower()
        bucket = out["short"] if side.startswith("s") else out["long"]
        pnl = float(t.get("pnl") or 0)
        bucket["pnl"] += pnl
        bucket["n"] += 1
        if pnl > 0:
            bucket["wins"] += 1
        if best is None or pnl > best[0]:
            best = (pnl, t)
        if worst is None or pnl < worst[0]:
            worst = (pnl, t)
    out["best"] = best
    out["worst"] = worst
    return out


def eur(value: float) -> str:
    return f"{value:+.2f} €".replace(".", ",").replace("+-", "-")


def report_week(trades, live_ids, name_by_id, end: dt.date) -> None:
    start = end - dt.timedelta(days=6)
    since, upto = start.isoformat(), end.isoformat()
    week = totals(trades, live_ids, upto=upto, since=since)
    alltime = totals(trades, live_ids, upto=upto)
    sides = side_split(trades, live_ids, since, upto)

    print(f"\n=== Semaine du {since} au {upto} ===")
    print(f"Argent reel      semaine {eur(week['real'])} sur {week['n_real']} trades")
    print(f"Argent reel      cumul   {eur(alltime['real'])} sur {alltime['n_real']} trades")
    print(f"Laboratoire      semaine {eur(week['lab'])} sur {week['n_lab']} trades")
    print(f"Laboratoire      cumul   {eur(alltime['lab'])} sur {alltime['n_lab']} trades")
    for side in ("long", "short"):
        s = sides[side]
        wr = (100 * s["wins"] / s["n"]) if s["n"] else 0
        print(f"  {side:<5} {eur(s['pnl'])} sur {s['n']} trades, {s['wins']} gagnants ({wr:.1f} %)")
    for label, item in (("Meilleur", sides["best"]), ("Pire", sides["worst"])):
        if item:
            pnl, t = item
            print(f"  {label:<8} {name_by_id.get(t['bot_id'], '?')} {t.get('asset')} {eur(pnl)}")

    print("\n--- a coller dans le MDX ---")
    print(f'  <Stat label="P&L de la semaine (argent réel)" value="{eur(week["real"])}" />')
    print(f'  <Stat label="P&L cumulé (argent réel)" value="{eur(alltime["real"])}" '
          f'subtext="sur {alltime["n_real"]} trades depuis le début" />')
    print(f'  <Stat label="Coût de la simulation (semaine)" value="{eur(week["lab"])}" '
          f'subtext="{week["n_lab"]} trades en laboratoire" />')


PUBLISHED = re.compile(r'label="[^"]*cumul[^"]*"\s+value="([^"]+)"', re.IGNORECASE)


def check_dates(trades: list[dict], live_ids: dict[str, str], names: dict[str, str]) -> None:
    """A real-money bot that traded BEFORE its live_since is a data question, not a detail.

    Either those trades were simulation (and the date is right), or the bot was
    already trading real money and `live_since` is late. It happened: v1-spot
    carried 2026-05-08 while its first 8 real trades ran from 17/04, so the site
    silently disagreed with the blog by 45,52 EUR. Whichever way it is resolved,
    somebody has to answer the question, so the script asks it out loud.
    """
    flagged = []
    for bot_id, start in live_ids.items():
        early = [t for t in trades
                 if t["bot_id"] == bot_id and (trade_day(t) or "9") < start]
        if early:
            total = sum(float(t.get("pnl") or 0) for t in early)
            first = min(trade_day(t) for t in early if trade_day(t))
            flagged.append((names.get(bot_id, bot_id), start, len(early), first, total))
    if not flagged:
        return
    print(chr(10) + "ATTENTION, trades anterieurs au passage en argent reel :")
    for slug, start, n, first, total in flagged:
        print(f"  {slug}: live_since={start} mais {n} trades des le {first} "
              f"({eur(total)}). Simulation, ou live_since en retard ?")


def audit(trades, live_ids) -> None:
    """Compare every weekly's published all-time figure to the canonical one."""
    print(f"\n{'weekly':<12} {'publié':>14} {'calculé':>14} {'écart':>12}")
    print("-" * 56)
    for path in sorted(BLOG.glob("*-weekly.mdx")):
        text = path.read_text(encoding="utf-8")
        match = PUBLISHED.search(text)
        if not match:
            continue
        date = path.name[:10]
        published = match.group(1)
        computed = totals(trades, live_ids, upto=date)["real"]
        raw = published.replace("−", "-").replace(" €", "").replace(",", ".").replace(" ", "")
        try:
            delta = computed - float(raw)
            flag = "" if abs(delta) < 0.02 else "  <-- ECART"
        except ValueError:
            delta, flag = float("nan"), "  <-- illisible"
        print(f"{date:<12} {published:>14} {eur(computed):>14} {eur(delta):>12}{flag}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--week", help="ISO date the week ENDS on (default: today)")
    parser.add_argument("--audit", action="store_true",
                        help="check every published weekly against the canonical figure")
    args = parser.parse_args()

    env = load_env()
    trades, live_ids, name_by_id = load_fleet(env)
    print(f"{len(trades)} trades, {len(live_ids)} bot(s) en argent réel")

    if args.audit:
        audit(trades, live_ids)
        check_dates(trades, live_ids, name_by_id)
        return

    end = dt.date.fromisoformat(args.week) if args.week else dt.date.today()
    report_week(trades, live_ids, name_by_id, end)


if __name__ == "__main__":
    main()
