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

# Standard Binance Futures asset pool — sliced per bot
_BF28 = [
    "BTC/USDT","ETH/USDT","SOL/USDT","BNB/USDT","XRP/USDT","DOGE/USDT",
    "ADA/USDT","AVAX/USDT","LINK/USDT","DOT/USDT","MATIC/USDT","UNI/USDT",
    "ATOM/USDT","LTC/USDT","FIL/USDT","OP/USDT","ARB/USDT","INJ/USDT",
    "TIA/USDT","SUI/USDT","APT/USDT","SEI/USDT","NEAR/USDT","FTM/USDT",
    "SAND/USDT","MANA/USDT","1000SHIB/USDT","1000PEPE/USDT",
]

def _bf(n: int) -> list: return _BF28[:n]
def _bf_n(n: int) -> list: return [f"{n} actifs Binance Futures"]

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

    # ── Trend Following — New Schema (BF Perps) ──────────────────────────────
    {
        "slug": "hatrend-bf28", "name": "HeikinAshi Tendance H4 BF", "family": "trend",
        "schema": "new", "strategy": "HeikinAshi H4 — 28 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(28), "timeframe": "H4",
        "description": "Utilise les bougies HeikinAshi pour filtrer le bruit et identifier les tendances claires. L'entrée se fait sur signal HA confirmé en H4 sur 28 actifs Binance Futures. Les bougies HA lissent le prix et rendent les tendances visuellement et algorithmiquement plus nettes que les bougies classiques.",
        "db_path": os.path.expanduser("~/apex_hatrend_bfperps_28/db/paper_state.db"),
        "paper_state_name": "apex_hatrend_bfperps_28", "start_capital": 1000.0,
    },
    {
        "slug": "kamacross-bf26", "name": "KAMA Cross H4 BF", "family": "trend",
        "schema": "new", "strategy": "KAMA H4 — 26 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(26), "timeframe": "H4",
        "description": "KAMA (Kaufman Adaptive Moving Average) adapte sa sensibilité à la volatilité du marché — rapide en tendance forte, lent en range. Ce comportement adaptatif filtre naturellement les faux signaux sans paramètre manuel à ajuster.",
        "db_path": os.path.expanduser("~/apex_kamacross_bfperps_26/db/paper_state.db"),
        "paper_state_name": "apex_kamacross_bfperps_26", "start_capital": 1000.0,
    },
    {
        "slug": "hmacross-bf22", "name": "HMA Cross H4 BF", "family": "trend",
        "schema": "new", "strategy": "HMA H4 — 22 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(22), "timeframe": "H4",
        "description": "HMA (Hull Moving Average) réduit le lag des moyennes mobiles classiques tout en restant lisse. Le croisement rapide/lent capte les retournements de tendance plus tôt que l'EMA standard, avec moins de whipsaws.",
        "db_path": os.path.expanduser("~/apex_hmacross_bfperps_22/db/paper_state.db"),
        "paper_state_name": "apex_hmacross_bfperps_22", "start_capital": 1000.0,
    },
    {
        "slug": "ichimoku-bf25", "name": "Ichimoku H4 BF", "family": "trend",
        "schema": "new", "strategy": "Ichimoku H4 — 25 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(25), "timeframe": "H4",
        "description": "Système Ichimoku complet sur H4 : entrée au-dessus du kumo haussier, confirmation du croisement tenkan/kijun. Vision holistique de la tendance, du momentum et des niveaux de support/résistance en une seule lecture.",
        "db_path": os.path.expanduser("~/apex_ichimoku_bfperps_25/db/paper_state.db"),
        "paper_state_name": "apex_ichimoku_bfperps_25", "start_capital": 1000.0,
    },
    {
        "slug": "emacross-9-bf9", "name": "EMA Cross 9/50 H4 BF", "family": "trend",
        "schema": "new", "strategy": "EMA 9/50 H4 — 9 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(9), "timeframe": "H4",
        "description": "Croisement EMA 9/50 sur H4 — plus réactif que la version 21/100, génère davantage de signaux avec des R:R potentiellement plus courts. Optimisé sur 9 actifs à forte liquidité Binance Futures.",
        "db_path": os.path.expanduser("~/apex_emacross_bfperps_9/db/paper_state.db"),
        "paper_state_name": "apex_emacross_bfperps_9", "start_capital": 1000.0,
    },
    {
        "slug": "emaribbon-bf17", "name": "EMA Ribbon H4 BF", "family": "trend",
        "schema": "new", "strategy": "EMA Ribbon H4 — 17 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(17), "timeframe": "H4",
        "description": "Ruban de 4 EMAs (5/13/34/89). L'alignement progressif du ruban indique une tendance forte et durable ; le désalignement signale l'essoufflement avant le retournement. Donne une lecture de la solidité de la tendance impossible avec une seule MA.",
        "db_path": os.path.expanduser("~/apex_emaribbon_bfperps_17/db/paper_state.db"),
        "paper_state_name": "apex_emaribbon_bfperps_17", "start_capital": 1000.0,
    },
    {
        "slug": "macdvolume-bf11", "name": "MACD Volume H4 BF", "family": "trend",
        "schema": "new", "strategy": "MACD + Volume H4 — 11 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(11), "timeframe": "H4",
        "description": "MACD classique filtré par le volume : un signal MACD sans volume élevé est ignoré. Ce filtre élimine les signaux en range faible volume et concentre les entrées sur les mouvements confirmés par la participation du marché.",
        "db_path": os.path.expanduser("~/apex_macdvolume_bfperps_11/db/paper_state.db"),
        "paper_state_name": "apex_macdvolume_bfperps_11", "start_capital": 1000.0,
    },
    {
        "slug": "combobbrsi-bf9", "name": "Combo BB+RSI H4 BF", "family": "trend",
        "schema": "new", "strategy": "BB + RSI H4 — 9 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(9), "timeframe": "H4",
        "description": "Combo Bollinger Bands + RSI : entrée quand le prix teste la bande et que le RSI confirme l'excès de momentum. Deux outils de nature différente — volatilité et momentum — qui se renforcent mutuellement.",
        "db_path": os.path.expanduser("~/apex_combobbrsi_bfperps_9/db/paper_state.db"),
        "paper_state_name": "apex_combobbrsi_bfperps_9", "start_capital": 1000.0,
    },
    {
        "slug": "comboichirsi-bf12", "name": "Combo Ichi+RSI H4 BF", "family": "trend",
        "schema": "new", "strategy": "Ichimoku + RSI H4 — 12 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(12), "timeframe": "H4",
        "description": "Ichimoku définit la structure de marché, RSI confirme le momentum. Position validée uniquement quand les deux systèmes sont alignés dans la même direction — double confirmation qui réduit les entrées mais améliore leur qualité.",
        "db_path": os.path.expanduser("~/apex_comboichirsi_bfperps_12/db/paper_state.db"),
        "paper_state_name": "apex_comboichirsi_bfperps_12", "start_capital": 1000.0,
    },
    {
        "slug": "rsidivergence-bf6", "name": "RSI Divergence H4 BF", "family": "trend",
        "schema": "new", "strategy": "RSI Divergence H4 — 6 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(6), "timeframe": "H4",
        "description": "Détecte les divergences entre le RSI et le prix : un nouveau plus bas de prix non confirmé par le RSI signale un retournement haussier imminent. Signal de retournement puissant mais rare — qualité plutôt que quantité.",
        "db_path": os.path.expanduser("~/apex_rsidivergence_bfperps_6/db/paper_state.db"),
        "paper_state_name": "apex_rsidivergence_bfperps_6", "start_capital": 1000.0,
    },
    {
        "slug": "adxregime-bf10", "name": "ADX Régime H4 BF", "family": "trend",
        "schema": "new", "strategy": "ADX Régime H4 — 10 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(10), "timeframe": "H4",
        "description": "ADX (Average Directional Index) mesure la force de la tendance. Ce bot refuse d'entrer quand l'ADX < 25 — il ne trade pas les marchés en range où les tendances ne durent pas. Patience payante : moins de trades, plus efficaces.",
        "db_path": os.path.expanduser("~/apex_adxregime_bfperps_10/db/paper_state.db"),
        "paper_state_name": "apex_adxregime_bfperps_10", "start_capital": 1000.0,
    },
    {
        "slug": "macsimple-bf10", "name": "MAC Simple H4 BF", "family": "trend",
        "schema": "new", "strategy": "MAC Simple H4 — 10 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(10), "timeframe": "H4",
        "description": "MAC (Moving Average Channel) simple : canal formé par deux MAs. Entrée sur cassure du canal dans la direction de la tendance. Logique épurée et transparente — facile à auditer, robuste sur l'historique.",
        "db_path": os.path.expanduser("~/apex_macsimple_bfperps_10/db/paper_state.db"),
        "paper_state_name": "apex_macsimple_bfperps_10", "start_capital": 1000.0,
    },
    {
        "slug": "chandelier-bf14", "name": "Chandelier Exit H4 BF", "family": "trend",
        "schema": "new", "strategy": "Chandelier Exit H4 — 14 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(14), "timeframe": "H4",
        "description": "Chandelier Exit : stop dynamique ATR ancré au plus haut récent. Reste en position tant que la tendance tient, sort proprement quand la volatilité franchit le seuil. Gestion de position automatique et rationnelle.",
        "db_path": os.path.expanduser("~/apex_chandelier_bfperps_14/db/paper_state.db"),
        "paper_state_name": "apex_chandelier_bfperps_14", "start_capital": 1000.0,
    },
    {
        "slug": "comboemarsimacd-bf11", "name": "Combo EMA+RSI+MACD H4 BF", "family": "trend",
        "schema": "new", "strategy": "EMA+RSI+MACD H4 — 11 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(11), "timeframe": "H4",
        "description": "Triple confirmation : EMA signale la direction, RSI valide le momentum, MACD confirme la divergence. Trois filtres indépendants doivent s'aligner — moins de trades, chacun avec une conviction maximale.",
        "db_path": os.path.expanduser("~/apex_comboemarsimacd_bfperps_11/db/paper_state.db"),
        "paper_state_name": "apex_comboemarsimacd_bfperps_11", "start_capital": 1000.0,
    },
    {
        "slug": "temacross-bf10", "name": "TEMA Cross H4 BF", "family": "trend",
        "schema": "new", "strategy": "TEMA 20/100 H4 — 10 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(10), "timeframe": "H4",
        "description": "TEMA (Triple Exponential Moving Average) réduit encore plus le lag que l'HMA. Croisement 20/100 plus réactif que l'EMA classique, idéal sur des actifs à forte dynamique directionnelle.",
        "db_path": os.path.expanduser("~/apex_temacross_bfperps_10/db/paper_state.db"),
        "paper_state_name": "apex_temacross_bfperps_10", "start_capital": 1000.0,
    },
    {
        "slug": "tsi-bf8", "name": "TSI H4 BF", "family": "trend",
        "schema": "new", "strategy": "True Strength Index H4 — 8 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(8), "timeframe": "H4",
        "description": "TSI (True Strength Index) : oscillateur de momentum basé sur un double lissage exponentiel du prix brut. Plus propre que le RSI en tendance forte, moins sensible au bruit de court terme.",
        "db_path": os.path.expanduser("~/apex_tsi_bfperps_8/db/paper_state.db"),
        "paper_state_name": "apex_tsi_bfperps_8", "start_capital": 1000.0,
    },
    {
        "slug": "combosupermacd-bf11", "name": "Combo SuperTrend+MACD H4 BF", "family": "trend",
        "schema": "new", "strategy": "SuperTrend+MACD H4 — 11 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(11), "timeframe": "H4",
        "description": "SuperTrend définit la direction de la tendance, MACD confirme le momentum. Deux systèmes de nature différente — l'un basé sur la volatilité ATR, l'autre sur les MAs — qui ne génèrent des faux positifs que rarement en même temps.",
        "db_path": os.path.expanduser("~/apex_combosupermacd_bfperps_11/db/paper_state.db"),
        "paper_state_name": "apex_combosupermacd_bfperps_11", "start_capital": 1000.0,
    },
    {
        "slug": "roc-bf12", "name": "ROC H4 BF", "family": "trend",
        "schema": "new", "strategy": "Rate of Change H4 — 12 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(12), "timeframe": "H4",
        "description": "ROC (Rate of Change) : mesure le pourcentage de variation du prix sur une période fixe. Momentum pur, sans la distorsion des moyennes mobiles lissées. Signal précoce sur les accélérations de tendance.",
        "db_path": os.path.expanduser("~/apex_roc_bfperps_12/db/paper_state.db"),
        "paper_state_name": "apex_roc_bfperps_12", "start_capital": 1000.0,
    },

    # ── Breakout / Volatility — New Schema (BF Perps) ─────────────────────────
    {
        "slug": "wvolbreak-bf28", "name": "Williams Vol Break D1 BF", "family": "breakout",
        "schema": "new", "strategy": "Williams Vol Break D1 — 28 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(28), "timeframe": "D1",
        "description": "Williams %R sur D1 combiné à un filtre de volatilité. Détecte les conditions de surachat/survente sur le timeframe journalier, puis attend la cassure de volume pour entrer dans la direction de la pression dominante.",
        "db_path": os.path.expanduser("~/apex_wvolbreak_bfperps_28/db/paper_state.db"),
        "paper_state_name": "apex_wvolbreak_bfperps_28", "start_capital": 1000.0,
    },
    {
        "slug": "keltnerbreak-bf26", "name": "Keltner Break H4 BF", "family": "breakout",
        "schema": "new", "strategy": "Keltner H4 — 26 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(26), "timeframe": "H4",
        "description": "Cassure des canaux de Keltner (enveloppe ATR) sur H4. Quand le prix sort du canal, la volatilité s'est libérée et un nouveau mouvement directionnel démarre. Signal d'expansion — entrée au début, pas au milieu.",
        "db_path": os.path.expanduser("~/apex_keltnerbreak_bfperps_26/db/paper_state.db"),
        "paper_state_name": "apex_keltnerbreak_bfperps_26", "start_capital": 1000.0,
    },
    {
        "slug": "atrchannel-bf26", "name": "ATR Channel H4 BF", "family": "breakout",
        "schema": "new", "strategy": "ATR Channel H4 — 26 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(26), "timeframe": "H4",
        "description": "Canal ATR : le prix sort de son enveloppe de volatilité normale → début d'un mouvement directionnel fort. Simple, robuste, basé sur la volatilité pure sans indicateur supplémentaire.",
        "db_path": os.path.expanduser("~/apex_atrchannel_bfperps_26/db/paper_state.db"),
        "paper_state_name": "apex_atrchannel_bfperps_26", "start_capital": 1000.0,
    },
    {
        "slug": "orb-bf25", "name": "ORB H1 BF", "family": "breakout",
        "schema": "new", "strategy": "Opening Range H1 — 25 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(25), "timeframe": "H1",
        "description": "Opening Range Breakout : le range de la première heure définit les niveaux clés de la journée. Cassure au-dessus ou en dessous → entrée dans le sens de la cassure. Stratégie institutionnelle classique adaptée aux futures crypto.",
        "db_path": os.path.expanduser("~/apex_orb_bfperps_25/db/paper_state.db"),
        "paper_state_name": "apex_orb_bfperps_25", "start_capital": 1000.0,
    },
    {
        "slug": "donchian-bf17", "name": "Donchian Break H4 BF", "family": "breakout",
        "schema": "new", "strategy": "Donchian H4 — 17 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(17), "timeframe": "H4",
        "description": "Cassure des niveaux Donchian (plus haut/plus bas sur N périodes). Entrée sur nouveau plus haut ou nouveau plus bas historique — stratégie de suivi de tendance par la breakout, popularisée par les Turtle Traders.",
        "db_path": os.path.expanduser("~/apex_donchian_bfperps_17/db/paper_state.db"),
        "paper_state_name": "apex_donchian_bfperps_17", "start_capital": 1000.0,
    },
    {
        "slug": "bbsqueeze-bf10", "name": "BB Squeeze H4 BF", "family": "breakout",
        "schema": "new", "strategy": "BB Squeeze H4 — 10 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(10), "timeframe": "H4",
        "description": "BB Squeeze : quand les Bandes de Bollinger se resserrent à l'intérieur du canal Keltner, la volatilité est comprimée et une explosion directionnelle se prépare. Entrée à la libération du squeeze avec confirmation de direction.",
        "db_path": os.path.expanduser("~/apex_bbsqueeze_bfperps_10/db/paper_state.db"),
        "paper_state_name": "apex_bbsqueeze_bfperps_10", "start_capital": 1000.0,
    },
    {
        "slug": "ttmsqueeze-bf7", "name": "TTM Squeeze H4 BF", "family": "breakout",
        "schema": "new", "strategy": "TTM Squeeze H4 — 7 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(7), "timeframe": "H4",
        "description": "TTM Squeeze : détecte les phases de compression (BB dans Keltner) et mesure le momentum via un histogramme. Entrée quand le squeeze se libère ET que le momentum histogramme confirme la direction.",
        "db_path": os.path.expanduser("~/apex_ttmsqueeze_bfperps_7/db/paper_state.db"),
        "paper_state_name": "apex_ttmsqueeze_bfperps_7", "start_capital": 1000.0,
    },
    {
        "slug": "breakout-hl-sol", "name": "Session Breakout SOL HL", "family": "breakout",
        "schema": "breakout", "strategy": "Asia Session Breakout M5 — SOL", "status": "paper",
        "exchange": "Hyperliquid", "assets": ["SOL-USDC"], "timeframe": "M5",
        "description": "Breakout de la session asiatique sur SOL en perpetuals Hyperliquid. Le range formé pendant la nuit asiatique (volume réduit) définit les niveaux clés. La cassure lors de l'ouverture européenne ou américaine génère l'entrée directionnelle.",
        "db_path": os.path.expanduser("~/apex_breakout_hlperps_1/db/hl_bot.db"),
        "paper_state_name": None, "start_capital": 1000.0,
    },

    # ── Multi-Signal — New Schema ──────────────────────────────────────────────
    {
        "slug": "x3-emakeltner-bf22", "name": "X3 EmaKeltner H4 BF", "family": "multi-signal",
        "schema": "new", "strategy": "EMA D1 + Keltner H4 — 22 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(22), "timeframe": "H4",
        "description": "Cross-timeframe : EMA 21/100 sur D1 définit la tendance macro, canal Keltner sur H4 identifie l'entrée tactique précise. Les deux timeframes doivent être alignés — convergence obligatoire pour entrer.",
        "db_path": os.path.expanduser("~/apex_x3_emakeltner_bfperps_22/db/paper_state.db"),
        "paper_state_name": "apex_x3_emakeltner_bfperps_22", "start_capital": 1000.0,
    },
    {
        "slug": "x1-wvborb-bf7", "name": "X1 WvbOrb H1 BF", "family": "multi-signal",
        "schema": "new", "strategy": "WR14 D1 + ORB H1 — 7 actifs", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(7), "timeframe": "H1",
        "description": "Williams Vol Break sur D1 donne la direction macro, ORB sur H1 fournit le timing d'entrée précis. Deux logiques orthogonales — momentum journalier + breakout horaire — qui filtrent mutuellement les faux signaux.",
        "db_path": os.path.expanduser("~/apex_x1_wvborb_bfperps_7/db/paper_state.db"),
        "paper_state_name": "apex_x1_wvborb_bfperps_7", "start_capital": 1000.0,
    },

    # ── Leveraged — New Schema ─────────────────────────────────────────────────
    {
        "slug": "emacross-bf7-x10", "name": "EMA Cross ×10 BF (Avec levier)", "family": "leveraged",
        "schema": "new", "strategy": "EMA 21/100 H4 — 7 actifs — Levier ×10", "status": "paper",
        "exchange": "Binance Futures", "assets": _bf(7), "timeframe": "H4",
        "description": "Version levée ×10 dynamique de la stratégie EMA Cross. Même logique de signal et même gestion du risque — mais l'amplitude des P&L est multipliée par 10. Réservé aux capitaux adaptés et à l'appétit au risque élevé.",
        "db_path": os.path.expanduser("~/apex_emacross_bfperps_7/db/paper_state.db"),
        "paper_state_name": "apex_emacross_bfperps_7", "start_capital": 1000.0,
    },

    # ── Multi-Asset ────────────────────────────────────────────────────────────
    {
        "slug": "emacross-eur-usd", "name": "EMA Cross EUR/USD OANDA", "family": "multi-asset",
        "schema": "new", "strategy": "EMA 9/50 H4 — EUR/USD", "status": "paper",
        "exchange": "OANDA", "assets": ["EUR/USD"], "timeframe": "H4",
        "description": "Croisement EMA 9/50 sur H4 appliqué à la paire EUR/USD sur OANDA. Décorrélé du marché crypto — pure exposition Forex pour diversifier le portefeuille. Les bots crypto et Forex réagissent rarement aux mêmes catalyseurs.",
        "db_path": os.path.expanduser("~/apex_emacross_oanda_eurusd/db/paper_state.db"),
        "paper_state_name": "apex_emacross_oanda_eurusd", "start_capital": 1000.0,
    },
    {
        "slug": "keltner-xau-hl", "name": "Keltner Gold HL Perps", "family": "multi-asset",
        "schema": "new", "strategy": "Keltner H4 — XAU-USDC", "status": "paper",
        "exchange": "Hyperliquid", "assets": ["XAU-USDC"], "timeframe": "H4",
        "description": "Canal Keltner H4 sur l'or (XAU-USDC) via perpetuals Hyperliquid. L'or comme actif de diversification non-crypto avec un système de cassure de volatilité. Corrélé négativement au dollar, réagit différemment des cryptos.",
        "db_path": os.path.expanduser("~/apex_keltner_hlperps_xau/db/paper_state.db"),
        "paper_state_name": "apex_keltner_hlperps_xau", "start_capital": 1000.0,
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
    """Read current paper balance from paper_state table (V1 schema: balance column)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT balance FROM paper_state WHERE bot_name = ? ORDER BY id DESC LIMIT 1", (bot_name,))
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


def get_paper_equity(db_path: str, bot_name: str) -> float | None:
    """Read current paper equity from paper_state table (New schema: equity column)."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT equity FROM paper_state WHERE bot_name = ? ORDER BY id DESC LIMIT 1", (bot_name,))
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


