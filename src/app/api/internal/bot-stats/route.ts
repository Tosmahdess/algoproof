// POST /api/internal/bot-stats -- the only writer of bot_stats (lot 1b, D094).
//
// Called by the VPS right after the hourly publisher (algoproof_sync.py), page by page:
//   POST ?limit=100            -> { processed, written, skipped, degraded, next }
//   POST ?after=<next>&limit=100  ... until next is null.
// Paged so that no single call nears the function's time limit, at 240 bots or 1 000.
//
//   POST ?verify=1&sample=20   -> recompute a random sample of stored rows and name the
//                                 ones that differ (writes nothing). Run nightly.
//
// The figures are computed HERE, by the site, with the formula of the fiches
// (bot-summary.ts over fleetSimulationView): never in Python, never in SQL.
//
// Guarded by a shared secret (BOT_STATS_SECRET, header x-bot-stats-secret). Refuses to
// run without the service key: without it every segment read fails.
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabasePrivileged } from '@/lib/supabase-privileged'
import { getBotsPage, fetchFleetBot } from '@/lib/queries'
import { readBacktestSegment } from '@/lib/backtest-segment-data'
import { paginateAll } from '@/lib/paginate'
import {
  computeBotStatsChunk, verifyBotStats, type JobDeps, type StoredRow,
} from '@/lib/bot-stats-job'
import type { SimState } from '@/lib/bot-summary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200
const DEFAULT_SAMPLE = 20
const MAX_SAMPLE = 100

function authorised(req: Request, secret: string): boolean {
  const given = Buffer.from(req.headers.get('x-bot-stats-secret') ?? '')
  const want = Buffer.from(secret)
  return given.length === want.length && timingSafeEqual(given, want)
}

function intParam(v: string | null, dflt: number, max: number): number {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : dflt
}

export async function POST(req: Request) {
  const secret = process.env.BOT_STATS_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 })
  if (!authorised(req, secret)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 })

  const client = supabasePrivileged()
  if (!client) {
    console.error('[bot-stats] no service key: refusing to compute anything')
    return NextResponse.json({ error: 'service key absent' }, { status: 500 })
  }

  const deps: JobDeps = {
    listBotsPage: getBotsPage,
    fetchFleetBot,
    readSegment: readBacktestSegment,
    previousStates: async ids => {
      if (!ids.length) return new Map()
      const { data, error } = await client.from('bot_stats').select('bot_id,sim_state').in('bot_id', ids)
      if (error) throw new Error(`bot_stats read failed: ${error.message}`)
      return new Map((data ?? []).map(r => [r.bot_id as string, r.sim_state as SimState]))
    },
    upsert: async rows => {
      const computed_at = new Date().toISOString()
      const { error } = await client.from('bot_stats')
        .upsert(rows.map(r => ({ ...r, computed_at })), { onConflict: 'bot_id' })
      if (error) throw new Error(`bot_stats upsert failed: ${error.message}`)
    },
  }

  const url = new URL(req.url)
  const today = new Date().toISOString().slice(0, 10)
  const t0 = Date.now()
  try {
    if (url.searchParams.get('verify') === '1') {
      const sample = intParam(url.searchParams.get('sample'), DEFAULT_SAMPLE, MAX_SAMPLE)
      const all = await paginateAll(async (from, to) => {
        const { data, error } = await client.from('bot_stats')
          .select('bot_id,formula_rev,computed_for,sim_state,segment_sha,start_capital,total_trades,source_sync_at,summary,bots(slug)')
          .order('bot_id')
          .range(from, to)
        if (error) throw new Error(`bot_stats read failed: ${error.message}`)
        return data ?? []
      })
      const rows: StoredRow[] = all
        .map(r => {
          const b = (r as { bots?: { slug?: string } | { slug?: string }[] }).bots
          const slug = Array.isArray(b) ? b[0]?.slug : b?.slug
          return { ...(r as unknown as StoredRow), summary: (r.summary ?? {}) as StoredRow['summary'], slug: slug ?? '' }
        })
        .filter(r => r.slug)
        .sort(() => Math.random() - 0.5)
        .slice(0, sample)
      const result = await verifyBotStats({ rows, today }, deps)
      if (result.mismatches.length) console.error('[bot-stats] verify mismatches:', JSON.stringify(result.mismatches))
      return NextResponse.json({ ...result, ms: Date.now() - t0 })
    }

    const after = url.searchParams.get('after') || null
    const limit = intParam(url.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT)
    const result = await computeBotStatsChunk({ after, limit, today }, deps)
    if (result.skipped.length) console.error('[bot-stats] skipped:', JSON.stringify(result.skipped))
    if (result.degraded.length) console.error('[bot-stats] left the simulation:', JSON.stringify(result.degraded))
    return NextResponse.json({ ...result, ms: Date.now() - t0 })
  } catch (e) {
    console.error('[bot-stats] run failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
