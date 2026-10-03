// src/lib/bot-summary.ts
//
// What a LIST shows for a bot, computed once per publisher pass instead of on every
// render (lot 1b, D094). The lists used to load every trade and every daily point of
// every public bot to show five figures, three side slices and a 30-value line; at
// 240 bots that is ~720 Supabase requests on a cold render, at 1 000 it is the wall.
//
// The summary is NOT a second formula. It is the composition the lists already ran --
// fleetSimulationView (the fiche's simulation, D073), registerSlices, last30Capital --
// done by the site, written to bot_stats by /api/internal/bot-stats, and read back by
// the lists. When a row is missing or was computed by another formula revision, the
// list computes the summary live with THIS function, so a stored row and a live one
// cannot differ except by the data they were computed from.
//
// Pure: no Supabase import here, so the job, the lists and the tests share it.
import type { BotStats, BotWithStats } from '@/lib/types'
import { registerSlices, type SideSlices } from '@/lib/register-slices'
import { last30Capital } from '@/lib/home-data'

/** Bump on ANY change to what summarizeBot computes, directly or through the modules it
 *  composes (tests/lib/bot-summary-formula-guard.test.ts hashes them and fails until
 *  this moves). A row with another revision is never served: the list recomputes. */
export const FORMULA_REV = 1

/** Days of LEDGER kept for /overview's 30-day curves, plus the last point before them.
 *  Wider than the 30 the page shows, so a summary computed up to a few days earlier
 *  still covers the page's window. */
export const LEDGER_TAIL_DAYS = 35

export type CurvePoint = { date: string; capital: number }

export type BotSummary = {
  /** The list's figures: the simulation since the freeze for an engine bot. */
  stats: BotStats
  /** The register's figures for each side, no asset filter. `all` equals `stats`. */
  slices: SideSlices
  sides: { long: boolean; short: boolean }
  /** The row's line: at most 30 values, oldest first (simulation for an engine bot). */
  spark30: number[]
  /** The LEDGER (perf_daily as executed) over the last LEDGER_TAIL_DAYS days, preceded by
   *  its last point before them: the fleet curves carry each bot's last capital forward. */
  ledgerTail: CurvePoint[]
}

/** Where the figures come from, stored beside the summary so a bot that silently fell
 *  back to its ledger is countable instead of invisible. */
export type SimState = 'simulation' | 'ledger' | 'no_segment'

export function simStateOf(segmentKind: 'ok' | 'none', raw: BotWithStats, view: BotWithStats): SimState {
  if (segmentKind === 'none') return 'no_segment'
  // fleetSimulationView hands the bot back untouched when its segment and its ledger
  // disagree (buildTimeline null): the figures are then the ledger's.
  return view === raw ? 'ledger' : 'simulation'
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function ledgerTailOf(view: BotWithStats, computedFor: string): CurvePoint[] {
  const from = daysBefore(computedFor, LEDGER_TAIL_DAYS)
  const points = [...view.perf_daily]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map(p => ({ date: p.date, capital: Number(p.capital) }))
  const inside = points.filter(p => p.date >= from)
  const before = points.filter(p => p.date < from).at(-1)
  return before ? [before, ...inside] : inside
}

function assertFinite(summary: BotSummary, slug: string): void {
  const numbers: number[] = [
    ...Object.values(summary.stats),
    ...(['all', 'long', 'short'] as const).flatMap(k => Object.values(summary.slices[k])),
    ...summary.spark30,
    ...summary.ledgerTail.map(p => p.capital),
  ]
  if (numbers.some(n => typeof n !== 'number' || !Number.isFinite(n))) {
    throw new Error(`[bot-summary] ${slug}: a figure is not finite; jsonb would store it as null`)
  }
}

/** `view` is the bot AFTER fleetSimulationView: the same object the lists rendered. */
export function summarizeBot(view: BotWithStats, computedFor: string): BotSummary {
  const { slices, sides } = registerSlices(view, [])
  const summary: BotSummary = {
    stats: view.stats,
    slices,
    sides,
    spark30: last30Capital(view.list_perf_daily ?? view.perf_daily),
    ledgerTail: ledgerTailOf(view, computedFor),
  }
  assertFinite(summary, view.slug)
  return summary
}

const STAT_KEYS: (keyof BotStats)[] =
  ['win_rate', 'profit_factor', 'max_drawdown', 'total_trades', 'latest_capital']

function isStats(x: unknown): x is BotStats {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return STAT_KEYS.every(k => typeof o[k] === 'number' && Number.isFinite(o[k]))
}

function isNumberArray(x: unknown): x is number[] {
  return Array.isArray(x) && x.every(n => typeof n === 'number' && Number.isFinite(n))
}

/** The summary read back from jsonb, or null when it is not one: the list then
 *  recomputes the bot live, as for a missing row. */
export function parseSummary(x: unknown): BotSummary | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const slices = o.slices as Record<string, unknown> | undefined
  const sides = o.sides as Record<string, unknown> | undefined
  if (!isStats(o.stats)) return null
  if (!slices || !isStats(slices.all) || !isStats(slices.long) || !isStats(slices.short)) return null
  if (!sides || typeof sides.long !== 'boolean' || typeof sides.short !== 'boolean') return null
  if (!isNumberArray(o.spark30)) return null
  if (!Array.isArray(o.ledgerTail) || !o.ledgerTail.every(p =>
    p && typeof p.date === 'string' && typeof p.capital === 'number' && Number.isFinite(p.capital))) return null
  return {
    stats: o.stats,
    slices: { all: slices.all, long: slices.long, short: slices.short },
    sides: { long: sides.long, short: sides.short },
    spark30: o.spark30,
    ledgerTail: o.ledgerTail.map(p => ({ date: p.date as string, capital: p.capital as number })),
  }
}
