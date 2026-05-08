import type { Metadata } from 'next'
import { getAllBotsWithStats, getTriggerData } from '@/lib/queries'
import StrategiesClient from '@/components/StrategiesClient'
import TriggerCounter from '@/components/TriggerCounter'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Stratégies',
  description: '33 expériences de trading algo en cours — résultats en temps réel, chaque trade publié. Tendance, cassure, multi-signaux, multi-actifs.',
  openGraph: { url: 'https://algoproof.fr/strategies' },
}

export default async function StrategiesPage() {
  const [bots, triggerData] = await Promise.all([
    getAllBotsWithStats(),
    getTriggerData('v1-spot'),
  ])
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {triggerData && (
        <div className="max-w-md mb-10">
          <p className="text-xs text-muted uppercase tracking-widest mb-3">
            Ouverture des ventes — critères en cours
          </p>
          <TriggerCounter data={triggerData} />
        </div>
      )}
      <StrategiesClient bots={bots} />
    </main>
  )
}
