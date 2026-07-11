import type { Metadata } from 'next'
import { getAllBotsWithStats } from '@/lib/queries'
import StrategiesClient from '@/components/StrategiesClient'
import FaqAccordion from '@/components/FaqAccordion'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Mes bots de trading en direct — stratégies et résultats',
  description: 'Mes expériences de trading algo en cours — résultats en temps réel, chaque trade publié. Tendance, cassure, multi-signaux, multi-actifs.',
  openGraph: { url: 'https://algoproof.fr/strategies' },
}

const FAQ_ITEMS = [
  {
    question: 'Puis-je utiliser ces bots depuis la France ?',
    answer: "Les bots fonctionnant sur Binance Futures ne sont pas accessibles aux résidents français depuis 2023 (restriction AMF). En revanche, Bybit Futures et Hyperliquid sont disponibles et offrent les mêmes actifs. Consulte mon guide pour démarrer.",
  },
]

export default async function StrategiesPage() {
  const bots = await getAllBotsWithStats()
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-12">
      <StrategiesClient bots={bots} />
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">
          Questions fréquentes
        </h2>
        <FaqAccordion items={FAQ_ITEMS} />
        <p className="mt-3 text-xs text-muted">
          Voir le <a href="/start" className="text-positive hover:underline">guide complet →</a>
        </p>
      </section>
    </main>
  )
}
