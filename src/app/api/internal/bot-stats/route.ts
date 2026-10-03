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
  computeBotStatsChunk, verifyBotStats, pickSample, type JobDeps, type StoredRow,
} from '@/lib/bot-stats-job'
import type { SimState } from '@/lib/bot-summary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 40 until a page is timed on prod (Fable review, 03/10): a heavy bot is 6 trade pages.
const DEFAULT_LIMIT = 40
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
      // 1. ids and their bot only (a summary is ~3 KB: never download them all to keep 30)
      type Meta = { bot_id: string; bots: { slug: string; status: string; last_sync_at: string | null }
        | { slug: string; status: string; last_sync_at: string | null }[] | null }
      const listed = await paginateAll<Meta>(async (from, to) => {
        const { data, error } = await client.from('bot_stats')
          .select('bot_id,bots!inner(slug,status,last_sync_at)')
          .order('bot_id')
          .range(from, to)
        if (error) throw new Error(`bot_stats read failed: ${error.message}`)
        return (data ?? []) as unknown as Meta[]
      })
      // a bot that left the public set keeps a row nobody reads: not sampled
      const publicRows = listed
        .map(r => ({ bot_id: r.bot_id, bot: Array.isArray(r.bots) ? r.bots[0] : r.bots }))
        .filter(r => r.bot && r.bot.status !== 'frozen' && r.bot.status !== 'backtest')
      const picked = pickSample(publicRows, sample)
      // 2. the sampled rows, whole
      const { data: full, error: fullErr } = picked.length
        ? await client.from('bot_stats')
          .select('bot_id,formula_rev,computed_for,sim_state,segment_sha,start_capital,total_trades,source_sync_at,summary')
          .in('bot_id', picked.map(p => p.bot_id))
        : { data: [], error: null }
      if (fullErr) throw new Error(`bot_stats read failed: ${fullErr.message}`)
      const meta = new Map(picked.map(p => [p.bot_id, p.bot!]))
      const rows: StoredRow[] = (full ?? []).map(r => ({
        ...(r as unknown as StoredRow),
        summary: (r.summary ?? {}) as StoredRow['summary'],
        slug: meta.get(r.bot_id as string)!.slug,
        last_sync_at: meta.get(r.bot_id as string)!.last_sync_at,
      }))
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
