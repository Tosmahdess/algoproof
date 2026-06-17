// src/lib/asset.ts

/**
 * Normalize any asset identifier to its base symbol.
 *  'SOL-USDT' -> 'SOL' | 'BTC/USDT' -> 'BTC' | 'XAU-USDC' -> 'XAU'
 *  'EUR/USD'  -> 'EUR' | 'SOL' -> 'SOL' | '1000SHIB/USDT' -> 'SHIB'
 * Defensive: empty/falsy input -> 'UNKNOWN' (must never throw).
 */
export function toBaseAsset(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'UNKNOWN'
  const cleaned = raw.trim().toUpperCase()
  if (!cleaned) return 'UNKNOWN'
  // split on first '/' or '-'
  const base = cleaned.split(/[/-]/)[0]
  if (!base) return 'UNKNOWN'
  // strip leading '1000' perp-contract prefix when a real symbol remains
  const stripped = base.replace(/^1000(?=[A-Z])/, '')
  return stripped || base
}

export type AssetFilter = string          // 'all' = every asset
export const ALL_ASSETS: AssetFilter = 'all'

export interface AssetOption {
  value: string   // base symbol, e.g. 'BTC'
  label: string   // 'BTC (101)'
  count: number
}

/** Distinct base-symbol options sorted by descending trade volume. */
export function assetOptionsFromTrades(trades: { asset: string }[]): AssetOption[] {
  const counts = new Map<string, number>()
  for (const t of trades) {
    const base = toBaseAsset(t.asset)
    counts.set(base, (counts.get(base) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: `${value} (${count})`, count }))
}
