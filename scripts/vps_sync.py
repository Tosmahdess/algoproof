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
SKIP_REASON_FRAGMENTS = ["manual_dedup", "manual_cleanup", "archived"]

BOTS = [
    {
        "slug": "v1-spot",
        "name": "EMA Cross H4 Binance Spot",
        "family": "trend",
        "strategy": "EMA Cross H4 (21/55/200)",
        "status": "paper",
        "exchange": "Binance Spot",
        "assets": ["BTC/USDT", "SOL/USDT", "LINK/USDT", "DOGE/USDT", "ADA/USDT"],
        "timeframe": "H4",
        "description": (
            "Ce bot applique un système de suivi de tendance à trois EMA sur l'unité de temps H4. "
            "Un trade s'ouvre quand l'EMA rapide (21) croise l'EMA intermédiaire (55) dans la direction "
            "confirmée par le filtre de tendance long terme (EMA 200) — éliminant d'emblée les signaux à contre-tendance. "
            "Chaque position risque exactement 1% du capital avec un stop loss initial ATR ×2,0. "
            "Sur BTC, SOL et ADA le stop remonte dans les profits à mesure que le mouvement se développe ; "
            "LINK et DOGE utilisent une sortie fixe en trois tranches (50% à TP1, 30% à TP2, 20% en runner). "
            "Un bouclier défensif à quatre couches entoure chaque signal : un filtre ADX par actif, "
            "la gate macro du service d'Intelligence de Marché (vérifie VIX, Fear & Greed, taux de financement et calendrier économique), "
            "un circuit breaker qui suspend le trading 4h après 3 pertes consécutives, "
            "et un kill switch à -5%/jour qui arrête le bot jusqu'à revue manuelle."
        ),
        "db_path": os.path.expanduser("~/apex_emacross_binancespot_3/db/apex_trades.db"),
        "paper_state_name": "apex-v1-spot",
        "start_capital": 1000.0,
    },
    {
        "slug": "v1-hl",
        "name": "EMA Cross H4 Hyperliquid Perps",
        "family": "trend",
        "strategy": "EMA Cross H4 (21/55/200) — Hyperliquid Perps",
        "status": "paper",
        "exchange": "Hyperliquid",
        "assets": ["BTC-USDC", "SOL-USDC", "LINK-USDC", "DOGE-USDC", "ETH-USDC", "XRP-USDC"],
        "timeframe": "H4",
        "description": (
            "Ce bot applique le même croisement EMA 21/55/200 éprouvé sur les bougies H4, mais sur les perpetuals Hyperliquid — "
            "permettant les positions longues et courtes sur 6 actifs majeurs. "
            "Des frais taker plus bas (0,065%) par rapport aux exchanges centralisés spot réduisent le coût de chaque aller-retour, "
            "améliorant sensiblement l'edge net sur les signaux H4 de fréquence moyenne. "
            "La gate d'Intelligence de Marché bloque activement les entrées quand les conditions macro sont défavorables : "
            "pics VIX, lectures extrêmes de Fear & Greed, taux de financement élevés ou événements macro à fort impact. "
            "ADA est limité aux positions longues uniquement après backtests shorts à 0% de réussite sur cet actif. "
            "La gestion du risque est identique à EMA Cross Binance Spot : 1% par trade, stop ATR ×2,0 qui remonte sur BTC/SOL/ETH/XRP/ADA, "
            "R:R minimum 1:2, circuit breaker après 3 pertes consécutives, et kill switch à -5%/jour."
        ),
        "db_path": os.path.expanduser("~/apex_emacross_hlperps_7/db/apex_hl_trades.db"),
        "paper_state_name": "apex-v1-hl",
        "start_capital": 1000.0,
    },
]

WEALTH_CALLS_DB   = os.path.expanduser("~/apex_wealth/db/wealth_calls.db")
MI_HEARTBEAT_PATH = os.path.expanduser("~/market_intel/db/heartbeat.json")


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

    # Anchor: start at start_capital and show realized P&L from closed trades only.
    # We intentionally ignore paper_balance here because it reflects free cash only
    # (open positions reduce it without being actual losses).
    total_pnl = sum(daily_pnl.values())
    implied_start = start_capital

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
        "family": bot_cfg["family"],
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


def sync_wealth_calls() -> None:
    """Sync DCA call history from local SQLite to Supabase wealth_calls."""
    if not os.path.exists(WEALTH_CALLS_DB):
        print("  [wealth] DB not found — skipping")
        return

    conn = sqlite3.connect(WEALTH_CALLS_DB)
    rows = conn.execute(
        "SELECT executed_at, asset, portfolio, amount_eur, multiplier, "
        "signal_level, venue, price_eur, quantity FROM wealth_calls ORDER BY executed_at ASC"
    ).fetchall()
    conn.close()

    if not rows:
        print("  [wealth] No rows — skipping")
        return

    records = [
        {
            "executed_at": r[0], "asset": r[1], "portfolio": r[2],
            "amount_eur":  r[3], "multiplier": r[4], "signal_level": r[5],
            "venue": r[6], "price_eur": r[7], "quantity": r[8],
        }
        for r in rows
    ]
    supabase_upsert("wealth_calls", records, "executed_at,asset")
    print(f"  [wealth] {len(records)} wealth_calls synced")


