#!/usr/bin/env python3
# scripts/vps_sync.py — Push real APEX bot data to Supabase (AlgoProof)
# Deploy to VPS: rsync this file to ~/algoproof_sync.py
# Cron (hourly): 0 * * * * /home/ubuntu/venv/bin/python3 /home/ubuntu/algoproof_sync.py >> /home/ubuntu/logs/algoproof_sync.log 2>&1
#
# Required .env at ~/algoproof_sync.env:
#   SUPABASE_URL=https://avdegocswrhzdnvsyiui.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API → service_role>

import sqlite3
import os
from datetime import datetime, timedelta, date, timezone
from dotenv import load_dotenv
import requests
import sys

load_dotenv(os.path.expanduser("~/algoproof_sync.env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ~/algoproof_sync.env")
    sys.exit(1)

BASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Exit reasons to skip (duplicates / cleanup artefacts)
SKIP_REASON_FRAGMENTS = ["manual_dedup", "manual_cleanup"]

BOTS = [
    {
        "slug": "v1-spot",
        "name": "Bot V1 Spot",
        "strategy": "EMA Cross H4 (21/55/200)",
        "status": "paper",
        "exchange": "Binance Spot",
        "assets": ["BTC/USDT", "SOL/USDT", "LINK/USDT", "DOGE/USDT", "ADA/USDT"],
        "timeframe": "H4",
        "description": (
            "V1 Spot runs a three-EMA trend-following system on the 4-hour timeframe. "
            "A trade opens when the fast EMA (21) crosses the intermediate EMA (55) in the direction "
            "confirmed by the long-term trend filter (EMA 200) — eliminating counter-trend noise from the start. "
            "Each position risks exactly 1% of capital with an ATR ×2.0 initial stop loss. "
            "On BTC, SOL, and ADA the stop trails into profit as the move extends; "
            "LINK and DOGE use a fixed three-tranche exit (50% at TP1, 30% at TP2, 20% runner). "
            "A four-layer defense mesh surrounds every signal: a per-asset ADX strength filter, "
            "the Market Intelligence macro gate (checks VIX, Fear & Greed, funding rates, and the economic calendar), "
            "a circuit breaker that pauses trading for 4 hours after 3 consecutive losses, "
            "and a -5%/day kill switch that halts the bot entirely until manual review."
        ),
        "db_path": os.path.expanduser("~/apex_emacross_binancespot_3/db/apex_trades.db"),
        "paper_state_name": "apex-v1-spot",
        "start_capital": 1000.0,
    },
    {
        "slug": "v1-hl",
        "name": "Bot V1-HL Perps",
        "strategy": "EMA Cross H4 (21/55/200) — Hyperliquid Perps",
        "status": "paper",
        "exchange": "Hyperliquid",
        "assets": ["BTC-USDC", "SOL-USDC", "LINK-USDC", "DOGE-USDC", "ETH-USDC", "XRP-USDC"],
        "timeframe": "H4",
        "description": (
            "V1-HL runs the same proven EMA 21/55/200 crossover on 4-hour candles, but on Hyperliquid perpetuals — "
            "enabling both long and short positions across 6 major assets. "
            "Lower taker fees (0.065%) compared to centralized spot exchanges reduce the cost of each round trip, "
            "meaningfully improving the net edge on medium-frequency H4 signals. "
            "The Market Intelligence gate actively blocks entries when macro conditions are unfavorable: "
            "VIX spikes, extreme Fear & Greed readings, elevated funding rates, or scheduled high-impact macro events. "
            "ADA is restricted to long-only after perps shorts backtested at 0% win rate on this asset. "
            "Risk management is identical to V1 Spot: 1% per trade, ATR ×2.0 stop that trails on BTC/SOL/ETH/XRP/ADA, "
            "minimum 1:2 R:R, circuit breaker after 3 consecutive losses, and -5%/day kill switch."
        ),
        "db_path": os.path.expanduser("~/apex_emacross_hlperps_7/db/apex_hl_trades.db"),
        "paper_state_name": "apex-v1-hl",
        "start_capital": 1000.0,
    },
]


def supabase_get(table: str, params: dict) -> list:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=BASE_HEADERS, params=params)
    r.raise_for_status()
    return r.json()


def supabase_upsert(table: str, rows: list, on_conflict: str) -> None:
    headers = {**BASE_HEADERS, "Prefer": f"resolution=merge-duplicates,return=minimal"}
    params = {"on_conflict": on_conflict} if on_conflict else {}
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, params=params, json=rows)
    r.raise_for_status()


def supabase_delete(table: str, bot_id: str) -> None:
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=BASE_HEADERS,
        params={"bot_id": f"eq.{bot_id}"},
    )
    r.raise_for_status()


def clean_asset(symbol: str) -> str:
    """ETH/USDC:USDC -> ETH-USDC, LINK/USDT -> LINK-USDT"""
    return symbol.split(":")[0].replace("/", "-")


def clean_exit_reason(raw: str) -> str:
    """archived_pre_mi_v3|stop_loss -> stop_loss"""
    if not raw:
        return raw
    parts = raw.split("|")
    return parts[-1].strip()


def should_skip(exit_reason: str) -> bool:
    if not exit_reason:
        return False
    reason_lower = exit_reason.lower()
    return any(frag in reason_lower for frag in SKIP_REASON_FRAGMENTS)


def get_bot_id(slug: str) -> str:
    data = supabase_get("bots", {"slug": f"eq.{slug}", "select": "id"})
    if not data:
        raise ValueError(f"Bot '{slug}' not found in Supabase after upsert")
    return data[0]["id"]


