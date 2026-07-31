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

// The accent colour each family is drawn in. Lives here rather than in a page
// for the same reason LABELS does: /strategies and the home page both colour a
// family badge, and two local maps drift (both held five entries and fell back
// to a grey `#888` for the other four, which is how a momentum bot ended up
// painted as "unknown family" on the home page).
const COLORS: Record<Family, string> = {
  trend: '#ff6b35',
  momentum: '#58a6ff',
  breakout: '#3fb950',
  'mean-reversion': '#7c3aed',
  'price-action': '#d2a8ff',
  carry: '#f6c90e',
  'market-neutral': '#14b8a6',
  'stat-arb': '#40c4ff',
  event: '#fb923c',
}

export function isFamily(value: unknown): value is Family {
  return typeof value === 'string' && (FAMILY_ORDER as readonly string[]).includes(value)
}

export function familyLabel(f: Family): string {
  return LABELS[f]
}

export function familyColor(f: Family): string {
  return COLORS[f]
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