def sync_asset_prices() -> None:
    """Fetch live asset prices and push to Supabase asset_prices."""
    COINGECKO_ASSETS = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "SOL": "solana",
    }
    prices: dict = {}
    now = datetime.utcnow().isoformat() + "Z"

    # CoinGecko — direct EUR prices
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": ",".join(COINGECKO_ASSETS.values()), "vs_currencies": "eur"},
            timeout=10,
        )
        r.raise_for_status()
        cg = r.json()
        for asset, cg_id in COINGECKO_ASSETS.items():
            if cg_id in cg and "eur" in cg[cg_id]:
                prices[asset] = {"price_eur": cg[cg_id]["eur"], "source": "coingecko"}
    except Exception as e:
        print(f"  [prices] CoinGecko error: {e}")

    # Yahoo Finance — Gold (USD→EUR) + CW8.PA (EUR)
    def _yahoo_close(ticker: str) -> float | None:
        try:
            resp = requests.get(
                f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}",
                params={"range": "1d", "interval": "1d"},
                headers={"User-Agent": "AlgoProof/1.0"},
                timeout=10,
            )
            resp.raise_for_status()
            closes = resp.json()["chart"]["result"][0]["indicators"]["quote"][0]["close"]
            return next(c for c in reversed(closes) if c is not None)
        except Exception:
            return None

    eurusd = _yahoo_close("EURUSD=X") or 1.0

    gold_usd = _yahoo_close("GC=F")
    if gold_usd:
        prices["XAUUSDT"] = {"price_eur": round(gold_usd / eurusd, 2), "source": "yahoo"}

    cw8 = _yahoo_close("CW8.PA")
    if cw8:
        prices["CW8"] = {"price_eur": round(cw8, 4), "source": "yahoo"}

    # PUST.L — Nasdaq-100 UCITS PEA (London, quoted in GBX = pence sterling)
    # Conversion: price_GBX / 100 → GBP → EUR via GBPEUR=X
    gbpeur = _yahoo_close("GBPEUR=X")
    pust_gbx = _yahoo_close("PUST.L")
    if pust_gbx and gbpeur:
        prices["CL2_PUST"] = {"price_eur": round(pust_gbx / 100 * gbpeur, 4), "source": "yahoo"}

    if not prices:
        print("  [prices] No prices fetched — skipping")
        return

    records = [
        {"asset": a, "price_eur": v["price_eur"], "source": v["source"], "updated_at": now}
        for a, v in prices.items()
    ]
    supabase_upsert("asset_prices", records, "asset")
    print(f"  [prices] {len(records)} prices updated: {list(prices.keys())}")


def sync_mi_snapshot() -> None:
    """Read MI heartbeat and push latest snapshot to Supabase mi_snapshots."""
    import json

    if not os.path.exists(MI_HEARTBEAT_PATH):
        print("  [MI] Heartbeat not found — skipping")
        return

    try:
        with open(MI_HEARTBEAT_PATH) as f:
            hb = json.load(f)
    except Exception as e:
        print(f"  [MI] Read error: {e}")
        return

    # Heartbeat uses: global_score, risk_level (GREEN/YELLOW/ORANGE/RED),
    # allow_new_entries, last_cycle_utc, temporal.{pillar}_score_ema_24h
    temporal = hb.get("temporal", {})
    record = {
        "snapshot_at":       hb.get("last_cycle_utc") or datetime.utcnow().isoformat() + "Z",
        "composite_score":   hb.get("global_score"),
        "regime":            hb.get("risk_level"),          # GREEN/YELLOW/ORANGE/RED
        "is_safe":           hb.get("allow_new_entries"),
        "is_macro_safe":     hb.get("risk_level") not in ("ORANGE", "RED") if hb.get("risk_level") else None,
        "sentiment_score":   temporal.get("sentiment_score_ema_24h"),
        "derivatives_score": temporal.get("derivatives_score_ema_24h"),
        "news_score":        temporal.get("news_score_ema_24h"),
        "macro_score":       temporal.get("macro_score_ema_24h"),
    }

    supabase_upsert("mi_snapshots", [record], "snapshot_at")
    regime = record.get("regime", "?")
    score = record.get("composite_score", "?")
    print(f"  [MI] Snapshot synced — regime={regime}, score={score}")


def main() -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    print(f"=== AlgoProof VPS Sync — {ts} ===")
    for bot in BOTS:
        try:
            sync_bot(bot)
        except Exception as e:
            print(f"[{bot['slug']}] ERROR: {e}")

    print("\n[wealth] Syncing wealth_calls...")
    try:
        sync_wealth_calls()
    except Exception as e:
        print(f"[wealth] ERROR: {e}")

    print("\n[prices] Syncing asset prices...")
    try:
        sync_asset_prices()
    except Exception as e:
        print(f"[prices] ERROR: {e}")

    print("\n[MI] Syncing MI snapshot...")
    try:
        sync_mi_snapshot()
    except Exception as e:
        print(f"[MI] ERROR: {e}")

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
