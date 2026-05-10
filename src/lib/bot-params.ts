// Static strategy parameters per bot slug.
// These are stable config values extracted from the VPS bot configs.
// Updated manually when bot parameters change.

export interface ParamGroup {
  title: string
  items: { label: string; value: string; note?: string }[]
}

export interface TechnicalSection {
  title: string
  body: string
  code?: string
}

export interface BotParams {
  groups: ParamGroup[]
  technicalArticle?: TechnicalSection[]
}

const BOT_PARAMS: Record<string, BotParams> = {
  "v1-spot": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA 21 × EMA 55", note: "direction confirmed by EMA 200" },
          { label: "Timeframe", value: "H4", note: "4-hour candles" },
          { label: "ADX filter", value: "per-asset", note: "BTC ≥20 · SOL ≥12 · LINK/DOGE ≥15 · ADA ≥18" },
          { label: "Direction", value: "Long only", note: "Binance Spot — no shorting" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%", note: "0.5% when in drawdown" },
          { label: "Min R:R", value: "1 : 2" },
          { label: "Stop loss", value: "ATR × 2.0", note: "initial — trails into profit on BTC / SOL / ADA" },
          { label: "Take profit", value: "50% / 30% / 20%", note: "TP1 → breakeven → TP2 → runner" },
          { label: "Max positions", value: "3 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks entry when macro unsafe (VIX / F&G / funding)" },
          { label: "Kill switch", value: "−5% / day", note: "auto-halt, Telegram alert" },
          { label: "Circuit breaker", value: "3 losses → 4h pause" },
          { label: "News blackout", value: "±30 min", note: "around major macro events" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Spot" },
          { label: "Taker fee", value: "0.10%" },
          { label: "Slippage est.", value: "0.10%" },
          { label: "Round-trip cost", value: "~0.40%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — croisement EMA",
        body: "L'entrée se déclenche sur le croisement de l'EMA 21 au-dessus de l'EMA 55, calculées sur des bougies H4. Un troisième filtre vérifie que le prix est au-dessus de l'EMA 200 — si ce n'est pas le cas, le croisement est ignoré : on ne trade pas contre la tendance longue. Le seuil ADX valide qu'une tendance réelle est en cours et non un range latéral. Les seuils sont calibrés par actif : BTC ≥ 20, SOL ≥ 12, LINK/DOGE ≥ 15, ADA ≥ 18.",
        code: "ema_fast = df['close'].ewm(span=21).mean()\nema_slow = df['close'].ewm(span=55).mean()\nema_200  = df['close'].ewm(span=200).mean()\n\ncross_up = (ema_fast.iloc[-1] > ema_slow.iloc[-1]\n            and ema_fast.iloc[-2] <= ema_slow.iloc[-2]\n            and df['close'].iloc[-1] > ema_200.iloc[-1]\n            and df['adx'].iloc[-1] >= ADX_THRESHOLD[asset])",
      },
      {
        title: "Gestion du risque",
        body: "Le stop loss est posé à ATR×2.0 depuis le prix d'entrée — il s'adapte à la volatilité courante plutôt qu'un pourcentage fixe. La sortie se fait en trois paliers : 50% fermé au TP1 (R:R minimum 1:2), 30% après passage au breakeven (stop remonté au prix d'entrée), 20% en runner jusqu'à retournement du signal. Risque par trade : 1% du capital, réduit à 0.5% si le bot est en drawdown. Maximum 3 positions simultanées, plafond daily risk à 3%.",
      },
      {
        title: "Defense Mesh — filtre Market Intelligence",
        body: "Avant chaque entrée, le service MI évalue le régime macro via 4 piliers : sentiment Fear & Greed, dérivés Binance (funding rates + ratio L/S + liquidations 60s), actualités RSS, macro globale (VIX, DXY, calendrier de 134 événements). Si risk_level est RED — notamment quand VIX > 30 — aucune entrée n'est ouverte. Événements Tier 1 (Fed, NFP, CPI) : fenêtre de blocage ±2h. Tier 2 : ±30min.",
        code: "if risk_level == 'RED':\n    return 'HOLD'   # MI veto — aucune entrée\nif cross_up:\n    return 'BUY'    # long only sur Binance Spot\nreturn 'HOLD'",
      },
    ],
  },

  "v1-spot-shadow": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA 21 × EMA 55", note: "direction confirmed by EMA 200" },
          { label: "Timeframe", value: "H4", note: "4-hour candles" },
          { label: "ADX filter", value: "per-asset", note: "BTC ≥20 · SOL ≥12 · LINK/DOGE ≥15 · ADA ≥18" },
          { label: "Direction", value: "Long only", note: "Binance Spot — no shorting" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%", note: "0.5% when in drawdown" },
          { label: "Min R:R", value: "1 : 2" },
          { label: "Stop loss", value: "ATR × 2.0", note: "initial — trails into profit on BTC / SOL / ADA" },
          { label: "Take profit", value: "50% / 30% / 20%", note: "TP1 → breakeven → TP2 → runner" },
          { label: "Max positions", value: "3 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh (relâchée)",
        items: [
          { label: "MI gate", value: "Active", note: "blocks entry when macro unsafe" },
          { label: "early_be", value: "1.0R", note: "vs 0.75R en standard — breakeven déclenché plus tard" },
          { label: "trail_mult", value: "2.0", note: "vs standard — trailing plus large en ORANGE" },
          { label: "Kill switch", value: "−5% / day", note: "auto-halt, Telegram alert" },
          { label: "Circuit breaker", value: "3 losses → 4h pause" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Spot" },
          { label: "Taker fee", value: "0.10%" },
          { label: "Round-trip cost", value: "~0.40%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Objectif de la variante",
        body: "Ce bot est une copie expérimentale d'EMA Cross H4 Spot avec des paramètres de défense relâchés. L'early_be (breakeven anticipé) est déclenché à 1.0R au lieu de 0.75R en régime ORANGE. Le trailing multiplier est fixé à 2.0. L'objectif est de comparer la courbe d'équité avec la version standard sur 30 trades pour valider si le resserrement de la défense en ORANGE aide ou nuit à la performance nette.",
        code: "# early_be = 1.0  # déclenchement BE à 1R (vs 0.75R standard)\n# trail_mult = 2.0  # trailing plus ample en régime ORANGE",
      },
      {
        title: "Defense Mesh — filtre Market Intelligence",
        body: "Identique à la version standard : avant chaque entrée, le service MI évalue le régime macro via 4 piliers (sentiment, dérivés, news, macro). La seule différence est le comportement en régime ORANGE — le bot laisse les positions courir plus longtemps avant de remonter le stop au breakeven.",
        code: "if risk_level == 'RED':\n    return 'HOLD'   # MI veto — aucune entrée\nif cross_up:\n    return 'BUY'    # long only sur Binance Spot\nreturn 'HOLD'",
      },
    ],
  },

  "v1-hl": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA 21 × EMA 55", note: "direction confirmed by EMA 200" },
          { label: "Timeframe", value: "H4", note: "4-hour candles" },
          { label: "ADX filter", value: "per-asset", note: "BTC/ETH ≥20 · SOL ≥12 · LINK/DOGE/XRP ≥15 · ADA ≥18" },
          { label: "Direction", value: "Long + Short", note: "ADA: long-only (shorts NO-GO in backtest)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%", note: "0.5% when in drawdown" },
          { label: "Min R:R", value: "1 : 2" },
          { label: "Stop loss", value: "ATR × 2.0", note: "trails into profit on BTC / SOL / ETH / XRP / ADA" },
          { label: "Take profit", value: "50% / 30% / 20%", note: "TP1 → breakeven → TP2 → runner" },
          { label: "Max positions", value: "3 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "is_safe + is_macro_safe both required" },
          { label: "Kill switch", value: "−5% / day", note: "auto-halt, Telegram alert" },
          { label: "Circuit breaker", value: "3 losses → 4h pause" },
          { label: "News blackout", value: "±30 min", note: "around major macro events" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Hyperliquid Perps" },
          { label: "Taker fee", value: "0.065%", note: "lower than most CEXs" },
          { label: "Slippage est.", value: "0.02%" },
          { label: "Round-trip cost", value: "~0.15%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — croisement EMA (longs et shorts)",
        body: "L'entrée se déclenche sur le croisement des EMA 21 et 55 calculées sur des bougies H4. Le cross haussier (EMA 21 passant au-dessus de l'EMA 55) ouvre un long, le cross baissier (EMA 21 passant sous l'EMA 55) ouvre un short. Un filtre EMA 200 confirme la tendance longue, et un seuil ADX par actif valide qu'une tendance réelle est en cours plutôt qu'un range : BTC/ETH ≥ 20, SOL ≥ 12, LINK/DOGE/XRP ≥ 15, ADA ≥ 18. Sur ADA, les shorts ont été exclus définitivement après backtest — l'edge côté court y est nul, seuls les longs sont acceptés.",
        code: "ema_fast = df['close'].ewm(span=21).mean()\nema_slow = df['close'].ewm(span=55).mean()\n\ncross_up = (ema_fast.iloc[-1] > ema_slow.iloc[-1]\n             and ema_fast.iloc[-2] <= ema_slow.iloc[-2])\ncross_dn = (ema_fast.iloc[-1] < ema_slow.iloc[-1]\n             and ema_fast.iloc[-2] >= ema_slow.iloc[-2])\n\nif df['adx'].iloc[-1] < ADX_THRESHOLD[asset]:\n    return 'HOLD'\n\n# ADA : longs uniquement — shorts exclus en backtest\nif asset == 'ADA' and cross_dn:\n    return 'HOLD'",
      },
      {
        title: "Gestion du risque",
        body: "Le stop loss est posé à ATR×2.0 depuis le prix d'entrée — il s'adapte à la volatilité courante plutôt qu'un pourcentage fixe. La sortie se fait en trois paliers : 50% de la position fermée au TP1 (R:R minimum 1:2), 30% après passage du stop au breakeven (prix d'entrée), 20% en runner jusqu'à retournement du signal. Le risque par trade est de 1% du capital, réduit à 0.5% en drawdown. Maximum 3 positions simultanées, plafond daily risk à 3%. Les frais Hyperliquid (taker 0.065%) sont nettement inférieurs à la moyenne CEX (~0.10%) ; le slippage est estimé à 0.02% grâce à la profondeur du carnet, pour un round-trip total ~0.15% qui améliore mécaniquement le profit factor, en particulier sur les positions courtes où chaque bp compte.",
      },
      {
        title: "Defense Mesh — filtre Market Intelligence",
        body: "Avant chaque entrée, le service MI évalue le régime macro via 4 piliers : sentiment Fear & Greed, dérivés Binance (funding rates + ratio L/S + liquidations 60s), actualités RSS, macro globale (VIX, DXY, calendrier de 134 événements). Si risk_level est RED — notamment quand VIX > 30 — aucune nouvelle entrée n'est ouverte, indépendamment de la direction du signal : ouvrir un short en plein rally de sentiment (F&G > 80) ou lors d'un squeeze de liquidations présente un risque asymétrique particulièrement coûteux sur les perps. Les événements Tier 1 (Fed, NFP, CPI) déclenchent une fenêtre de blocage ±2h ; les Tier 2 ±30min.",
        code: "if risk_level == 'RED':\n    return 'HOLD'   # MI veto — aucune entrée\nif cross_up:\n    return 'BUY'    # long\nif cross_dn and asset != 'ADA':\n    return 'SELL'   # short (ADA exclu)\nreturn 'HOLD'",
      },
    ],
  },

  "adxregime-bf10": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "ADX(14) > 20 + EMA direction" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "10 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — ADX Régime",
        body: "L'ADX (Average Directional Index) mesure la force d'une tendance, quel que soit son sens. Le bot ne prend de position que si ADX(14) > 20 — seuil au-dessus duquel le marché est considéré comme en régime tendanciel et non en range. Une fois cette condition remplie, la direction est donnée par les EMA (croisement EMA rapide × lente). En régime ADX < 20 (range), aucune entrée n'est ouverte, indépendamment des autres signaux. Cette discipline élimine les pertes typiques des stratégies de trend-following en marché latéral. H4, 10 actifs BF perps.",
        code: "adx = compute_adx(high, low, close, 14)\nema_fast = close.ewm(span=21).mean()\nema_slow = close.ewm(span=55).mean()\n\nif adx.iloc[-1] < 20:\n    return 'HOLD'  # marché en range, on ne trade pas\nif ema_fast.iloc[-1] > ema_slow.iloc[-1]:\n    return 'BUY'\nreturn 'SELL'",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "atrchannel-bf26": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "ATR Channel(SMA 14, ATR×2.0) breakout" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "26 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — ATR Channel",
        body: "L'ATR Channel est un canal symétrique construit autour d'une SMA(14), avec des bornes à ±2.0×ATR. Différence avec le Keltner : SMA au centre (et non EMA) et multiplicateur plus large (2.0 vs 1.5). Le canal plus large génère moins de breakouts mais des breakouts plus nets — quand le prix casse une borne à ±2×ATR, le mouvement est mécaniquement plus significatif. Long sur cassure haussière, short sur cassure baissière. H4, 26 actifs BF perps.",
        code: "sma14 = close.rolling(14).mean()\natr   = compute_atr(high, low, close, 14)\nupper = sma14 + 2.0 * atr\nlower = sma14 - 2.0 * atr\n\nlong_  = close.iloc[-1] > upper.iloc[-1]\nshort_ = close.iloc[-1] < lower.iloc[-1]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "bbsqueeze-bf10": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "BB(20, 2.5σ) squeeze + expansion" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "10 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Bollinger Squeeze",
        body: "Le bot détecte les phases de compression des Bollinger Bands(20, 2.5σ) — une low-vol phase pendant laquelle l'écart entre les bandes se réduit fortement. Cette compression précède statistiquement une expansion brutale (vol inertiel : la basse vol n'est jamais durable). L'entrée n'est pas faite pendant la squeeze elle-même, mais à sa résolution : long quand le prix casse au-dessus de la bande supérieure pendant l'expansion, short quand il casse sous la bande inférieure. Le filtre de momentum (différence entre close et SMA centrale) confirme la direction. H4, 10 actifs BF perps.",
        code: "sma   = close.rolling(20).mean()\nstd   = close.rolling(20).std()\nupper = sma + 2.5 * std\nlower = sma - 2.5 * std\nbw    = (upper - lower) / sma  # bandwidth\n\nsqueeze = bw.iloc[-1] < bw.rolling(50).quantile(0.2).iloc[-1]\nexpand_up = close.iloc[-1] > upper.iloc[-1] and squeeze",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "emacross-slope-bf6": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA 21 × EMA 55", note: "direction confirmed by EMA 200" },
          { label: "Slope filter", value: "EMA55 slope > 0", note: "lookback=5 bars — rejects flat/declining trends" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "6 (BF futures)" },
          { label: "Direction", value: "Long only" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR × 2.0" },
          { label: "Max positions", value: "3 concurrent" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active" },
          { label: "Kill switch", value: "−5% / day" },
          { label: "Circuit breaker", value: "3 losses → 4h pause" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.10%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — EMA Cross + Filtre Slope",
        body: "Variant expérimental de V1 Spot. La logique EMA 21/55/200 H4 est identique, avec un filtre additionnel : la pente de l'EMA55 sur les 5 dernières bougies doit être positive au moment du signal. Ce filtre rejette les croisements qui se produisent dans des tendances plates ou en train de s'inverser — moments historiquement à plus faible edge. Backtest Phase A : CONDITIONAL GO sur 4/6 actifs (BTC, SOL, LINK, ADA). DOGE et XRP montrent une légère dégradation du trade count en dessous du seuil -30% toléré.",
        code: "slope = (ema55.iloc[-1] - ema55.iloc[-6]) / ema55.iloc[-6]\nif slope > 0 and ema21 > ema55 > ema200:\n    signal = 'long'",
      },
    ],
  },

  "bspot-ema-h4-slh1": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA 21 × EMA 55", note: "direction confirmed by EMA 200" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "SOL / LINK / DOGE", note: "Binance Spot" },
          { label: "Direction", value: "Long only" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "H1 ATR × mult", note: "tighter SL than H4 ATR on volatile assets" },
          { label: "Max positions", value: "3 concurrent" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active" },
          { label: "Kill switch", value: "−5% / day" },
          { label: "Circuit breaker", value: "3 losses → 4h pause" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Spot" },
          { label: "Taker fee", value: "0.10%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — EMA Cross H4 + SL H1 ATR",
        body: "Variant expérimental qui conserve le signal EMA cross H4 de V1 Spot mais remplace le stop loss initial ATR×2,0 calculé sur H4 par un ATR calculé sur H1. Sur SOL, LINK et DOGE — actifs où l'ATR H4 produit un stop initial supérieur à 4% du capital — le H1 ATR permet un stop plus serré, améliorant le ratio risque/récompense sans augmenter le risque d'être stoppé prématurément par du bruit H4. Backtest CONDITIONAL GO sur ces 3 actifs spécifiquement. Non testé sur BTC/ADA/XRP (H4 SL < 4% sur ces actifs).",
        code: "atr_h1 = compute_atr(df_h1, period=14)\nsl_distance = atr_h1.iloc[-1] * sl_mult_h1\nsl_price = entry_price - sl_distance",
      },
    ],
  },

  "breakout-hl-sol": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Asia Session Breakout" },
          { label: "Timeframe", value: "M5", note: "5-minute candles" },
          { label: "Asset", value: "SOL-USDC", note: "Hyperliquid perp" },
          { label: "Range window", value: "00:00–08:00 UTC" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0", note: "calculated on M5" },
          { label: "Take profit", value: "R:R 1:2" },
          { label: "Max positions", value: "1 concurrent", note: "single-asset intraday" },
          { label: "Session close", value: "End of day", note: "no overnight" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "checked at each session open" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Hyperliquid Perps" },
          { label: "Taker fee", value: "0.065%" },
          { label: "Slippage est.", value: "0.02%" },
          { label: "Round-trip cost", value: "~0.15%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Asia Session Breakout",
        body: "Stratégie intraday haute fréquence radicalement différente des bots H4 : exécution sur M5 (bougies 5 minutes), un seul actif (SOL-USDC perp Hyperliquid). Le range est défini pendant la session asiatique (00:00-08:00 UTC, période historiquement à plus faible volume sur le crypto), via le high et low de cette fenêtre. À l'ouverture européenne ou US, la cassure du range asiatique déclenche une entrée directionnelle : long sur cassure haute, short sur cassure basse. La position est fermée en fin de journée — pas de portage overnight, ce qui élimine le risque de gap nocturne.",
        code: "asia_window = df_m5.between_time('00:00', '08:00')\nrange_high  = asia_window['high'].max()\nrange_low   = asia_window['low'].min()\n\nbar = df_m5.iloc[-1]\nif bar.name.time() > pd.Timestamp('08:00').time():\n    long_  = bar['close'] > range_high\n    short_ = bar['close'] < range_low",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 calculé sur M5 (donc beaucoup plus serré en absolu qu'un ATR H4). Take profit R:R 1:2. Risque 1% par trade, une seule position simultanée (SOL only, intraday). La position est obligatoirement fermée en fin de journée pour éviter tout risque overnight. Frais Hyperliquid : taker 0.065%, slippage 0.02%, round-trip ~0.15% — coûts critiques en intraday haute fréquence où chaque trade pèse en pourcentage du gain.",
      },
      {
        title: "Defense Mesh — MI à chaque ouverture de session",
        body: "Le service MI est interrogé à chaque ouverture de session avant le calcul du range et avant chaque entrée potentielle. Si le régime est RED — VIX > 30, événement macro Tier 1 imminent, ou squeeze de liquidations en cours — aucun range n'est tracé pour la journée. Cette vérification au plus près de l'entrée est critique en intraday : un FOMC à 14:00 UTC peut transformer un range asiatique parfaitement valide en piège. Kill switch -3%/jour, circuit breaker 5 pertes → pause 4h, blackout news ±30min.",
      },
    ],
  },

  "chandelier-bf14": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Chandelier Exit (period=14, mult=3.0)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "14 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Chandelier Exit",
        body: "Le Chandelier Exit est un système de stop trailing inventé par Chuck LeBeau qui sert ici à la fois pour l'entrée et la sortie. La formule : long_stop = highest_high(14) - 3.0×ATR(14), short_stop = lowest_low(14) + 3.0×ATR(14). Une entrée long est déclenchée quand le close casse au-dessus du Chandelier long stop précédent ; une entrée short quand il casse sous le Chandelier short stop. Le multiplicateur 3.0 est plus large que les SL ATR×2.0 standard — il donne de la marge à la position avant d'être stoppée. Le stop trailing est intégré au signal lui-même : il monte automatiquement avec les nouveaux plus-hauts. H4, 14 actifs BF perps.",
        code: "atr  = compute_atr(high, low, close, 14)\nlong_stop  = high.rolling(14).max() - 3.0 * atr\nshort_stop = low.rolling(14).min() + 3.0 * atr\n\nlong_  = close.iloc[-1] > long_stop.iloc[-2]\nshort_ = close.iloc[-1] < short_stop.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "En complément du Chandelier (qui sert de stop trailing intégré), un stop loss initial est posé à ATR(14)×2.0 depuis l'entrée, take profit en R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "combobbrsi-bf9": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "BB(20, 2.5σ) breakout + RSI(21)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "9 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Bollinger Breakout + RSI",
        body: "Stratégie de breakout combinée : Bollinger Bands(20, 2.5σ) pour détecter la cassure de range, RSI(21) pour confirmer le momentum. Une entrée long se déclenche quand le close passe au-dessus de la bande supérieure ET que le RSI est > 55 (momentum haussier net). Une entrée short quand le close passe sous la bande inférieure ET que le RSI est < 45. Le RSI sur 21 périodes (vs 14 standard) lisse le bruit pour éviter les faux breakouts. Famille breakout — l'entrée se fait sur cassure et non sur retournement. H4, 9 actifs BF perps.",
        code: "sma   = close.rolling(20).mean()\nstd   = close.rolling(20).std()\nupper = sma + 2.5 * std\nlower = sma - 2.5 * std\nrsi   = compute_rsi(close, 21)\n\nlong_  = close.iloc[-1] > upper.iloc[-1] and rsi.iloc[-1] > 55\nshort_ = close.iloc[-1] < lower.iloc[-1] and rsi.iloc[-1] < 45",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED — particulièrement important pour les breakouts qui se déclenchent souvent autour des événements macro. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "comboemarsimacd-bf11": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA(9>21) + RSI(14)>50 + MACD bullish" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "11 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Triple confirmation EMA + RSI + MACD",
        body: "Système à 3 confirmations qui exige l'alignement de trois indicateurs distincts pour ouvrir une position. (1) Tendance : EMA(9) > EMA(21) pour les longs, EMA(9) < EMA(21) pour les shorts. (2) Momentum : RSI(14) > 50 pour les longs, < 50 pour les shorts. (3) Timing : signal MACD(5) en cross haussier (longs) ou baissier (shorts). Les 3 conditions doivent être simultanément vraies — ce qui réduit drastiquement le nombre de signaux mais améliore le win rate sur les actifs sélectionnés. H4, 11 actifs BF perps.",
        code: "ema9   = close.ewm(span=9).mean()\nema21  = close.ewm(span=21).mean()\nrsi14  = compute_rsi(close, 14)\nmacd_signal_cross = (macd.iloc[-1] > macd_signal.iloc[-1]\n                    and macd.iloc[-2] <= macd_signal.iloc[-2])\n\nlong_ = (ema9.iloc[-1] > ema21.iloc[-1]\n         and rsi14.iloc[-1] > 50\n         and macd_signal_cross)",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "comboichirsi-bf12": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Ichimoku TK cross + RSI(14)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "12 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Ichimoku + RSI",
        body: "Combinaison du système Ichimoku (Tenkan=20, Kijun=60, Senkou B=120) avec un filtre RSI(14). Une entrée long requiert : (1) Tenkan croise Kijun à la hausse au-dessus du cloud, et (2) RSI > 50 (momentum positif). Le RSI agit comme filtre anti-bruit dans les conditions où le cloud est plat ou ambigu — situations dans lesquelles l'Ichimoku seul génère beaucoup de faux signaux. Inverse pour les shorts (TK cross baissier sous le cloud + RSI < 50). H4, 12 actifs BF perps.",
        code: "tenkan = (high.rolling(20).max() + low.rolling(20).min()) / 2\nkijun  = (high.rolling(60).max() + low.rolling(60).min()) / 2\nspan_b = ((high.rolling(120).max() + low.rolling(120).min()) / 2).shift(26)\nrsi    = compute_rsi(close, 14)\n\ntk_up  = tenkan.iloc[-1] > kijun.iloc[-1] and tenkan.iloc[-2] <= kijun.iloc[-2]\nlong_  = tk_up and close.iloc[-1] > span_b.iloc[-1] and rsi.iloc[-1] > 50",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h, blackout ±30min news.",
      },
    ],
  },

  "combosupermacd-bf11": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "SuperTrend(7, 2.0) + MACD(8/21/5)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "11 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — SuperTrend + MACD",
        body: "Combinaison de deux systèmes complémentaires. (1) SuperTrend(period=7, factor=2.0) : indicateur basé sur l'ATR qui dessine une ligne de support/résistance dynamique et indique la direction de tendance — vert au-dessus = uptrend, rouge en dessous = downtrend. (2) MACD(8/21/5) — version rapide du MACD standard — pour le timing exact de l'entrée. Une entrée long requiert : SuperTrend en tendance haussière (vert) ET cross haussier MACD/signal. SuperTrend identifie la tendance, MACD déclenche l'entrée à l'intérieur de cette tendance. H4, 11 actifs BF perps.",
        code: "atr   = compute_atr(high, low, close, 7)\nhl2   = (high + low) / 2\nupper = hl2 + 2.0 * atr\nlower = hl2 - 2.0 * atr\nsupertrend_up = close > supertrend  # green band\n\nmacd        = close.ewm(span=8).mean() - close.ewm(span=21).mean()\nmacd_signal = macd.ewm(span=5).mean()\nmacd_cross  = macd.iloc[-1] > macd_signal.iloc[-1] and macd.iloc[-2] <= macd_signal.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "donchian-bf17": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Donchian Channel(10) breakout" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "17 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Donchian Breakout",
        body: "Le Donchian Channel est tracé par le plus-haut et le plus-bas des N dernières bougies — ici N=10. Une entrée long se déclenche quand le close casse au-dessus du plus-haut des 10 bougies précédentes ; une entrée short quand il casse sous le plus-bas. C'est la stratégie de breakout originelle, popularisée par Richard Donchian dans les années 1960 et reprise par les Turtles de Richard Dennis. Sa simplicité est sa force : aucun paramètre subtil à ajuster, le breakout se mesure directement contre le range récent. H4, 17 actifs BF perps.",
        code: "upper = high.rolling(10).max()\nlower = low.rolling(10).min()\n\nlong_  = close.iloc[-1] > upper.iloc[-2]  # break du plus-haut N-1\nshort_ = close.iloc[-1] < lower.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "emacross-9-bf9": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA(9) × EMA(50)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "9 (POL, SEI, DOT, XRP, SOL, AVAX, ATOM, FIL, HBAR)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — EMA Cross 9/50",
        body: "Configuration EMA plus rapide que le V1 (qui utilise 21/55) : EMA(9) rapide × EMA(50) lente sur H4. La période plus courte capte des tendances naissantes plus tôt et augmente le nombre de signaux, au prix d'un taux de faux positifs plus élevé. Cette config est calibrée pour un panier de 9 alts à plus haute volatilité (POL, SEI, DOT, XRP, SOL, AVAX, ATOM, FIL, HBAR) où les tendances sont plus brèves mais plus marquées que sur BTC/ETH. Long sur cross haussier, short sur cross baissier.",
        code: "ema_fast = close.ewm(span=9).mean()\nema_slow = close.ewm(span=50).mean()\n\ncross_up = ema_fast.iloc[-1] > ema_slow.iloc[-1] and ema_fast.iloc[-2] <= ema_slow.iloc[-2]\ncross_dn = ema_fast.iloc[-1] < ema_slow.iloc[-1] and ema_fast.iloc[-2] >= ema_slow.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (Fear & Greed, dérivés Binance, news, macro) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → pause 4h, blackout ±30min sur événements macro majeurs.",
      },
    ],
  },

  "emacross-bf7-x10": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA(21) × EMA(100)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "7 (BTC, POL, RENDER, SOL, SEI, ARB, DOT)" },
          { label: "Leverage", value: "×10", note: "exchange leverage" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Base risk", value: "0.5%", note: "modulated by MI" },
          { label: "MI ×5 GREEN", value: "2.5% per trade" },
          { label: "MI ×3 YELLOW", value: "1.5% per trade" },
          { label: "MI ×2 ORANGE", value: "1.0% per trade" },
          { label: "Stop loss", value: "ATR(14) × 1.5", note: "tighter to control leverage" },
          { label: "Take profit", value: "R:R 1:2" },
          { label: "Max positions", value: "4 concurrent" },
          { label: "Max daily DD", value: "−5%", note: "kill switch" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "controls leverage multiplier" },
          { label: "MI = RED", value: "0× multiplier", note: "no new entries" },
          { label: "Kill switch", value: "−5% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — EMA Cross 21/100 (avec levier)",
        body: "Croisement EMA(21) × EMA(100) sur H4. Les EMA sont volontairement plus larges que la config Vague 2 standard (9/50) — l'objectif est de capturer uniquement les changements de tendance significatifs et de filtrer les retournements éphémères. Le levier ×10 amplifie les gains sur les vraies tendances mais punit les faux signaux : les EMA larges sont une compensation directe de cette amplification. Long sur cross haussier, short sur cross baissier. Univers : 7 actifs (BTC, POL, RENDER, SOL, SEI, ARB, DOT) sélectionnés pour leur capacité à produire des tendances longues exploitables avec levier.",
        code: "ema_fast = close.ewm(span=21).mean()\nema_slow = close.ewm(span=100).mean()\n\ncross_up = ema_fast.iloc[-1] > ema_slow.iloc[-1] and ema_fast.iloc[-2] <= ema_slow.iloc[-2]\ncross_dn = ema_fast.iloc[-1] < ema_slow.iloc[-1] and ema_fast.iloc[-2] >= ema_slow.iloc[-2]",
      },
      {
        title: "Gestion du risque — modulée par MI",
        body: "Le risk sizing est radicalement différent des autres bots : le risque par trade est modulé par le régime MI plutôt que fixé. Risque de base = 0.5% du capital, multiplié par un facteur MI : ×5 en régime GREEN (= 2.5% par trade), ×3 en régime YELLOW (= 1.5%), ×2 en régime ORANGE (= 1.0%), ×0 en régime RED (= aucune entrée). Le stop loss est plus serré que la moyenne — ATR×1.5 vs ATR×2.0 standard — pour limiter l'exposition réelle malgré le levier ×10. Le maximum de positions simultanées est plafonné à 4 (vs 8 sur les bots standard) pour contrôler le risque agrégé. Daily DD kill switch à -5%.",
        code: "MI_MULT = {'GREEN': 5, 'YELLOW': 3, 'ORANGE': 2, 'RED': 0}\nbase_risk = 0.005  # 0.5%\neffective_risk = base_risk * MI_MULT[risk_level]\n\nif effective_risk == 0:\n    return 'HOLD'  # MI veto\nposition_size = (capital * effective_risk) / (1.5 * atr) * 10  # ×10 leverage",
      },
      {
        title: "Defense Mesh — MI comme contrôleur de levier",
        body: "Particularité critique de ce bot : le service MI ne contrôle pas seulement la permission d'entrer — il contrôle directement le multiplicateur de risque. Un régime RED se traduit par un multiplicateur 0×, donc aucune nouvelle entrée. Un YELLOW autorise mais réduit fortement la taille. Le bot devient ainsi un bot à exposition variable : très agressif en période de risque faible (vert), très défensif sinon. En complément : kill switch -5% sur la journée (plus sensible que les autres bots à -3% pour compenser la volatilité levier), circuit breaker 5 pertes → pause 4h, blackout news ±30min.",
      },
    ],
  },

  "emacross-oanda-eurusd": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA(9) × EMA(50)" },
          { label: "Timeframe", value: "H4" },
          { label: "Asset", value: "EUR/USD", note: "single asset, OANDA" },
          { label: "Direction", value: "Long + Short" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2" },
          { label: "Max positions", value: "2 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "même service que crypto bots" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min", note: "Fed, BCE, NFP" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Broker", value: "OANDA" },
          { label: "Spread", value: "~0.01%" },
          { label: "Round-trip cost", value: "~0.03%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — EMA Cross sur EUR/USD",
        body: "Croisement EMA(9) × EMA(50) sur H4, appliqué à un seul actif : la paire EUR/USD via OANDA. Backtest 2024-2026 : Profit Factor 1.73, Win Rate 47.1%. Le forex porte une corrélation avec le sentiment risk-on/risk-off mais ses drivers structurels (taux directeurs Fed/BCE, balance commerciale, flux de capitaux) sont distincts du crypto. Cela fait d'EUR/USD un actif intéressant pour diversifier un portefeuille de bots crypto. La config 9/50 (rapide) est calibrée pour le rythme intraday du forex H4, qui produit des retournements plus fréquents que le crypto sur cet horizon. Long sur cross haussier, short sur cross baissier.",
        code: "ema_fast = close.ewm(span=9).mean()\nema_slow = close.ewm(span=50).mean()\n\ncross_up = ema_fast.iloc[-1] > ema_slow.iloc[-1] and ema_fast.iloc[-2] <= ema_slow.iloc[-2]\ncross_dn = ema_fast.iloc[-1] < ema_slow.iloc[-1] and ema_fast.iloc[-2] >= ema_slow.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit en R:R 1:2. Risque 1% par trade, maximum 2 positions simultanées sur EUR/USD (vs 8 pour les bots multi-actifs), daily cap 3%. Coûts OANDA très inférieurs aux frais crypto : spread typique ~0.01% par côté, soit un round-trip ~0.03% (vs ~0.20% sur Binance Futures). Cet écart de coûts permet d'exploiter des edges plus fins que sur le crypto.",
      },
      {
        title: "Defense Mesh — MI sur forex",
        body: "Le service MI utilisé est le même que pour les bots crypto — les 4 piliers (Fear & Greed, dérivés Binance, news RSS, calendrier macro 134 événements) restent pertinents pour EUR/USD. Le pilier macro (VIX, DXY, calendrier Fed/BCE/CPI) est même particulièrement direct sur le forex : un FOMC ou un NFP impacte EUR/USD au même titre que les cryptos via le DXY. Le blackout news ±30min est appliqué autour des releases majeurs. Kill switch -3%/jour, circuit breaker 5 pertes → 4h.",
      },
    ],
  },

  "emaribbon-bf17": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "EMA Ribbon (5/13/34/89) aligned" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "17 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — EMA Ribbon",
        body: "Le bot empile 4 EMA — 5, 13, 34, 89 — pour former un ruban (ribbon). L'entrée long se déclenche quand les 4 EMA sont parfaitement alignées en ordre haussier : EMA(5) > EMA(13) > EMA(34) > EMA(89), ce qui caractérise une tendance haussière établie sur plusieurs horizons. Inverse pour les shorts (alignement strictement décroissant). La sortie est triggée quand le ruban se compresse (les EMA se rapprochent) ou s'inverse, ce qui signale une perte de momentum avant le cross technique classique. Timeframe H4, univers 17 actifs BF perps.",
        code: "e5  = close.ewm(span=5).mean()\ne13 = close.ewm(span=13).mean()\ne34 = close.ewm(span=34).mean()\ne89 = close.ewm(span=89).mean()\n\nbull = (e5.iloc[-1] > e13.iloc[-1] > e34.iloc[-1] > e89.iloc[-1])\nbear = (e5.iloc[-1] < e13.iloc[-1] < e34.iloc[-1] < e89.iloc[-1])",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min sur macro events.",
      },
    ],
  },

  "hatrend-bf28": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "HeikinAshi 3 bougies consécutives" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "28 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — HeikinAshi tendance",
        body: "Le bot calcule des bougies HeikinAshi à partir des bougies H4 standard. Les HA lissent la série en moyennant ouverture et clôture, ce qui produit une représentation plus claire de la tendance et masque les faux signaux des bougies classiques. Une entrée long est déclenchée après 3 bougies HA haussières consécutives (HA_close > HA_open trois fois de suite), une entrée short après 3 bougies baissières consécutives. La condition de 3 bougies (HA_CONSEC=3) est le filtre central — elle élimine les retournements éphémères au prix d'un léger lag d'entrée. Univers : 28 actifs sur Binance Futures perps.",
        code: "ha_open  = (ha_open.shift(1) + ha_close.shift(1)) / 2\nha_close = (open + high + low + close) / 4\nha_bull  = ha_close > ha_open\n\nif ha_bull.iloc[-3:].all():\n    return 'BUY'\nif (~ha_bull).iloc[-3:].all():\n    return 'SELL'\nreturn 'HOLD'",
      },
      {
        title: "Gestion du risque",
        body: "Le stop loss est calculé à ATR(14)×2.0 depuis le prix d'entrée pour s'adapter à la volatilité courante. Le take profit est fixé à un ratio risk:reward de 1:2 — la distance TP est exactement le double de la distance SL. Le risque par trade est plafonné à 1% du capital, avec un maximum de 8 positions ouvertes simultanément et un plafond daily risk à 3%. Frais Binance Futures : taker 0.05%, slippage estimé 0.05%, round-trip total ~0.20%.",
      },
      {
        title: "Defense Mesh — filtre MI et coupe-circuits",
        body: "Avant chaque entrée, le service Market Intelligence évalue le régime macro via 4 piliers (sentiment Fear & Greed, dérivés Binance, actualités RSS, calendrier macro). Si le régime est RED, l'entrée est bloquée. En complément : kill switch à -3% sur la journée (auto-halt + alerte Telegram), circuit breaker après 5 trades perdants consécutifs (pause 4h), et fenêtre de blackout de ±30min autour des événements macro majeurs.",
      },
    ],
  },

  "hmacross-bf22": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "HMA(20) × HMA(100)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "22 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — HMA Cross",
        body: "La Hull Moving Average (HMA) est construite via une double WMA (WMA(WMA)) — elle réduit fortement le lag par rapport à une EMA ou SMA classique tout en gardant un lissage propre. Le bot trade le cross entre HMA(20) (rapide) et HMA(100) (lente) sur H4. Long quand HMA(20) passe au-dessus de HMA(100), short quand elle passe en dessous. Le faible lag de la HMA donne des entrées plus précoces que les croisements EMA mais nécessite un filtre directionnel solide pour éviter les faux signaux. Univers : 22 actifs Binance Futures perps.",
        code: "def hma(series, period):\n    half = wma(series, period // 2)\n    full = wma(series, period)\n    raw  = 2 * half - full\n    return wma(raw, int(period ** 0.5))\n\nhma_fast = hma(close, 20)\nhma_slow = hma(close, 100)\ncross_up = hma_fast.iloc[-1] > hma_slow.iloc[-1] and hma_fast.iloc[-2] <= hma_slow.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 depuis l'entrée, take profit en R:R 1:2. Risque 1% par trade, max 8 positions simultanées, plafond daily 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers : F&G, dérivés, news, macro) bloque l'entrée si risk_level=RED. Kill switch -3%/jour, circuit breaker 5 pertes → pause 4h, blackout ±30min autour des événements macro majeurs.",
      },
    ],
  },

  "ichimoku-bf25": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Ichimoku TK cross + cloud" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "25 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Ichimoku Kinko Hyo",
        body: "Le bot utilise le système Ichimoku complet avec des paramètres adaptés au crypto H4 : Tenkan-sen=20, Kijun-sen=60, Senkou Span B=120, Displacement=26 (vs valeurs classiques 9/26/52/26 pensées pour daily). L'entrée long requiert deux conditions simultanées : (1) le prix est au-dessus du cloud (Senkou Span A et B), et (2) la Tenkan vient de croiser la Kijun à la hausse au-dessus du cloud. Inverse pour les shorts. Le cloud agit comme zone de support/résistance dynamique et filtre les signaux contre-tendance. Univers : 25 actifs Binance Futures perps.",
        code: "tenkan   = (high.rolling(20).max() + low.rolling(20).min()) / 2\nkijun    = (high.rolling(60).max() + low.rolling(60).min()) / 2\nsenkou_a = ((tenkan + kijun) / 2).shift(26)\nsenkou_b = ((high.rolling(120).max() + low.rolling(120).min()) / 2).shift(26)\n\nabove_cloud = close.iloc[-1] > max(senkou_a.iloc[-1], senkou_b.iloc[-1])\ntk_cross_up = tenkan.iloc[-1] > kijun.iloc[-1] and tenkan.iloc[-2] <= kijun.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 depuis l'entrée, take profit en R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque l'entrée si risk_level=RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h, blackout ±30min autour des événements macro majeurs.",
      },
    ],
  },

  "kamacross-bf26": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "KAMA(10, 2, 30) cross" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "26 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — KAMA Cross",
        body: "La KAMA (Kaufman Adaptive Moving Average) ajuste dynamiquement sa vitesse de lissage en fonction du bruit de marché via le Efficiency Ratio. En tendance forte (ER élevé), elle se rapproche d'une EMA rapide (constante 2) ; en marché latéral, elle se rapproche d'une EMA lente (constante 30). Les paramètres utilisés sont period=10, fast=2, slow=30. L'entrée se fait sur le cross du prix avec sa KAMA — long quand le close passe au-dessus, short quand il passe en dessous. Univers : 26 actifs sur Binance Futures perps, timeframe H4.",
        code: "er  = abs(close - close.shift(10)) / abs(close.diff()).rolling(10).sum()\nsc  = (er * (2/(2+1) - 2/(30+1)) + 2/(30+1)) ** 2\nkama = kama.shift(1) + sc * (close - kama.shift(1))\n\ncross_up = close.iloc[-1] > kama.iloc[-1] and close.iloc[-2] <= kama.iloc[-2]\ncross_dn = close.iloc[-1] < kama.iloc[-1] and close.iloc[-2] >= kama.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 depuis le prix d'entrée, take profit en R:R 1:2 (la distance TP fait le double de la distance SL). Risque par trade 1% du capital, maximum 8 positions ouvertes simultanément, plafond daily risk 3%. Frais Binance Futures : taker 0.05%, slippage estimé 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh — filtre MI et coupe-circuits",
        body: "Service MI actif en amont de chaque entrée : 4 piliers (Fear & Greed, dérivés Binance, news RSS, calendrier macro 134 événements). Si risk_level=RED, blocage de l'entrée. Kill switch -3%/jour (auto-halt + Telegram), circuit breaker 5 pertes consécutives → pause 4h, blackout news ±30min autour des événements macro majeurs.",
      },
    ],
  },

  "keltner-hlperps-xau": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Keltner Channel breakout" },
          { label: "Parameters", value: "EMA 20, ATR×1.5" },
          { label: "Timeframe", value: "H4" },
          { label: "Asset", value: "XAU-USDC", note: "gold perp on Hyperliquid" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2" },
          { label: "Max positions", value: "3 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "Fed/CPI events critical for XAU" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Hyperliquid Perps" },
          { label: "Taker fee", value: "0.065%" },
          { label: "Slippage est.", value: "0.02%" },
          { label: "Round-trip cost", value: "~0.15%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Keltner Breakout sur XAU",
        body: "Le bot trade le Keltner Channel(period=20, multiplicateur=1.5×ATR) sur H4, appliqué à un seul actif : le perp XAU-USDC sur Hyperliquid. Une entrée long se déclenche quand le close casse au-dessus de la borne supérieure (EMA 20 + 1.5×ATR), un short quand il casse sous la borne inférieure (EMA 20 - 1.5×ATR). L'or réagit à des drivers macro distincts du crypto — dollar (DXY), taux réels US, sentiment risk-off — ce qui en fait un actif décorrélé intéressant pour diversifier un portefeuille de bots. Backtest : Profit Factor 1.31, 262 trades, Sharpe 1.94.",
        code: "ema20 = close.ewm(span=20).mean()\natr   = compute_atr(high, low, close, 14)\nupper = ema20 + 1.5 * atr\nlower = ema20 - 1.5 * atr\n\nlong_  = close.iloc[-1] > upper.iloc[-1]\nshort_ = close.iloc[-1] < lower.iloc[-1]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit en R:R 1:2. Risque 1% par trade, max 3 positions simultanées (single-asset cap), daily cap 3%. Hyperliquid taker fee 0.065%, slippage estimé 0.02%, round-trip ~0.15% — significativement moins cher qu'un broker traditionnel sur l'or.",
      },
      {
        title: "Defense Mesh — MI critique pour XAU",
        body: "Le service MI est particulièrement pertinent pour l'or : les événements macro (décisions Fed, CPI, données emploi US) ont un impact direct et souvent brutal sur XAU via le canal taux réels et DXY. Le pilier macro de MI (calendrier 134 événements) déclenche un blackout ±30min autour des releases Tier 1 (FOMC, NFP, CPI), évitant les gaps de prix typiques sur l'or autour de ces annonces. MI gate bloque toute entrée en régime RED, kill switch -3%/jour, circuit breaker 5 pertes → 4h.",
      },
    ],
  },

  "keltnerbreak-bf26": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Keltner Channel(EMA 14, ATR×1.5) breakout" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "26 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Keltner Channel Breakout",
        body: "Le Keltner Channel est un canal de volatilité construit autour d'une EMA centrale, avec des bornes définies par l'ATR plutôt que par l'écart-type (différence avec Bollinger). Paramètres : EMA(14) au centre, multiplicateur ATR=1.5. Long quand le close casse au-dessus de la borne supérieure (EMA + 1.5×ATR), short quand il casse sous la borne inférieure (EMA - 1.5×ATR). Famille breakout — les positions sont prises sur cassure et non sur retour à la moyenne. Le fait d'utiliser l'ATR comme mesure de volatilité rend les bornes plus stables que les Bollinger en marché volatile. H4, 26 actifs BF perps.",
        code: "ema14 = close.ewm(span=14).mean()\natr   = compute_atr(high, low, close, 14)\nupper = ema14 + 1.5 * atr\nlower = ema14 - 1.5 * atr\n\nlong_  = close.iloc[-1] > upper.iloc[-1]\nshort_ = close.iloc[-1] < lower.iloc[-1]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED — particulièrement important pour les breakouts qui se déclenchent souvent autour des événements macro. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "macdvolume-bf11": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "MACD(12/26/9) + Volume" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "11 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — MACD avec confirmation Volume",
        body: "Le bot utilise un MACD standard (EMA fast=12, EMA slow=26, signal=9) mais ajoute un filtre de volume : l'entrée n'est validée que si le cross du MACD avec sa signal line est accompagné d'un volume de bougie supérieur à la moyenne mobile du volume sur 20 bougies. Ce filtre élimine les croisements MACD survenus en faible activité — typiquement les retournements éphémères de week-end ou de basse liquidité. Long sur cross haussier confirmé, short sur cross baissier confirmé. H4, 11 actifs BF perps.",
        code: "ema12 = close.ewm(span=12).mean()\nema26 = close.ewm(span=26).mean()\nmacd  = ema12 - ema26\nsignal = macd.ewm(span=9).mean()\nvol_avg = volume.rolling(20).mean()\n\ncross_up = (macd.iloc[-1] > signal.iloc[-1]\n            and macd.iloc[-2] <= signal.iloc[-2]\n            and volume.iloc[-1] > vol_avg.iloc[-1])",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions simultanées, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → pause 4h, blackout ±30min sur macro events.",
      },
    ],
  },

  "macsimple-bf10": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "SMA(10) × SMA(30)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "10 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — MAC Simple (SMA Cross)",
        body: "MAC = Moving Average Crossover. Le bot utilise des SMA simples (10 et 30 périodes) plutôt que des EMA, ce qui les rend plus réactives sur les retournements rapides — la SMA donne le même poids à toutes les bougies de sa fenêtre, là où l'EMA pondère exponentiellement les bougies récentes. Long sur cross haussier (SMA 10 passe au-dessus de SMA 30), short sur cross baissier. La simplicité du système le rend particulièrement adapté aux actifs à volatilité moyenne où les EMA peuvent être trop lentes. H4, 10 actifs BF perps.",
        code: "sma_fast = close.rolling(10).mean()\nsma_slow = close.rolling(30).mean()\n\ncross_up = sma_fast.iloc[-1] > sma_slow.iloc[-1] and sma_fast.iloc[-2] <= sma_slow.iloc[-2]\ncross_dn = sma_fast.iloc[-1] < sma_slow.iloc[-1] and sma_fast.iloc[-2] >= sma_slow.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h, blackout ±30min news.",
      },
    ],
  },

  "orb-bf25": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Opening Range Breakout (H1)" },
          { label: "Timeframe", value: "H1" },
          { label: "Assets", value: "25 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Opening Range Breakout",
        body: "Stratégie ORB classique adaptée au crypto. La première bougie de la session UTC (00:00-01:00) définit le range d'ouverture (high et low de cette heure). Une entrée long se déclenche dès qu'une bougie suivante de la session casse au-dessus du high de la première heure ; un short dès qu'une bougie casse sous le low. C'est le seul bot Vague 2 en H1 — toutes les autres tournent en H4 ou D1. Cette granularité plus fine génère plus de signaux et capture des mouvements intraday qui échappent aux bots H4. Sharpe le plus haut de Vague 2 (5.39 sur backtest DOGE). 25 actifs BF perps.",
        code: "session_start = '00:00'\nor_range = df.between_time('00:00', '01:00')\nor_high  = or_range['high'].max()\nor_low   = or_range['low'].min()\n\nbar = df.iloc[-1]\nif bar.name.time() > pd.Timestamp('01:00').time():\n    long_  = bar['close'] > or_high\n    short_ = bar['close'] < or_low",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 calculé sur H1, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED — particulièrement critique en H1 où le bruit macro impacte directement les ouvertures de session. Kill switch -3%/jour, circuit breaker 5 pertes → 4h, blackout ±30min news.",
      },
    ],
  },

  "roc-bf12": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "ROC(25) zero cross" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "12 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Rate of Change",
        body: "Le ROC (Rate of Change) calcule la variation en pourcentage entre le close actuel et celui d'il y a 25 bougies : ROC = (close[-1] - close[-26]) / close[-26] × 100. C'est l'indicateur de momentum le plus simple : long quand ROC > 0 (le prix est plus haut qu'il y a 25 bougies), short quand ROC < 0. La stratégie repose sur l'hypothèse de persistance du momentum sur ~4 jours (25 bougies H4). Une période de 25 est assez longue pour filtrer le bruit court-terme tout en restant réactive. H4, 12 actifs BF perps.",
        code: "roc = (close - close.shift(25)) / close.shift(25) * 100\n\ncross_up_zero = roc.iloc[-1] > 0 and roc.iloc[-2] <= 0\ncross_dn_zero = roc.iloc[-1] < 0 and roc.iloc[-2] >= 0",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h, blackout ±30min news.",
      },
    ],
  },

  "rsidivergence-bf6": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "RSI(14) divergence (10-bar)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "6 (LINK, ATOM, UNI, LTC, BCH, TON)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — RSI Divergence",
        body: "Le bot détecte les divergences entre le prix et le RSI(14) sur une fenêtre de 10 bougies. Une divergence haussière classique se produit quand le prix fait un nouveau plus-bas alors que le RSI fait un plus-haut — signalant un essoufflement de la pression vendeuse. Le bot recherche aussi les divergences cachées (hidden) : prix avec un plus-bas plus haut + RSI avec un plus-bas plus bas, qui indiquent une continuation de tendance après pullback. Le panier de 6 actifs (LINK, ATOM, UNI, LTC, BCH, TON) a été sélectionné pour ses caractéristiques de momentum cyclique exploitables par les divergences. H4.",
        code: "lookback = 10\nprice_low_now  = close.iloc[-1] == close.iloc[-lookback:].min()\nrsi_low_prev   = rsi.iloc[-lookback:-1].min()\nrsi_higher     = rsi.iloc[-1] > rsi_low_prev\n\nbull_div = price_low_now and rsi_higher",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h, blackout ±30min news.",
      },
    ],
  },

  "temacross-bf10": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "TEMA(20) × TEMA(100)" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "10 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — TEMA Cross",
        body: "La TEMA (Triple Exponential Moving Average) est calculée comme 3×EMA - 3×EMA(EMA) + EMA(EMA(EMA)). Cette construction réduit le lag d'environ 3× par rapport à une SMA tout en lissant le bruit mieux qu'une EMA simple. Le bot trade le cross entre TEMA(20) (rapide) et TEMA(100) (lente) sur H4. Long sur cross haussier, short sur cross baissier. Le faible lag rend la TEMA particulièrement adaptée aux marchés à momentum rapide. H4, 10 actifs BF perps.",
        code: "def tema(series, period):\n    e1 = series.ewm(span=period).mean()\n    e2 = e1.ewm(span=period).mean()\n    e3 = e2.ewm(span=period).mean()\n    return 3 * e1 - 3 * e2 + e3\n\ntema_fast = tema(close, 20)\ntema_slow = tema(close, 100)\ncross_up = tema_fast.iloc[-1] > tema_slow.iloc[-1] and tema_fast.iloc[-2] <= tema_slow.iloc[-2]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "tsi-bf8": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "TSI(40, 20) zero/signal cross" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "8 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — True Strength Index",
        body: "Le TSI (True Strength Index) de William Blau mesure le momentum du changement de prix relativement à sa propre amplitude. Il s'agit d'un double lissage exponentiel : TSI = 100 × EMA(EMA(price_change, 40), 20) / EMA(EMA(|price_change|, 40), 20). Le bot ouvre un long quand le TSI passe au-dessus de zéro (ou de sa signal line), un short quand il passe en dessous. Les paramètres long=40, short=20 sont calibrés pour H4 — plus longs que les valeurs par défaut (25/13) pour filtrer les retournements éphémères. 8 actifs BF perps.",
        code: "diff   = close.diff()\nabs_d  = diff.abs()\nnum    = diff.ewm(span=40).mean().ewm(span=20).mean()\nden    = abs_d.ewm(span=40).mean().ewm(span=20).mean()\ntsi    = 100 * num / den\n\ncross_up_zero = tsi.iloc[-1] > 0 and tsi.iloc[-2] <= 0",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "ttmsqueeze-bf7": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "TTM Squeeze (BB×KC) + momentum" },
          { label: "Timeframe", value: "H4" },
          { label: "Assets", value: "7 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — TTM Squeeze",
        body: "Le TTM Squeeze de John Carter combine deux indicateurs de volatilité pour détecter les phases de compression. Bollinger Bands(20, 2.0σ) à l'intérieur du Keltner Channel(20, 1.5×ATR) = squeeze actif (les BB plus étroites que le KC indiquent une volatilité réelle inférieure au seuil ATR). Le squeeze se relâche dès que les BB sortent du KC. L'histogramme de momentum (calculé sur 5 périodes) donne la direction de la sortie : positif = long, négatif = short. L'entrée se déclenche au moment précis où le squeeze se relâche, dans la direction du momentum. H4, 7 actifs BF perps.",
        code: "bb_up = sma20 + 2.0 * std20\nbb_dn = sma20 - 2.0 * std20\nkc_up = ema20 + 1.5 * atr20\nkc_dn = ema20 - 1.5 * atr20\n\nsqueeze = (bb_up < kc_up) and (bb_dn > kc_dn)  # BB inside KC\nrelease = (not squeeze) and (squeeze.shift(1))\nmom     = (close - close.shift(5))",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "wvolbreak-bf28": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Williams VolBreakout (D1)" },
          { label: "Timeframe", value: "D1" },
          { label: "Assets", value: "28 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Williams Volatility Breakout",
        body: "Stratégie de breakout sur Daily inspirée de Larry Williams. La règle : entrée long si close[-1] > close[-2] + 0.5 × range[-2], où range[-2] = high[-2] - low[-2]. Inversement pour les shorts (close < prev_close - 0.5×prev_range). Le fait de travailler sur Daily — alors que la majorité des autres bots Vague 2 sont en H4 — fournit moins de signaux mais avec une conviction plus haute, et un meilleur ratio signal/bruit en environnement crypto. 28 actifs BF perps.",
        code: "prev_range = high.shift(1) - low.shift(1)\nlong_lvl   = close.shift(1) + 0.5 * prev_range\nshort_lvl  = close.shift(1) - 0.5 * prev_range\n\nlong_  = close.iloc[-1] > long_lvl.iloc[-1]\nshort_ = close.iloc[-1] < short_lvl.iloc[-1]",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 (calculé sur Daily), take profit R:R 1:2. Risque 1% par trade, max 8 positions simultanées, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "x1-wvborb-bf7": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Williams VolBreak D1 + ORB H1" },
          { label: "Timeframe", value: "H1 + D1" },
          { label: "Assets", value: "7 (AVAX, BTC, DOGE, GALA, HBAR, SEI, SOL)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Williams VolBreak + ORB",
        body: "Combinaison de deux signaux de breakout sur deux timeframes. (1) Williams Volatility Breakout en Daily : close > prev_close + 0.5×prev_range pour les longs, inverse pour les shorts. Détecte les breakouts macro sur D1. (2) Opening Range Breakout en H1 : la première bougie UTC (00:00-01:00) définit le range, l'entrée se fait à la cassure haute ou basse. Les deux signaux doivent être alignés dans le même sens — l'ORB H1 fournit le timing précis d'entrée à l'intérieur du breakout daily déjà confirmé. 7 actifs sélectionnés (AVAX, BTC, DOGE, GALA, HBAR, SEI, SOL) pour leur réactivité aux ouvertures de session.",
        code: "# D1 — Williams VolBreak\nprev_range = (high_d1 - low_d1).shift(1)\nwvb_long   = close_d1.iloc[-1] > close_d1.shift(1).iloc[-1] + 0.5 * prev_range.iloc[-1]\n\n# H1 — Opening Range\nor_high = df_h1.between_time('00:00', '01:00')['high'].max()\norb_long = close_h1.iloc[-1] > or_high\n\nlong_ = wvb_long and orb_long",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 calculé sur H1, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate (4 piliers) bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },

  "x3-emakeltner-bf22": {
    groups: [
      {
        title: "Signal",
        items: [
          { label: "Entry", value: "Keltner H4 + EMA(100) D1" },
          { label: "Timeframe", value: "H4 + D1" },
          { label: "Assets", value: "22 (BF perps)" },
        ],
      },
      {
        title: "Risk management",
        items: [
          { label: "Risk per trade", value: "1%" },
          { label: "Stop loss", value: "ATR(14) × 2.0" },
          { label: "Take profit", value: "R:R 1:2", note: "TP = 2 × SL distance" },
          { label: "Max positions", value: "8 concurrent" },
          { label: "Max daily risk", value: "3%" },
        ],
      },
      {
        title: "Defense mesh",
        items: [
          { label: "MI gate", value: "Active", note: "blocks when regime = RED" },
          { label: "Kill switch", value: "−3% / day" },
          { label: "Circuit breaker", value: "5 losses → 4h pause" },
          { label: "News blackout", value: "±30 min" },
        ],
      },
      {
        title: "Costs",
        items: [
          { label: "Exchange", value: "Binance Futures Perps" },
          { label: "Taker fee", value: "0.05%" },
          { label: "Slippage est.", value: "0.05%" },
          { label: "Round-trip cost", value: "~0.20%" },
        ],
      },
    ],
    technicalArticle: [
      {
        title: "Signal — Multi-timeframe Keltner + EMA",
        body: "Système multi-timeframe à trois facteurs. (1) Sur H4 : Keltner Channel(period=14, ATR×1.5) — l'entrée se fait sur cassure de la borne haute ou basse. (2) Sur Daily : filtre directionnel via EMA(100) — long uniquement si close D1 > EMA 100 D1, short uniquement si close D1 < EMA 100 D1. Le filtre Daily empêche les breakouts H4 contre la tendance long-terme. (3) Direction d'entrée alignée avec les deux conditions. Cette approche multi-TF réduit les faux signaux typiques des breakouts en marché contre-tendance. 22 actifs BF perps.",
        code: "# H4 timeframe — breakout\nkc_upper_h4 = ema14_h4 + 1.5 * atr_h4\nkc_lower_h4 = ema14_h4 - 1.5 * atr_h4\nbreakout_up = close_h4.iloc[-1] > kc_upper_h4.iloc[-1]\n\n# D1 timeframe — trend filter\nema100_d1   = close_d1.ewm(span=100).mean()\nd1_bull     = close_d1.iloc[-1] > ema100_d1.iloc[-1]\n\nlong_ = breakout_up and d1_bull",
      },
      {
        title: "Gestion du risque",
        body: "Stop loss à ATR(14)×2.0 calculé sur H4, take profit R:R 1:2. Risque 1% par trade, max 8 positions, daily cap 3%. Frais BF : taker 0.05%, slippage 0.05%, round-trip ~0.20%.",
      },
      {
        title: "Defense Mesh",
        body: "MI gate bloque les entrées en régime RED. Kill switch -3%/jour, circuit breaker 5 pertes → 4h pause, blackout ±30min news.",
      },
    ],
  },
}

export function getBotParams(slug: string): BotParams | null {
  return BOT_PARAMS[slug] ?? null
}
