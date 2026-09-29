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
  // Only the armada wave bots have a segment; the others never cost a query.
  if (!slug.startsWith('arm-')) return null
  const client = supabasePrivileged()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('bot_backtest_segments')
      .select('payload')
      .eq('slug', slug)
      .limit(1)
    if (error) {
      console.error(`[backtest-segment] read failed for ${slug}:`, error)
      return null
    }
    const p = (data?.[0] as { payload?: unknown } | undefined)?.payload
    if (!isPayload(p)) return null
    return { slug, startDate: p.startDate, freezeDate: p.freezeDate, replayEnd: p.replayEnd,
      startCapital: p.startCapital, points: p.points, trades: p.trades }
  } catch (e) {
    console.error(`[backtest-segment] read threw for ${slug}:`, e)
    return null
  }
}
