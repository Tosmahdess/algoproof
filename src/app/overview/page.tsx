import type { Metadata } from 'next'
import { getAllBotsWithStats } from '@/lib/queries'
import { supabaseServer } from '@/lib/supabase-server'
import OverviewClient from '@/components/OverviewClient'
import type { TradeWithBot } from '@/lib/types'

export const revalidate = 1800

export const metadata: Metadata = {
  title: "Vue d'ensemble — AlgoProof",
  description: "Tableau de bord complet : régime MI, tous les bots classés par performance, courbe globale et trades récents.",
}

async function getRecentTrades(limit = 20): Promise<TradeWithBot[]> {
  const { data } = await supabaseServer
    .from('trades')
    .select('id,opened_at,closed_at,asset,side,pnl,reason,bots(name,slug,family)')
    .order('closed_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as TradeWithBot[]
}

export default async function OverviewPage() {
  const [bots, recentTrades] = await Promise.all([
    getAllBotsWithStats(),
    getRecentTrades(20),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-muted mt-1">
            Dashboard complet — données synchronisées depuis le VPS toutes les heures.
          </p>
        </div>
        <div className="text-right text-xs text-muted font-mono">
          <p>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="opacity-60">ISR 1h</p>
        </div>
      </div>
      <OverviewClient bots={bots} recentTrades={recentTrades} />
    </div>
  )
}
