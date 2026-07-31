import type { Metadata } from 'next'
import { getAllBotsWithStats, getAllTradesForAggregate, getLiveBotIds } from '@/lib/queries'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import FleetClient from '@/components/FleetClient'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'La flotte — ce qui tourne, avec quel argent',
  description:
    'Tous mes bots de trading : ceux en argent réel, ceux en laboratoire, et le bilan brut sans filtre.',
  openGraph: { url: 'https://algoproof.fr/overview' },
}

export default async function OverviewPage() {
  const [bots, trades, liveBotIds] = await Promise.all([
    getAllBotsWithStats(),
    getAllTradesForAggregate(),
    getLiveBotIds(),
  ])
  const aggregate = computeFleetAggregate(trades, liveBotIds)

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl mb-2">La flotte</h1>
      <p className="text-sm text-muted mb-8">
        Ce qui tourne en ce moment, avec quel argent, et ce que ça donne au total.
      </p>
      <FleetClient bots={bots} aggregate={aggregate} />
    </main>
  )
}
