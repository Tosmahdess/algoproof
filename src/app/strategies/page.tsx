// src/app/strategies/page.tsx
import type { Metadata } from 'next'
import BotCard from '@/components/BotCard'
import StatusBadge from '@/components/StatusBadge'
import { getAllBotsWithStats } from '@/lib/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Strategies',
  description: 'All AlgoProof trading strategies — real performance data, paper and live.',
}

export default async function StrategiesPage() {
  const bots = await getAllBotsWithStats()
  const paper = bots.filter(b => b.status === 'paper')
  const live  = bots.filter(b => b.status === 'live')

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">Strategies</h1>
        <p className="text-muted">
          All bots, all trades. Paper trading data is clearly labeled.
          Live data activates when a strategy completes 2+ months of real trading.
        </p>
      </div>

      {live.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <StatusBadge status="live" /> Live strategies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map(b => <BotCard key={b.id} bot={b} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <StatusBadge status="paper" /> Paper trading
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paper.map(b => <BotCard key={b.id} bot={b} />)}
        </div>
      </section>
    </div>
  )
}
