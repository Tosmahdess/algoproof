// src/lib/queries.ts
import { unstable_cache } from 'next/cache'
import { supabase } from './supabase'
import { Bot, BotWithStats, PerfDaily, Trade, TradeWithBot, WealthCall, AssetPrice, MiSnapshot, TriggerData, BotChangelog, ScopeType } from './types'
import { getStartCapital } from './start-capitals'
import { isCarryFamily } from './display'
import { fleetEntryAppliesTo } from './changelog'
import { paginateAll } from './paginate'
import type { AggregateTradeRow } from './fleet-aggregate'

function withStartCapital<T extends { slug: string }>(row: T): T & { start_capital: number } {
  return { ...row, start_capital: getStartCapital(row.slug) }
}

// FIX (final review, C3): `backtest` is excluded HERE, at the query, not only
// downstream. A `backtest` bot is an engine CANDIDATE that was never deployed —
// no paper run, no live run — and the spec says candidates never appear
// publicly. The rule used to live only inside `isPubliclyVisible` in
// src/lib/bot-filters.ts, which /overview's register goes through but
// /strategies (splitCohorts buckets `backtest` into `paper`) and the home page
// preview do not: a candidate was hidden on one page out of three. Filtering at
// the source makes it true by construction for every consumer, present and
// future. `isPubliclyVisible` stays in bot-filters.ts as defence in depth.
const PUBLIC_STATUS_EXCLUSION = '("frozen","backtest")'

export async function getBots(): Promise<Bot[]> {
  const { data, error } = await supabase
    .from('bots')
    // NOTE: this must stay a single string literal, not a `+` concatenation — supabase-js
    // parses the select list from the literal type of the argument to type the result rows,
    // and concatenation widens it to `string`, which degrades every row to a typed error.
    .select(
      'id,slug,name,strategy,status,family,exchange,venue,assets,timeframe,description,created_at,last_sync_at,origin,found_at,validated_at,paper_since,live_since,frozen_at,archived_at,engine_unit_key,rejudge_status'
    )
    .not('status', 'in', PUBLIC_STATUS_EXCLUSION)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(withStartCapital) as Bot[]
}

export async function getBotSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('bots')
    .select('slug')
    .not('status', 'in', PUBLIC_STATUS_EXCLUSION)
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => r.slug)
}