def load_trades_new_schema(db_path: str) -> list[dict]:
    """Load closed trades from New Schema bots (pnl_usdt, closed_at IS NOT NULL)."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT opened_at   AS timestamp,
               closed_at,
               symbol,
               direction,
               pnl_usdt    AS pnl,
               exit_reason
        FROM trades
        WHERE closed_at IS NOT NULL
          AND paper = 1
        ORDER BY closed_at ASC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    valid = []
    for r in rows:
        if should_skip(r.get("exit_reason") or ""):
            continue
        r["exit_reason"] = clean_exit_reason(r.get("exit_reason") or "")
        r["symbol"]      = clean_asset(r["symbol"])
        r["direction"]   = (r["direction"] or "long").lower()
        valid.append(r)
    return valid


def load_trades_breakout_schema(db_path: str) -> list[dict]:
    """Load closed trades from Breakout Schema bots (net_usdc, entry_time/exit_time)."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT entry_time  AS timestamp,
               exit_time   AS closed_at,
               symbol,
               direction,
               net_usdc    AS pnl,
               exit_reason
        FROM trades
        WHERE status = 'closed'
          AND exit_time IS NOT NULL
        ORDER BY exit_time ASC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    valid = []
    for r in rows:
        r["exit_reason"] = clean_exit_reason(r.get("exit_reason") or "")
        r["symbol"]      = clean_asset(r["symbol"])
        r["direction"]   = (r["direction"] or "long").lower()
        valid.append(r)
    return valid


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

    # 2. Load trades — dispatch by schema
    schema = bot_cfg.get("schema", "v1")
    if schema == "new":
        trades = load_trades_new_schema(db_path)
    elif schema == "breakout":
        trades = load_trades_breakout_schema(db_path)
    else:
        trades = load_trades_from_db(db_path)
    print(f"[{slug}] {len(trades)} valid closed trades loaded (schema={schema})")

    # 3. Sync trades (delete + insert)
    supabase_delete("trades", bot_id)
    if trades:
        trade_rows = [
            {
                "bot_id":     bot_id,
                "opened_at":  t["timestamp"],
                "closed_at":  t["closed_at"],
                "asset":      t["symbol"],
                "side":       t["direction"],
                "pnl":        round(float(t["pnl"]), 4),
                "reason":     t["exit_reason"],
                "is_paper":   True,
            }
            for t in trades
        ]
        supabase_upsert("trades", trade_rows, "")
    print(f"[{slug}] {len(trades)} trades pushed")

    # 4. Build and sync perf_daily
    if schema == "new":
        paper_balance = get_paper_equity(db_path, paper_name) if paper_name else None
    elif schema == "breakout":
        paper_balance = None  # no paper_state table in breakout schema
    else:
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


