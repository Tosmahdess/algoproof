import type { Metadata } from 'next'
import { getAllBotsWithStats, getTriggerData } from '@/lib/queries'
import StrategiesClient from '@/components/StrategiesClient'
import FaqAccordion from '@/components/FaqAccordion'
import TriggerCounter from '@/components/TriggerCounter'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Stratégies',
  description: '33 expériences de trading algo en cours — résultats en temps réel, chaque trade publié. Tendance, cassure, multi-signaux, multi-actifs.',
  openGraph: { url: 'https://algoproof.fr/strategies' },
}

const FAQ_ITEMS = [
  {
    question: 'Puis-je utiliser ces bots depuis la France ?',
    answer: "Les bots fonctionnant sur Binance Futures ne sont pas accessibles aux résidents français depuis 2023 (restriction AMF). En revanche, Bybit Futures et Hyperliquid sont disponibles et offrent les mêmes actifs. Consultez notre guide pour démarrer.",
  },
]

export default async function StrategiesPage() {
  const bots = await getAllBotsWithStats()
  const trigger = await getTriggerData('v1-spot')
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-12">
      {trigger && (
        <div className="mb-8 max-w-md">
          <TriggerCounter data={trigger} />
          <p className="text-xs text-muted mt-2">
            Je ne vends rien tant que ces deux critères ne sont pas atteints en argent réel. C&apos;est public et vérifiable.
          </p>
        </div>
      )}
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