export async function getBotWithStats(slug: string): Promise<BotWithStats | null> {
  const { data: bot, error: botErr } = await supabase
    .from('bots')
    .select('*')
    .eq('slug', slug)
    .single()
  // FIX (final whole-branch review, C1): the exclusion above (getBots /
  // getBotSlugs) only governs LISTINGS. This function is fetched by slug, and
  // all three of its consumers — /strategies/bot/[slug], /(embed)/embed/[slug]
  // and /api/card/[slug] — declare `dynamicParams = true`, which is what makes
  // an unlisted slug reach the handler at all instead of 404ing on the static
  // param set. So a `backtest` candidate that never ran, or a `frozen` bot that
  // is hidden everywhere else, still got a full indexable fiche, an iframe
  // embeddable on third-party sites, and a social card — three public surfaces
  // reached by guessing one URL. The visibility rule has to live where the row
  // is loaded, not only where lists are built.
  if (botErr || !bot || bot.status === 'backtest' || bot.status === 'frozen') return null

  // Supabase caps a single request at 1000 rows — page through every row, otherwise
  // PF/WR/capital silently reflect only the newest 1000 trades (and, for perf_daily
  // ordered ascending, the OLDEST 1000 rows — freezing capital in the past). This is
  // the same cap /overview already pages around. See paginate.ts.
  const allTrades = await paginateAll<Trade>(async (from, to) => {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('bot_id', bot.id)
      .order('closed_at', { ascending: false })
      .range(from, to)
    if (error) throw new Error(`trades fetch failed for bot ${bot.id}: ${error.message}`)
    return (data ?? []) as Trade[]
  })

  const allPerf = await paginateAll<PerfDaily>(async (from, to) => {
    const { data, error } = await supabase
      .from('perf_daily')
      .select('*')
      .eq('bot_id', bot.id)
      .order('date', { ascending: true })
      .range(from, to)
    if (error) throw new Error(`perf_daily fetch failed for bot ${bot.id}: ${error.message}`)
    return (data ?? []) as PerfDaily[]
  })
  const startCapital = getStartCapital(bot.slug)

  const wins = allTrades.filter(t => t.pnl > 0).length
  const win_rate = allTrades.length > 0 ? wins / allTrades.length : 0

  const grossProfit = allTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss   = Math.abs(allTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const profit_factor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  const capitals = allPerf.map(p => p.capital)
  let peak = capitals[0] ?? 0
  let max_drawdown = 0
  for (const c of capitals) {
    if (c > peak) peak = c
    const dd = peak > 0 ? (peak - c) / peak : 0
    if (dd > max_drawdown) max_drawdown = dd
  }

  return {
    ...bot,
    start_capital: startCapital,
    stats: {
      win_rate,
      profit_factor,
      max_drawdown,
      total_trades: allTrades.length,
      // Fall back to start + Σ pnl when a bot has trades but no perf_daily rows
      // (carry bots like funding-rate-harvest) — otherwise this per-bot stat zeroes
      // their P&L while the stage 0 aggregate (computeFleetAggregate, driven off raw
      // trades) counts it, causing a fleet-total mismatch on /overview.
      latest_capital: capitals.length > 0
        ? capitals[capitals.length - 1]
        : startCapital + allTrades.reduce((s, t) => s + t.pnl, 0),
    },
    perf_daily: allPerf,
    recent_trades: allTrades.slice(0, 20),
    all_trades: allTrades,
  }
}

async function getAllBotsWithStatsUncached(): Promise<BotWithStats[]> {
  const bots = await getBots()
  return Promise.all(bots.map(async b => {
    const result = await getBotWithStats(b.slug)
    if (!result) throw new Error(`getBotWithStats returned null for slug: ${b.slug}`)
    return result
  }))
}

// FIX round 3 (Finding B): /overview used to carry `export const revalidate =
// 1800`, amortising this page's cost to one render per 30 minutes. Fix round 2
// deleted it — reading `searchParams` there opts the route into dynamic
// (per-request) rendering regardless, so a route-level `revalidate` would have
// been dead code — but nothing replaced the amortisation itself. Without it,
// every request re-runs a paginated `select('*')` over trades AND perf_daily
// for each of ~33 bots. Next 15+ does not cache `fetch()` by default, and
// there is no other caching layer in this codebase, so the cache moves HERE,
// to the data layer, which is where it belonged anyway — a route being
// dynamic and its data being cacheable are independent facts. Tagged
// separately from getAllTradesForAggregate's cache below so either can be
// revalidated on its own (`revalidateTag('fleet-bots')`) without invalidating
// the other's still-fresh data.
export const getAllBotsWithStats = unstable_cache(
  getAllBotsWithStatsUncached,
  ['fleet-bots'],
  { revalidate: 1800, tags: ['fleet-bots'] },
)

// Lifted from the old /performance page (folded into /overview 2026-07-31, see
// next.config.ts redirects). Feeds computeFleetAggregate() for stage 0 of « La
// flotte » — the unfilterable balance sheet.
async function getAllTradesForAggregateUncached(): Promise<AggregateTradeRow[]> {
  // Supabase caps a single request at 1000 rows — page through every closed trade,
  // otherwise the "P&L total" silently reflects only the 1000 most recent trades.
  const [trades, botsRes] = await Promise.all([
    paginateAll<AggregateTradeRow>(async (from, to) => {
      const { data, error } = await supabase
        .from('trades')
        .select('pnl,side,closed_at,bot_id,asset')
        .not('closed_at', 'is', null)
        .order('closed_at', { ascending: false })
        .range(from, to)
      // Fail loud: swallowing the error made paginateAll stop early on a short page,
      // publishing a truncated P&L total as fact.
      if (error) throw new Error(`/overview trades fetch failed: ${error.message}`)
      return (data ?? []) as AggregateTradeRow[]
    }),
    supabase.from('bots').select('id,status'),
  ])

  // A failed bots fetch would leave archived trades uncounted — fail loud instead.
  if (botsRes.error) throw new Error(`/overview bots fetch failed: ${botsRes.error.message}`)

  // Archived bots stay listed on /strategies but are excluded from every
  // aggregate: drop their trades from the P&L totals.
  const archivedIds = new Set(
    ((botsRes.data ?? []) as { id: string; status: string }[])
      .filter(b => b.status === 'archived')
      .map(b => b.id),
  )
  return trades.filter(t => !archivedIds.has(t.bot_id))
}

// FIX round 3 (Finding B): same reasoning as getAllBotsWithStats above — this
// is a full paginated scan of the trades table, and needs its own 30-minute
// cache now that the route itself is dynamic. Kept pure
// (getAllTradesForAggregateUncached) with the cache applied at the boundary,
// so the underlying logic stays trivially unit-testable without touching
// Next's cache runtime.
export const getAllTradesForAggregate = unstable_cache(
  getAllTradesForAggregateUncached,
  ['fleet-trades'],
  { revalidate: 1800, tags: ['fleet-trades'] },
)

// Live cohort = real money (v1-spot, orb-bf25). Passed down so the P&L headline
// can separate real from laboratoire (simulation) instead of fusing them into
// one total. Mirrors the cohort split in splitCohorts()/cohort.ts.
export async function getLiveBotIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('bots')
    .select('id')
    .eq('status', 'live')
  if (error) throw new Error(`/overview live bots fetch failed: ${error.message}`)
  return (data ?? []).map(b => b.id)
}

