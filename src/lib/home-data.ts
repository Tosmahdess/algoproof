// Pure helpers of the home's first screen (lot 3 of the design audit, 2026-09-25).
// Kept out of the components so the things a reader could get wrong (the window
// of a sparkline, the age of a sync) are pinned by
// tests/lib/home-data.test.ts rather than read off a screenshot.
import type { PerfDaily } from '@/lib/types'

/** The capital of the last thirty daily points, oldest first. Shorter histories
 *  return what they have; the sparkline draws whatever it gets. */
export function last30Capital(points: readonly PerfDaily[]): number[] {
  return [...points]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-30)
    .map(p => p.capital)
}

/** Minutes since the freshest of the given ISO dates, or null when none parses. */
export function minutesSince(dates: readonly (string | null | undefined)[], now: Date = new Date()): number | null {
  const times = dates.map(d => (d ? Date.parse(d) : Number.NaN)).filter(t => Number.isFinite(t))
  if (times.length === 0) return null
  return Math.max(0, Math.round((now.getTime() - Math.max(...times)) / 60_000))
}
