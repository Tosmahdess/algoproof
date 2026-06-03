import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllFiches } from '@/lib/equity'
import AnalysesClient from '@/components/AnalysesClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Mes analyses DCA — toutes les sociétés | AlgoProof',
  description:
    "Toutes mes analyses d'investissement DCA : fondamentaux, valorisation, momentum, risques et verdict (renforcer / maintenir / passer), société par société.",
}

export default async function AnalysesPage() {
  const fiches = await getAllFiches()
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/wealth" className="text-sm text-muted hover:text-foreground transition-colors">← Patrimoine</Link>
      <h1 className="text-3xl font-bold mt-6 mb-2">Mes analyses</h1>
      <p className="text-muted text-sm mb-8">
        {fiches.length} sociétés analysées — mon opinion DCA, pas un conseil. Classées par secteur.
      </p>
      <AnalysesClient fiches={fiches} />
    </main>
  )
}
