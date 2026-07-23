const QUOTE_TO_BINANCE: Record<string, string> = { USDC: 'USDT', USD: 'USDT', USDT: 'USDT' }

/** "BTC/USDC" | "BTC-USDC" -> "BTCUSDT"; null if unmappable. */
export function assetToBinanceSymbol(asset: string): string | null {
  if (!asset) return null
  const parts = asset.trim().toUpperCase().split(/[/-]/)
  if (parts.length !== 2) return null
  const [base, quote] = parts
  if (!base || !/^[A-Z0-9]{2,10}$/.test(base)) return null
  const q = QUOTE_TO_BINANCE[quote]
  if (!q) return null
  return `${base}${q}`
}

/** "BTC/USDC" -> "BINANCE:BTCUSDT"; null if unmappable. */
export function assetToWidgetSymbol(asset: string): string | null {
  const s = assetToBinanceSymbol(asset)
  return s ? `BINANCE:${s}` : null
}

const TF_TO_INTERVAL: Record<string, string> = {
  H1: '1h', H4: '4h', D1: '1d', M15: '15m', H2: '2h',
}
/** Bot timeframe label -> Binance kline interval. Defaults to 4h. */
export function timeframeToInterval(tf: string): string {
  return TF_TO_INTERVAL[(tf || '').toUpperCase()] ?? '4h'
}
