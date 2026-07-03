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

/**
 * Split a bot list into the three display cohorts used on /strategies:
 * live (real capital), paper (everything else still active), archived (badged, muted).
 */
export function splitCohorts<T extends { status: BotStatus }>(bots: T[]): {
  live: T[]
  paper: T[]
  archived: T[]
} {
  return {
    live: bots.filter(b => b.status === 'live'),
    paper: bots.filter(b => b.status !== 'live' && b.status !== 'archived'),
    archived: bots.filter(b => b.status === 'archived'),
  }
}
