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
  'v1-spot': {
    groups: [
      {
        title: 'Signal',
        items: [
          { label: 'Entry', value: 'EMA 21 × EMA 55', note: 'direction confirmed by EMA 200' },
          { label: 'Timeframe', value: 'H4', note: '4-hour candles' },
          { label: 'ADX filter', value: 'per-asset', note: 'BTC ≥20 · SOL ≥12 · LINK/DOGE ≥15 · ADA ≥18' },
          { label: 'Direction', value: 'Long only', note: 'Binance Spot — no shorting' },
        ],
      },
      {
        title: 'Risk management',
        items: [
          { label: 'Risk per trade', value: '1%', note: '0.5% when in drawdown' },
          { label: 'Min R:R', value: '1 : 2' },
          { label: 'Stop loss', value: 'ATR × 2.0', note: 'initial — trails into profit on BTC / SOL / ADA' },
          { label: 'Take profit', value: '50% / 30% / 20%', note: 'TP1 → breakeven → TP2 → runner' },
          { label: 'Max positions', value: '3 concurrent' },
          { label: 'Max daily risk', value: '3%' },
        ],
      },
      {
        title: 'Defense mesh',
        items: [
          { label: 'MI gate', value: 'Active', note: 'blocks entry when macro unsafe (VIX / F&G / funding)' },
          { label: 'Kill switch', value: '−5% / day', note: 'auto-halt, Telegram alert' },
          { label: 'Circuit breaker', value: '3 losses → 4h pause' },
          { label: 'News blackout', value: '±30 min', note: 'around major macro events' },
        ],
      },
      {
        title: 'Costs',
        items: [
          { label: 'Exchange', value: 'Binance Spot' },
          { label: 'Taker fee', value: '0.10%' },
          { label: 'Slippage est.', value: '0.10%' },
          { label: 'Round-trip cost', value: '~0.40%' },
        ],
      },
    ],
    technicalArticle: [
      {
        title: 'Signal — croisement EMA',
        body: "L'entrée se déclenche sur le croisement de l'EMA 21 au-dessus de l'EMA 55, calculées sur des bougies H4. Un troisième filtre vérifie que le prix est au-dessus de l'EMA 200 — si ce n'est pas le cas, le croisement est ignoré : on ne trade pas contre la tendance longue. Le seuil ADX valide qu'une tendance réelle est en cours et non un range latéral. Les seuils sont calibrés par actif : BTC ≥ 20, SOL ≥ 12, LINK/DOGE ≥ 15, ADA ≥ 18.",
        code: "ema_fast = df['close'].ewm(span=21).mean()\nema_slow = df['close'].ewm(span=55).mean()\nema_200  = df['close'].ewm(span=200).mean()\n\ncross_up = (ema_fast.iloc[-1] > ema_slow.iloc[-1]\n            and ema_fast.iloc[-2] <= ema_slow.iloc[-2]\n            and df['close'].iloc[-1] > ema_200.iloc[-1]\n            and df['adx'].iloc[-1] >= ADX_THRESHOLD[asset])",
      },
      {
        title: 'Gestion du risque',
        body: "Le stop loss est posé à ATR×2.0 depuis le prix d'entrée — il s'adapte à la volatilité courante plutôt qu'un pourcentage fixe. La sortie se fait en trois paliers : 50% fermé au TP1 (R:R minimum 1:2), 30% après passage au breakeven (stop remonté au prix d'entrée), 20% en runner jusqu'à retournement du signal. Risque par trade : 1% du capital, réduit à 0.5% si le bot est en drawdown. Maximum 3 positions simultanées, plafond daily risk à 3%.",
      },
      {
        title: 'Defense Mesh — filtre Market Intelligence',
        body: "Avant chaque entrée, le service MI évalue le régime macro via 4 piliers : sentiment Fear & Greed, dérivés Binance (funding rates + ratio L/S + liquidations 60s), actualités RSS, macro globale (VIX, DXY, calendrier de 134 événements). Si risk_level est RED — notamment quand VIX > 30 — aucune entrée n'est ouverte. Événements Tier 1 (Fed, NFP, CPI) : fenêtre de blocage ±2h. Tier 2 : ±30min.",
        code: "if risk_level == 'RED':\n    return 'HOLD'   # MI veto \u2014 aucune entr\u00e9e\nif cross_up:\n    return 'BUY'    # long only sur Binance Spot\nreturn 'HOLD'",
      },
    ],
  },

  'v1-hl': {
    groups: [
      {
        title: 'Signal',
        items: [
          { label: 'Entry', value: 'EMA 21 × EMA 55', note: 'direction confirmed by EMA 200' },
          { label: 'Timeframe', value: 'H4', note: '4-hour candles' },
          { label: 'ADX filter', value: 'per-asset', note: 'BTC/ETH ≥20 · SOL ≥12 · LINK/DOGE/XRP ≥15 · ADA ≥18' },
          { label: 'Direction', value: 'Long + Short', note: 'ADA: long-only (shorts NO-GO in backtest)' },
        ],
      },
      {
        title: 'Risk management',
        items: [
          { label: 'Risk per trade', value: '1%', note: '0.5% when in drawdown' },
          { label: 'Min R:R', value: '1 : 2' },
          { label: 'Stop loss', value: 'ATR × 2.0', note: 'trails into profit on BTC / SOL / ETH / XRP / ADA' },
          { label: 'Take profit', value: '50% / 30% / 20%', note: 'TP1 → breakeven → TP2 → runner' },
          { label: 'Max positions', value: '3 concurrent' },
          { label: 'Max daily risk', value: '3%' },
        ],
      },
      {
        title: 'Defense mesh',
        items: [
          { label: 'MI gate', value: 'Active', note: 'is_safe + is_macro_safe both required' },
          { label: 'Kill switch', value: '−5% / day', note: 'auto-halt, Telegram alert' },
          { label: 'Circuit breaker', value: '3 losses → 4h pause' },
          { label: 'News blackout', value: '±30 min', note: 'around major macro events' },
        ],
      },
      {
        title: 'Costs',
        items: [
          { label: 'Exchange', value: 'Hyperliquid Perps' },
          { label: 'Taker fee', value: '0.065%', note: 'lower than most CEXs' },
          { label: 'Slippage est.', value: '0.02%' },
          { label: 'Round-trip cost', value: '~0.15%' },
        ],
      },
    ],
    technicalArticle: [
      {
        title: 'Signal — croisement EMA (longs et shorts)',
        body: "Même mécanique que la version Spot : croisement EMA 21/55 sur H4, filtre EMA 200 et ADX par actif (BTC/ETH ≥ 20, SOL ≥ 12, LINK/DOGE/XRP ≥ 15, ADA ≥ 18). La différence clé : les perps permettent de trader les deux sens. Le cross baissier (EMA 21 passant sous l'EMA 55) déclenche un short — sauf sur ADA, où les shorts ont été exclus définitivement après backtest (edge nul côté court sur cet actif).",
        code: "cross_up = (ema_fast.iloc[-1] > ema_slow.iloc[-1]\n             and ema_fast.iloc[-2] <= ema_slow.iloc[-2])\ncross_dn = (ema_fast.iloc[-1] < ema_slow.iloc[-1]\n             and ema_fast.iloc[-2] >= ema_slow.iloc[-2])\n\n# ADA : longs uniquement \u2014 shorts exclus en backtest\nif asset == 'ADA' and cross_dn:\n    return 'HOLD'",
      },
      {
        title: 'Gestion du risque',
        body: "Identique à la version Spot sur les paramètres core : ATR×2.0, sortie en 3 paliers (50%/30%/20%), risque 1% (0.5% en drawdown), max 3 positions, plafond 3%/jour. L'avantage structurel est le coût de transaction : frais taker Hyperliquid à 0.065% vs 0.10% sur Binance Spot, slippage estimé à 0.02% grâce à la profondeur du carnet. Round-trip total ~0.15% vs ~0.40% sur Spot — un différentiel qui améliore le profit factor, en particulier sur les positions courtes.",
      },
      {
        title: 'Defense Mesh — filtre Market Intelligence',
        body: "Même service MI que la version Spot, avec une importance accrue sur les perps : ouvrir un short en plein rally de sentiment (F&G > 80) ou lors d'un squeeze de liquidations présente un risque asymétrique. Le service MI bloque toute nouvelle entrée quand risk_level est RED, indépendamment de la direction du signal.",
        code: "if risk_level == 'RED':\n    return 'HOLD'   # MI veto \u2014 aucune entr\u00e9e\nif cross_up:\n    return 'BUY'    # long\nif cross_dn and asset != 'ADA':\n    return 'SELL'   # short (ADA exclu)\nreturn 'HOLD'",
      },
    ],
  },
}

export function getBotParams(slug: string): BotParams | null {
  return BOT_PARAMS[slug] ?? null
}
