import type { Metadata } from 'next'
import { getAllBotsWithStats, getAllTradesForAggregate, getLiveBotIds } from '@/lib/queries'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import FleetOverview from '@/components/FleetOverview'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'

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
      {/* Restored (fix round 1, I7) from the pre-merge /overview page — this
          FAQ schema and the "Comment lire" explainer were dropped when the
          page was rewritten to feed FleetOverview and never replaced. */}
      <JsonLd data={faqJsonLd([
        { question: 'Les résultats sont-ils réels ?', answer: 'Oui. Les bots tournent en continu et chaque trade est enregistré automatiquement, gains comme pertes. Les chiffres sont mis à jour toutes les heures.' },
        { question: 'Qu\'est-ce que le profit factor ?', answer: 'C\'est le rapport entre l\'argent gagné et l\'argent perdu. Un PF de 1,3 signifie 1,30 € gagné pour 1 € perdu.' },
        { question: 'Le trading est-il en argent réel ?', answer: 'La plupart des bots sont en paper trading (simulation fidèle). Les bots en argent réel sont indiqués comme « live ».' },
      ])} />
      <h1 className="text-2xl font-bold tracking-tight mb-2">La flotte</h1>
      <p className="text-sm text-muted max-w-2xl mb-8">
        Ce qui tourne en ce moment, avec quel argent, et ce que ça donne au total.
        Comment lire : le <a href="/lexique#profit-factor" className="text-accent">profit factor</a> mesure
        les gains divisés par les pertes (au-dessus de 1, la stratégie gagne), le{' '}
        <a href="/lexique#win-rate" className="text-accent">win rate</a> le % de trades gagnants, le{' '}
        <a href="/lexique#drawdown" className="text-accent">drawdown</a> la pire baisse. Plus de définitions
        dans le <a href="/lexique" className="text-accent">lexique</a>.
      </p>
      <FleetOverview bots={bots} aggregate={aggregate} />
    </main>
  )
}
