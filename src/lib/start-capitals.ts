// Per-bot paper start capital.
// Source of truth: scripts/vps_sync.py (BOTS list).
// Default = 1000€. Add overrides here when a new bot launches with a different start.
//
// Why this lives here instead of in the DB: the bots.start_capital column is on the
// tech-debt list (see projects/algoproof/HANDOFF.md). When that migration ships,
// queries.ts will read the column instead of this map.

const START_CAPITAL_OVERRIDES: Record<string, number> = {
  'funding-rate-harvest': 400,
  'grid-btc-spot': 500,
}

export const DEFAULT_START_CAPITAL = 1000

export function getStartCapital(slug: string): number {
  return START_CAPITAL_OVERRIDES[slug] ?? DEFAULT_START_CAPITAL
}