// FIX (final review, I1+I2): restored. The fleet-wide recent-trades feed
// (« 20 derniers trades — tous bots ») lived inline in the retired /overview
// page and disappeared with OverviewClient — it existed on no page at all
// afterwards. It is back, in the data layer this time, feeding stage 0 of « La
// flotte » where it belongs: page-level, unfiltered, cohort-safe.
//
// Uses the same public `supabase` client as every other query in this module,
// NOT supabaseServer as the old inline version did: MiRegimeBadge ('use
// client') imports from this file, so pulling supabase-server in here would
// drag server-only env into the browser bundle. Trades are public-readable and
// getAllTradesForAggregate already reads them through the public client.
export async function getRecentTrades(limit = 20): Promise<TradeWithBot[]> {
  // Carry bots (grid, funding harvest) micro-rotate dozens of times a day and
  // archived bots are dead: both would flood the global feed. Fetch a wider
  // window, filter, then keep the newest `limit`.
  const { data, error } = await supabase
    .from('trades')
    .select('id,opened_at,closed_at,asset,side,pnl,reason,bots(name,slug,family,status)')
    .not('closed_at', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(limit * 5)
  // Degrade to an empty feed rather than taking the whole page down: unlike the
  // aggregate (where a partial fetch would publish a WRONG total), an absent
  // feed states nothing false. Note what an empty return actually does on the
  // page — FleetRecentTrades returns null on an empty list, so the section
  // DISAPPEARS entirely, it does not render with fewer rows. That is the
  // intended failure mode: no table at all is honest, a table headed « les 0
  // derniers trades » is not.
  if (error) {
    console.error('[getRecentTrades]', error.message)
    return []
  }
  return ((data ?? []) as unknown as TradeWithBot[])
    .filter(t => !isCarryFamily(t.bots?.family) && t.bots?.status !== 'archived')
    .slice(0, limit)
}

export async function getWealthCalls(): Promise<WealthCall[]> {
  const { data, error } = await supabase
    .from('wealth_calls')
    .select('*')
    .order('executed_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAssetPrices(): Promise<AssetPrice[]> {
  const { data, error } = await supabase
    .from('asset_prices')
    .select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getLatestMacroReport(): Promise<{
  date: string
  content: string
  score: number | null
  regime: string | null
  generated_at: string
} | null> {
  const { data, error } = await supabase
    .from('macro_reports')
    .select('date, content, score, regime, generated_at')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

export async function getLatestMiSnapshot(): Promise<MiSnapshot | null> {
  const { data, error } = await supabase
    .from('mi_snapshots')
    .select('*')
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

export async function getMiHistory(days = 7): Promise<MiSnapshot[]> {
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString()
  const { data, error } = await supabase
    .from('mi_snapshots')
    .select('snapshot_at,composite_score,regime,sentiment_regime,sentiment_score,derivatives_score,news_score,macro_score,institutional_score,market_bias,trend_regime,btc_vs_ema200_pct')
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: true })
  if (error) return []
  return (data ?? []) as unknown as MiSnapshot[]
}

export async function getTriggerData(slug: string): Promise<TriggerData | null> {
  const { data: bot, error: botErr } = await supabase
    .from('bots')
    .select('id, status')
    .eq('slug', slug)
    .single()
  if (botErr || !bot) return null

  // Count the SAME trade set as getBotWithStats/BotCard: all rows for this bot_id,
  // regardless of is_paper. For v1-spot every row is is_paper=true (the bot runs a
  // paper-mirror ledger as its official public track record since real position
  // sizes are too small to be meaningful) — filtering on is_paper=false here
  // silently zeroed out the counter while the fiche showed 13 trades / PF 2.00.
  // Page through the full trade set (1000-row cap) so PF/total match getBotWithStats.
  let all: { pnl: number }[]
  try {
    all = await paginateAll<{ pnl: number }>(async (from, to) => {
      const { data, error } = await supabase
        .from('trades')
        .select('pnl')
        .eq('bot_id', bot.id)
        .order('closed_at', { ascending: false })
        .range(from, to)
      if (error) throw new Error(error.message)
      return (data ?? []) as { pnl: number }[]
    })
  } catch {
    return null
  }
  if (all.length === 0) return { profitFactor: 0, totalTrades: 0, isLive: bot.status === 'live' }

  const grossProfit = all.filter((t: { pnl: number }) => t.pnl > 0).reduce((s: number, t: { pnl: number }) => s + t.pnl, 0)
  const grossLoss   = Math.abs(all.filter((t: { pnl: number }) => t.pnl < 0).reduce((s: number, t: { pnl: number }) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  return { profitFactor, totalTrades: all.length, isLive: bot.status === 'live' }
}

const CHANGELOG_COLS =
  'id,created_at,scope_type,bot_slug,applies_to,entry_date,category,summary,detail,session_ref'

export async function getChangelogForBot(bot: Bot): Promise<BotChangelog[]> {
  // bot.slug is a trusted DB value (from the bots table, kebab/snake-case alnum),
  // never a raw route param — safe to interpolate into the PostgREST .or() filter.
  try {
    const { data, error } = await supabase
      .from('bot_changelogs')
      .select(CHANGELOG_COLS)
      .or(`and(scope_type.eq.bot,bot_slug.eq.${bot.slug}),scope_type.eq.fleet`)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      console.error('[getChangelogForBot]', error.message)
      return []
    }
    const rows = (data ?? []) as BotChangelog[]
    return rows.filter(r => r.scope_type === 'bot' || fleetEntryAppliesTo(r, bot))
  } catch (e) {
    // build-time network error (Supabase unreachable) — degrade gracefully
    console.error('[getChangelogForBot] fetch threw', e)
    return []
  }
}

export async function getJournalEntries(scope?: ScopeType): Promise<BotChangelog[]> {
  try {
    let q = supabase
      .from('bot_changelogs')
      .select(CHANGELOG_COLS)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)
    if (scope) q = q.eq('scope_type', scope)
    const { data, error } = await q
    if (error) {
      console.error('[getJournalEntries]', error.message)
      return []
    }
    return (data ?? []) as BotChangelog[]
  } catch (e) {
    console.error('[getJournalEntries] fetch threw', e)
    return []
  }
}

export async function getLatestPerScope(): Promise<Record<ScopeType, BotChangelog | null>> {
  const all = await getJournalEntries()
  const out: Record<ScopeType, BotChangelog | null> =
    { bot: null, fleet: null, mi: null, wealth: null }
  for (const e of all) {
    if (out[e.scope_type] === null) out[e.scope_type] = e
  }
  return out
}

export async function getComponentChangelog(
  scope: 'mi' | 'wealth', limit = 5,
): Promise<BotChangelog[]> {
  try {
    const { data, error } = await supabase
      .from('bot_changelogs')
      .select(CHANGELOG_COLS)
      .eq('scope_type', scope)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('[getComponentChangelog]', error.message)
      return []
    }
    return (data ?? []) as BotChangelog[]
  } catch (e) {
    console.error('[getComponentChangelog] fetch threw', e)
    return []
  }
}
