import type { Metadata } from 'next'
import { getJournalEntries } from '@/lib/queries'
import JournalClient from '@/components/JournalClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Journal — tous les changements | AlgoProof',
  description:
    "Le journal des changements d'AlgoProof : flotte de bots, veille de marché, patrimoine. Chaque évolution, datée et catégorisée.",
}

export default async function JournalPage() {
  const entries = await getJournalEntries()
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Journal</h1>
      <p className="text-muted mb-8 text-sm">
        Tout ce qui change sur AlgoProof — flotte, intelligence de marché, patrimoine, bots.
      </p>
      <JournalClient entries={entries} />
    </main>
  )
}
