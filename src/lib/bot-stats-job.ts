// src/lib/bot-stats-job.ts
//
// The job that fills bot_stats (lot 1b, D094), behind POST /api/internal/bot-stats. The
// route wires Supabase in; everything that decides what gets written lives here, with
// its inputs passed in, so the tests drive it without a database.
//
// What it must never do is write a row that is wrong and looks right. Hence:
//   - a segment that could not be READ skips the bot (its old row stays): written as
//     « no segment », an engine bot would show its ledger under a valid formula_rev;
//   - a bot whose figures left the simulation since the last run is still written (that
//     can be true: the publisher replaced its segment) but is named in the answer, which
//     the VPS logs;
//   - verifyBotStats recomputes stored rows and names the ones that differ: the only
//     check that sees a row computed from the wrong inputs.
import type { Bot, BotWithStats } from '@/lib/types'
import type { SegmentRead } from '@/lib/backtest-segment-data'
import { fleetSimulationView } from '@/lib/bot-simulation'
import { FORMULA_REV, simStateOf, summarizeBot, type BotSummary, type SimState } from '@/lib/bot-summary'
import { mapWithConcurrency } from '@/lib/concurrency'

export type JobDeps = {
  /** Public bots ordered by slug, strictly after `after`. */
  listBotsPage: (after: string | null, limit: number) => Promise<Bot[]>
  /** The bot with its full ledger (fleet trade columns); null when it is not public. */
  fetchFleetBot: (slug: string) => Promise<BotWithStats | null>
  readSegment: (slug: string) => Promise<SegmentRead>
  /** sim_state of the rows already stored, by bot id. */
  previousStates: (botIds: string[]) => Promise<Map<string, SimState>>
  upsert: (rows: BotStatsRow[]) => Promise<void>
}

export type BotStatsRow = {
  bot_id: string
  formula_rev: number
  computed_for: string
  source_sync_at: string | null
  sim_state: SimState
  segment_sha: string | null
  start_capital: number
  total_trades: number
  summary: BotSummary
}

export type ChunkResult = {
  processed: number
  written: number
  skipped: { slug: string; reason: string }[]
  degraded: { slug: string; from: SimState; to: SimState }[]
  /** The slug to resume after, or null when this page was the last. */
  next: string | null
  /** What the run could not check, without affecting what it wrote. */
  notes: string[]
}

/** Bots computed at once: each is three paginated reads (trades, perf_daily, segment). */
export const JOB_CONCURRENCY = 8

/** Rows written per upsert (Fable review, 03/10): a page is written as it goes, so a
 *  function that times out mid-page keeps what it finished, and the `.in()` of the
 *  previous states never carries more ids than an URL holds. */
export const JOB_BATCH = 20

type Computed = { ok: true; row: BotStatsRow } | { ok: false; slug: string; reason: string }

async function computeRow(bot: Bot, today: string, deps: JobDeps): Promise<Computed> {
  const seg = await deps.readSegment(bot.slug)
  if (seg.kind === 'error') return { ok: false, slug: bot.slug, reason: `segment: ${seg.reason}` }
  let raw: BotWithStats | null
  try {
    raw = await deps.fetchFleetBot(bot.slug)
  } catch (e) {
    return { ok: false, slug: bot.slug, reason: `fetch: ${String(e)}` }
  }
  if (!raw) return { ok: false, slug: bot.slug, reason: 'not public' }
  try {
    const view = fleetSimulationView(raw, seg.kind === 'ok' ? seg.segment : null, today)
    const summary = summarizeBot(view, today)
    return { ok: true, row: {
      bot_id: raw.id,
      formula_rev: FORMULA_REV,
      computed_for: today,
      source_sync_at: raw.last_sync_at ?? null,
      sim_state: simStateOf(seg.kind, raw, view),
      segment_sha: seg.kind === 'ok' ? seg.sha : null,
      start_capital: raw.start_capital,
      total_trades: summary.stats.total_trades,
      summary,
    } }
  } catch (e) {
    return { ok: false, slug: bot.slug, reason: `summary: ${String(e)}` }
  }
}

