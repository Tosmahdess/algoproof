import type { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase-server'
import { PerformanceClient } from '@/components/PerformanceClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Performance — AlgoProof',
  description: 'P&L journalier de la flotte AlgoProof. Filtrez par direction, famille de stratégie et période.',
}

interface TradeRow {
  pnl: number
  side: string
  closed_at: string
  bot_id: string
}

interface BotRow {
  id: string
  slug: string
  name: string
  family: string | null
}

async function getData() {
  const [tradesRes, botsRes] = await Promise.all([
    supabaseServer
      .from('trades')
      .select('pnl,side,closed_at,bot_id')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false }),
    supabaseServer
      .from('bots')
      .select('id,slug,name,family')
      .neq('status', 'frozen'),
  ])

  return {
    trades: (tradesRes.data ?? []) as TradeRow[],
    bots: (botsRes.data ?? []) as BotRow[],
  }
}

export default async function PerformancePage() {
  const { trades, bots } = await getData()

  const botFamilyMap: Record<string, string> = {}
  const botNameMap: Record<string, string> = {}
  for (const b of bots) {
    botFamilyMap[b.id] = b.family ?? 'trend'
    botNameMap[b.id] = b.name ?? b.slug
  }

  return <PerformanceClient trades={trades} botFamilyMap={botFamilyMap} botNameMap={botNameMap} />
}
