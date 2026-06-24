// src/lib/cohort.ts
// Cohort helpers for bot listing vs aggregate stats.
//
// `archived` bots stay VISIBLE in the bot lists (/strategies) with a badge,
// but are excluded from every aggregate number (fleet P&L, counters, /performance)
// and from the stats dashboards. This is the only difference with `frozen`,
// which is hidden everywhere.

import type { BotStatus } from './types'

/** Drop archived bots — use on any surface that aggregates stats/performance. */
export function excludeArchived<T extends { status: BotStatus }>(bots: T[]): T[] {
  return bots.filter(b => b.status !== 'archived')
}
