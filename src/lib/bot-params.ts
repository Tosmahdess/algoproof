// Static strategy parameters per bot slug.
// These are stable config values extracted from the VPS bot configs.
// Updated manually when bot parameters change.

export interface ParamGroup {
  title: string
  items: { label: string; value: string; note?: string }[]
}

export interface BotParams {
  groups: ParamGroup[]
  codeSnippet?: string
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
    codeSnippet: `# Signal — EMA Cross H4 (Binance Spot)
ema_fast = df['close'].ewm(span=EMA_FAST).mean()
ema_slow  = df['close'].ewm(span=EMA_SLOW).mean()

cross_up = (
    ema_fast.iloc[-1] > ema_slow.iloc[-1] and
    ema_fast.iloc[-2] <= ema_slow.iloc[-2]
)

# Market Intelligence gate
# risk_level: GREEN / ORANGE / RED — computed by MI service
if cross_up and risk_level != 'RED':
    return 'BUY'   # long only — spot venue
return 'HOLD'`,
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
    codeSnippet: `# Signal — EMA Cross H4 (Hyperliquid Perps)
ema_fast = df['close'].ewm(span=EMA_FAST).mean()
ema_slow  = df['close'].ewm(span=EMA_SLOW).mean()

cross_up = ema_fast.iloc[-1] > ema_slow.iloc[-1] and ema_fast.iloc[-2] <= ema_slow.iloc[-2]
cross_dn = ema_fast.iloc[-1] < ema_slow.iloc[-1] and ema_fast.iloc[-2] >= ema_slow.iloc[-2]

# Market Intelligence gate
# risk_level: GREEN / ORANGE / RED — computed by MI service
if risk_level == 'RED':
    return 'HOLD'   # MI veto — no new entries
if cross_up:
    return 'BUY'
if cross_dn:
    return 'SELL'   # perps — longs and shorts
return 'HOLD'`,
  },
}

export function getBotParams(slug: string): BotParams | null {
  return BOT_PARAMS[slug] ?? null
}
