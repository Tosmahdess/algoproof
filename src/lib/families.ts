// src/lib/families.ts
// Single source of truth for the bot family taxonomy, mirroring the `families`
// table (migration 017). Both algoproof.fr and lab.algoproof.fr key on these
// nine slugs. Adding one is a migration, not an edit here alone.

export type Family =
  | 'trend'
  | 'momentum'
  | 'breakout'
  | 'mean-reversion'
  | 'price-action'
  | 'carry'
  | 'market-neutral'
  | 'stat-arb'
  | 'event'

export const FAMILY_ORDER = [
  'trend',
  'momentum',
  'breakout',
  'mean-reversion',
  'price-action',
  'carry',
  'market-neutral',
  'stat-arb',
  'event',
] as const satisfies readonly Family[]

const LABELS: Record<Family, string> = {
  trend: 'Suivi de tendance',
  momentum: 'Momentum',
  breakout: 'Cassure',
  'mean-reversion': 'Retour à la moyenne',
  'price-action': 'Zones et price action',
  carry: 'Portage',
  'market-neutral': 'Neutre au marché',
  'stat-arb': 'Arbitrage statistique',
  event: 'Événementiel',
}

export function isFamily(value: unknown): value is Family {
  return typeof value === 'string' && (FAMILY_ORDER as readonly string[]).includes(value)
}

export function familyLabel(f: Family): string {
  return LABELS[f]
}

export type Venue =
  | 'binance-spot'
  | 'binance-futures'
  | 'kraken'
  | 'hyperliquid'
  | 'bybit'
  | 'okx'

export type BotOrigin = 'engine' | 'manual'
export type RejudgeStatus = 'not_needed' | 'queued' | 'done'