GROWTH_ALERTS_DB = os.path.expanduser("~/apex_wealth/db/growth_alerts.db")


def sync_growth_alerts() -> None:
    """Sync GROWTH watchlist dip alert history from SQLite to Supabase growth_alerts."""
    if not os.path.exists(GROWTH_ALERTS_DB):
        print("  [growth] DB not found — skipping")
        return

    conn = sqlite3.connect(GROWTH_ALERTS_DB)
    rows = conn.execute("""
        SELECT alerted_at, ticker, asset_name, drawdown_pct, ma50_gap_pct, rsi14,
               signal_level, confidence, market_regime, mi_score, mi_regime,
               current_price, high_90d, suggested_min, suggested_max, indicators
        FROM growth_alerts ORDER BY alerted_at ASC
    """).fetchall()
    conn.close()

    if not rows:
        print("  [growth] No alerts to sync — skipping")
        return

    records = [
        {
            "alerted_at":   r[0], "ticker":      r[1], "asset_name":    r[2],
            "drawdown_pct": r[3], "ma50_gap_pct": r[4], "rsi14":        r[5],
            "signal_level": r[6], "confidence":  r[7], "market_regime": r[8],
            "mi_score":     r[9], "mi_regime":   r[10], "current_price": r[11],
            "high_90d":     r[12], "suggested_min": r[13], "suggested_max": r[14],
            "indicators":   r[15],
        }
        for r in rows
    ]
    supabase_upsert("growth_alerts", records, "alerted_at,ticker")
    print(f"  [growth] {len(records)} growth_alerts synced")


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

    print("\n[growth] Syncing growth alerts...")
    try:
        sync_growth_alerts()
    except Exception as e:
        print(f"[growth] ERROR: {e}")

    print("\n[MI] Syncing MI snapshot...")
    try:
        sync_mi_snapshot()
    except Exception as e:
        print(f"[MI] ERROR: {e}")

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