export async function computeBotStatsChunk(
  opts: { after: string | null; limit: number; today: string }, deps: JobDeps,
): Promise<ChunkResult> {
  const bots = await deps.listBotsPage(opts.after, opts.limit)
  const slugOf = new Map(bots.map(b => [b.id, b.slug]))
  const result: ChunkResult = {
    processed: bots.length, written: 0, skipped: [], degraded: [], notes: [],
    next: bots.length === opts.limit ? bots[bots.length - 1].slug : null,
  }
  for (let i = 0; i < bots.length; i += JOB_BATCH) {
    const computed = await mapWithConcurrency(bots.slice(i, i + JOB_BATCH), JOB_CONCURRENCY,
      b => computeRow(b, opts.today, deps))
    const rows = computed.flatMap(c => (c.ok ? [c.row] : []))
    result.skipped.push(...computed.flatMap(c => (c.ok ? [] : [{ slug: c.slug, reason: c.reason }])))
    if (!rows.length) continue
    // Monitoring only: an unreadable answer never stops the write.
    try {
      const before = await deps.previousStates(rows.map(r => r.bot_id))
      for (const r of rows) {
        const from = before.get(r.bot_id)
        if (from === 'simulation' && r.sim_state !== 'simulation') {
          result.degraded.push({ slug: slugOf.get(r.bot_id) ?? r.bot_id, from, to: r.sim_state })
        }
      }
    } catch (e) {
      result.notes.push(`previous states unreadable: ${String(e)}`)
    }
    await deps.upsert(rows)
    result.written += rows.length
  }
  return result
}

// --- Verification -----------------------------------------------------------------------

/** A stored row, with its bot's slug and, when known, its CURRENT last_sync_at. */
export type StoredRow = BotStatsRow & { slug: string; last_sync_at?: string | null }

/** `n` distinct items drawn uniformly (Fisher-Yates on a copy). */
export function pickSample<T>(items: readonly T[], n: number, rand: () => number = Math.random): T[] {
  const a = [...items]
  const k = Math.min(n, a.length)
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rand() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, k)
}

export type VerifyResult = {
  checked: number
  mismatches: { slug: string; fields: string[] }[]
  skipped: { slug: string; reason: string }[]
}

function close(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => close(x, b[i]))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort()
    return ka.length === kb.length && ka.every((k, i) => k === kb[i]
      && close((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }
  return a === b
}

/** Recomputes each stored row the way the job would TODAY and names the fields that
 *  differ. The line and the ledger window depend on the day the row was computed for,
 *  so they are compared only for rows computed today. */
export async function verifyBotStats(
  opts: { rows: StoredRow[]; today: string }, deps: JobDeps,
): Promise<VerifyResult> {
  const mismatches: VerifyResult['mismatches'] = []
  const skipped: VerifyResult['skipped'] = []
  const results = await mapWithConcurrency(opts.rows, JOB_CONCURRENCY, async stored => ({
    stored,
    fresh: await computeRow({ id: stored.bot_id, slug: stored.slug } as Bot, opts.today, deps),
  }))
  for (const { stored, fresh } of results) {
    // The publisher rewrote this bot after the row was computed: a difference would be
    // the next run's job, not a defect (Fable review, 03/10).
    if (stored.last_sync_at && stored.source_sync_at
      && Date.parse(stored.last_sync_at) !== Date.parse(stored.source_sync_at)) {
      skipped.push({ slug: stored.slug, reason: 'resynced since computed' }); continue
    }
    if (!fresh.ok) { skipped.push({ slug: stored.slug, reason: fresh.reason }); continue }
    const f = fresh.row
    const fields: string[] = []
    if (stored.formula_rev !== f.formula_rev) fields.push('formula_rev')
    if (stored.sim_state !== f.sim_state) fields.push('sim_state')
    if (stored.segment_sha !== f.segment_sha) fields.push('segment_sha')
    if (!close(stored.summary.stats, f.summary.stats)) fields.push('stats')
    if (!close(stored.summary.slices, f.summary.slices)) fields.push('slices')
    if (!close(stored.summary.sides, f.summary.sides)) fields.push('sides')
    if (stored.computed_for === opts.today) {
      if (!close(stored.summary.spark30, f.summary.spark30)) fields.push('spark30')
      if (!close(stored.summary.ledgerTail, f.summary.ledgerTail)) fields.push('ledgerTail')
    }
    if (fields.length) mismatches.push({ slug: stored.slug, fields })
  }
  return { checked: results.length - skipped.length, mismatches, skipped }
}