def load_trades_from_db(db_path: str) -> list[dict]:
    """Load valid closed trades from SQLite."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT timestamp, closed_at, symbol, direction, pnl, exit_reason
        FROM trades
        WHERE status = 'closed'
          AND pnl IS NOT NULL
        ORDER BY closed_at ASC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    valid = []
    for r in rows:
        if should_skip(r["exit_reason"]):
            continue
        r["exit_reason"] = clean_exit_reason(r["exit_reason"])
        r["symbol"] = clean_asset(r["symbol"])
        valid.append(r)
    return valid


def get_paper_balance(db_path: str, bot_name: str) -> float:
    """Read current paper balance from paper_state table."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT balance FROM paper_state WHERE bot_name = ? ORDER BY id DESC LIMIT 1", (bot_name,))
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


def build_perf_daily(trades: list[dict], start_capital: float, paper_balance: float) -> list[dict]:
    """
    Build daily equity rows from closed trades.
    Anchors the curve so the endpoint matches the current paper_balance.
    Days with no trades carry forward the previous capital.
    """
    if not trades:
        return []

    # Group PnL by date (closed_at date)
    daily_pnl: dict[str, float] = {}
    daily_wins: dict[str, int] = {}
    daily_losses: dict[str, int] = {}

    for t in trades:
        closed_at = t["closed_at"]
        day = closed_at[:10] if closed_at else None
        if not day:
            continue
        pnl = float(t["pnl"])
        daily_pnl[day] = daily_pnl.get(day, 0.0) + pnl
        if pnl > 0:
            daily_wins[day] = daily_wins.get(day, 0) + 1
        else:
            daily_losses[day] = daily_losses.get(day, 0) + 1

    # Date range: first trade to today
    first_day = date.fromisoformat(sorted(daily_pnl.keys())[0])
    today = date.today()

    # Anchor: compute implied start so the curve ends at paper_balance
    total_pnl = sum(daily_pnl.values())
    implied_start = (paper_balance - total_pnl) if paper_balance is not None else start_capital

    rows = []
    capital = implied_start
    current = first_day

    while current <= today:
        day_str = current.isoformat()
        pnl_day = daily_pnl.get(day_str, 0.0)
        capital += pnl_day

        wins = daily_wins.get(day_str, 0)
        losses = daily_losses.get(day_str, 0)
        total = wins + losses
        win_rate = (wins / total) if total > 0 else None
        # Profit factor per day: only meaningful if both wins and losses on same day
        profit_factor = None
        if total > 0:
            day_trades = [t for t in trades if (t["closed_at"] or "")[:10] == day_str]
            wins_pnl = sum(float(t["pnl"]) for t in day_trades if float(t["pnl"]) > 0)
            losses_pnl = abs(sum(float(t["pnl"]) for t in day_trades if float(t["pnl"]) <= 0))
            if losses_pnl > 0:
                profit_factor = round(wins_pnl / losses_pnl, 4)

        rows.append({
            "date": day_str,
            "capital": round(capital, 2),
            "pnl_day": round(pnl_day, 4),
            "win_rate": round(win_rate, 4) if win_rate is not None else None,
            "profit_factor": profit_factor,
        })
        current += timedelta(days=1)

    return rows


def sync_bot(bot_cfg: dict) -> None:
    slug = bot_cfg["slug"]
    db_path = bot_cfg["db_path"]
    start_capital = bot_cfg["start_capital"]
    paper_name = bot_cfg["paper_state_name"]

    print(f"\n[{slug}] Starting sync...")

    if not os.path.exists(db_path):
        print(f"[{slug}] DB not found: {db_path} — skipping")
        return

    # 1. Upsert bot metadata
    bot_row = {
        "slug": slug,
        "name": bot_cfg["name"],
        "strategy": bot_cfg["strategy"],
        "status": bot_cfg["status"],
        "exchange": bot_cfg["exchange"],
        "assets": bot_cfg["assets"],
        "timeframe": bot_cfg["timeframe"],
        "description": bot_cfg["description"],
    }
    supabase_upsert("bots", [bot_row], "slug")
    bot_id = get_bot_id(slug)

    # 2. Load trades from SQLite
    trades = load_trades_from_db(db_path)
    print(f"[{slug}] {len(trades)} valid closed trades loaded")

    # 3. Sync trades (delete + insert)
    supabase_delete("trades", bot_id)
    if trades:
        trade_rows = [
            {
                "bot_id": bot_id,
                "opened_at": t["timestamp"],
                "closed_at": t["closed_at"],
                "asset": t["symbol"],
                "side": t["direction"],
                "pnl": round(float(t["pnl"]), 4),
                "reason": t["exit_reason"],
                "is_paper": True,
            }
            for t in trades
        ]
        supabase_upsert("trades", trade_rows, "")
    print(f"[{slug}] {len(trades)} trades pushed")

    # 4. Build and sync perf_daily
    paper_balance = get_paper_balance(db_path, paper_name)
    perf = build_perf_daily(trades, start_capital, paper_balance)

    supabase_delete("perf_daily", bot_id)
    if perf:
        perf_rows = [{**row, "bot_id": bot_id} for row in perf]
        supabase_upsert("perf_daily", perf_rows, "bot_id,date")
    print(f"[{slug}] {len(perf)} perf_daily rows pushed (paper balance: {paper_balance})")


def main() -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    print(f"=== AlgoProof VPS Sync — {ts} ===")
    for bot in BOTS:
        try:
            sync_bot(bot)
        except Exception as e:
            print(f"[{bot['slug']}] ERROR: {e}")
    print("\n=== Done ===")


if __name__ == "__main__":
    main()
