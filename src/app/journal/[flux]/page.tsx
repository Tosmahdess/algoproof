import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getJournalEntries } from '@/lib/queries'
import JournalClient from '@/components/JournalClient'
import type { ScopeType } from '@/lib/types'

export const revalidate = 3600

const FLUX_MAP: Record<string, { scope: ScopeType; title: string; intro: string }> = {
  flotte:       { scope: 'fleet',  title: 'Journal — Flotte',        intro: "Les changements appliqués à l'ensemble des stratégies." },
  intelligence: { scope: 'mi',     title: 'Journal — Intelligence',  intro: 'Les évolutions du moteur de Market Intelligence.' },
  patrimoine:   { scope: 'wealth', title: 'Journal — Patrimoine',    intro: 'Les changements de la watchlist GROWTH et de la logique DCA.' },
}

export function generateStaticParams() {
  return Object.keys(FLUX_MAP).map(flux => ({ flux }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ flux: string }> },
): Promise<Metadata> {
  const { flux } = await params
  const cfg = FLUX_MAP[flux]
  if (!cfg) return {}
  return { title: `${cfg.title} | AlgoProof`, description: cfg.intro }
}

export default async function FluxJournalPage(
  { params }: { params: Promise<{ flux: string }> },
) {
  const { flux } = await params
  const cfg = FLUX_MAP[flux]
  if (!cfg) notFound()
  const entries = await getJournalEntries(cfg.scope)
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{cfg.title}</h1>
      <p className="text-muted mb-8 text-sm">{cfg.intro}</p>
      <JournalClient entries={entries} />
    </main>
  )
}
