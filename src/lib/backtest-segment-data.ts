// src/lib/backtest-segment-data.ts
//
// Server-side reader of a bot's backtest segment (D072): one row of bot_backtest_segments,
// written hourly by the VPS publisher (algoproof_sync.py) from the files the research box
// produces (armada/_ops/build_backtest_segments.py). Read with the service key: the table
// has no anon policy, like bot_recipes, because the site repository is public and a bulk
// read would hand out every bot's backtest at once.
//
// Kept apart from backtest-segment.ts, which a client component imports. Only ONE bot's
// curve reaches the browser, and never the row's `meta` (provenance, controls, recipe
// hash). Any failure answers null: the page then draws the plain paper view.
import { supabasePrivileged } from '@/lib/supabase-privileged'
import type { BacktestSegment, BacktestTrade } from '@/lib/backtest-segment'

type Payload = {
  startDate: string
  freezeDate: string
  replayEnd: string
  startCapital: number
  points: { date: string; capital: number }[]
  trades: BacktestTrade[]
}

function isPayload(p: unknown): p is Payload {
  const x = p as Payload
  return !!x && typeof x.startDate === 'string' && typeof x.freezeDate === 'string'
    && typeof x.replayEnd === 'string' && typeof x.startCapital === 'number'
    && Array.isArray(x.points) && x.points.length > 0 && Array.isArray(x.trades)
}

export async function getBacktestSegment(slug: string): Promise<BacktestSegment | null> {
  // Engine bots and, since D074, some hand-written ones: every fiche asks (one small
  // indexed read); a bot without a row gets the plain paper view.
  const r = await readBacktestSegment(slug)
  return r.kind === 'ok' ? r.segment : null
}

/** What the bot_stats job needs and a page does not (lot 1b, D094): WHY there is no
 *  segment. « none » is a fact about the bot (it has no row); « error » is a fact about
 *  this read (no key, a failed query, a row that does not parse) and must never be
 *  stored as if it were « none ». `sha` fingerprints the inputs the publisher built the
 *  row from, so a changed replay shows on the summary even when no TS changed. */
export type SegmentRead =
  | { kind: 'ok'; segment: BacktestSegment; sha: string }
  | { kind: 'none' }
  | { kind: 'error'; reason: string }

export async function readBacktestSegment(slug: string): Promise<SegmentRead> {
  const client = supabasePrivileged()
  if (!client) return { kind: 'error', reason: 'service key absent' }
  try {
    const { data, error } = await client
      .from('bot_backtest_segments')
      .select('payload,recipe_sha,source_sha')
      .eq('slug', slug)
      .limit(1)
    if (error) {
      console.error(`[backtest-segment] read failed for ${slug}:`, error)
      return { kind: 'error', reason: `read failed: ${error.message ?? 'unknown'}` }
    }
    const row = data?.[0] as { payload?: unknown; recipe_sha?: string; source_sha?: string } | undefined
    if (!row) return { kind: 'none' }
    const p = row.payload
    if (!isPayload(p)) return { kind: 'error', reason: 'malformed payload' }
    const raw = p as Payload & { paperScaling?: unknown; verdict?: unknown }
    return {
      kind: 'ok',
      sha: `${row.recipe_sha ?? ''}:${row.source_sha ?? ''}`,
      segment: { slug, startDate: p.startDate, freezeDate: p.freezeDate, replayEnd: p.replayEnd,
        startCapital: p.startCapital, points: p.points, trades: p.trades,
        paperScaling: raw.paperScaling === 'additive' ? 'additive' : 'proportional',
        verdict: raw.verdict === 'exploration' || raw.verdict === 'rejected' || raw.verdict === 'tested'
          ? raw.verdict : null },
    }
  } catch (e) {
    console.error(`[backtest-segment] read threw for ${slug}:`, e)
    return { kind: 'error', reason: `read threw: ${String(e)}` }
  }
}
