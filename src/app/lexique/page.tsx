import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { definedTermSetJsonLd } from '@/lib/jsonld'
import { GLOSSARY } from '@/lib/glossary'

export const metadata: Metadata = {
  title: 'Lexique du trading algo — tous les termes en clair',
  description: 'Profit factor, drawdown, walk-forward, DCA, régime de marché… tous les termes que j\'utilise, expliqués simplement, en français.',
}

export default function LexiquePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd data={definedTermSetJsonLd(GLOSSARY)} />
      <h1 className="text-3xl font-bold tracking-tight mb-2">Lexique</h1>
      <p className="text-sm text-muted mb-8 max-w-2xl">
        Tout le vocabulaire que j&apos;utilise sur le site, expliqué simplement. Pas besoin d&apos;être expert pour comprendre ce que je fais.
      </p>
      <dl className="space-y-6">
        {GLOSSARY.map((t) => (
          <div key={t.id} id={t.id} className="scroll-mt-24 border-l-2 border-border pl-4">
            <dt className="font-bold text-base">{t.term}</dt>
            <dd className="text-sm text-muted mt-1 leading-relaxed">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
