import type { Metadata } from 'next'
import { getAllBotsWithStats } from '@/lib/queries'
import StrategiesClient from '@/components/StrategiesClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Stratégies',
  description: '33 expériences de trading algo en cours — résultats en temps réel, chaque trade publié. Tendance, cassure, multi-signaux, multi-actifs.',
  openGraph: { url: 'https://algoproof.fr/strategies' },
}

export default async function StrategiesPage() {
  const bots = await getAllBotsWithStats()
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <StrategiesClient bots={bots} />
    </main>
  )
}
