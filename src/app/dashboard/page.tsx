// src/app/dashboard/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import MetricsRow from '@/components/MetricsRow'
import { getAllBotsWithStats } from '@/lib/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Live overview of all AlgoProof bots — status, PnL, and recent trades.',
}

export default async function DashboardPage() {
  const bots = await getAllBotsWithStats()
  const totalTrades = bots.reduce((s, b) => s + b.stats.total_trades, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">Dashboard</h1>
        <p className="text-muted">
          All bots at a glance. Updated hourly.{' '}
          <span className="text-xs">{totalTrades} total trades recorded.</span>
        </p>
      </div>

      <div className="space-y-8">
        {bots.map(bot => {
          const pnlPct = ((bot.stats.latest_capital - 1000) / 1000) * 100
          return (
            <div key={bot.id} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/strategies/${bot.slug}`} className="font-semibold hover:text-positive transition-colors">
                      {bot.name}
                    </Link>
                    <StatusBadge status={bot.status} />
                  </div>
                  <p className="text-xs text-muted">{bot.exchange} · {bot.assets.join(', ')}</p>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-mono font-bold ${pnlPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted">since inception · €{bot.stats.latest_capital.toFixed(0)}</div>
                </div>
              </div>
              <MetricsRow stats={bot.stats} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
