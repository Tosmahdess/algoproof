import type { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase-server'
import { paginateAll } from '@/lib/paginate'
import { PerformanceClient } from '@/components/PerformanceClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Performance des bots — P&L réel, jour par jour',
  description: 'Le P&L journalier de mes bots de trading, filtrable par direction, famille et période. Gains et pertes réels, rien de lissé.',
}

interface TradeRow {
  pnl: number
  side: string
  closed_at: string
  bot_id: string
  asset: string
}

interface BotRow {
  id: string
  slug: string
  name: string
  family: string | null
}

async function getData() {
  // Supabase caps a single request at 1000 rows — page through every closed trade,
  // otherwise the "P&L total" silently reflects only the 1000 most recent trades.
  const [trades, botsRes] = await Promise.all([
    paginateAll<TradeRow>(async (from, to) => {
      const { data, error } = await supabaseServer
        .from('trades')
        .select('pnl,side,closed_at,bot_id,asset')
        .not('closed_at', 'is', null)
        .order('closed_at', { ascending: false })
        .range(from, to)
      // Fail loud: swallowing the error made paginateAll stop early on a short page,
      // publishing a truncated P&L total as fact (mirror the throw pattern in queries.ts).
      if (error) throw new Error(`/performance trades fetch failed: ${error.message}`)
      return (data ?? []) as TradeRow[]
    }),
    supabaseServer
      .from('bots')
      .select('id,slug,name,family,status')
      .neq('status', 'frozen'),
  ])

  // A failed bots fetch would empty liveBotIds → real P&L rendered as +0.00; fail loud instead.
  if (botsRes.error) throw new Error(`/performance bots fetch failed: ${botsRes.error.message}`)

  // Archived bots stay listed on /strategies but are excluded from performance:
  // drop their rows and their trades from the P&L totals.
  const allBots = (botsRes.data ?? []) as (BotRow & { status: string })[]
  const archivedIds = new Set(allBots.filter(b => b.status === 'archived').map(b => b.id))
  const countedBots = allBots.filter(b => b.status !== 'archived')
  // Live cohort = real money (v1-spot, orb-bf25). Passed down so the P&L headline can
  // separate real from laboratoire (simulation) instead of fusing them into one total.
  const liveBotIds = countedBots.filter(b => b.status === 'live').map(b => b.id)

  return {
    trades: trades.filter(t => !archivedIds.has(t.bot_id)),
    bots: countedBots as BotRow[],
    liveBotIds,
  }
}

export default async function PerformancePage() {
  const { trades, bots, liveBotIds } = await getData()

  const botFamilyMap: Record<string, string> = {}
  const botNameMap: Record<string, string> = {}
  for (const b of bots) {
    botFamilyMap[b.id] = b.family ?? 'trend'
    botNameMap[b.id] = b.name ?? b.slug
  }

  return <PerformanceClient trades={trades} botFamilyMap={botFamilyMap} botNameMap={botNameMap} liveBotIds={liveBotIds} />
}
