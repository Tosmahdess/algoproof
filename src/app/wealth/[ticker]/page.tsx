import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLatestFiche, getGrowthRow, getFichesByCategory } from '@/lib/equity'
import { EquityFichePanel } from '@/components/EquityFichePanel'
import { sanitizeProse } from '@/lib/prose'
import { categoryLabel } from '@/lib/fiche-categories'

export const runtime = 'nodejs'
export const revalidate = 3600

const SECTIONS: { title: string; key: 'fondamentaux' | 'valorisation' | 'momentum' | 'risques' }[] = [
  { title: 'Fondamentaux', key: 'fondamentaux' },
  { title: 'Valorisation', key: 'valorisation' },
  { title: 'Momentum', key: 'momentum' },
  { title: 'Risques', key: 'risques' },
]

export default async function FichePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const fiche = await getLatestFiche(decodeURIComponent(ticker))
  if (!fiche) notFound()
  const market = await getGrowthRow(fiche.ticker)
  const related = fiche.category ? await getFichesByCategory(fiche.category, fiche.ticker, 3) : []
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${fiche.asset_name} — mon analyse DCA`,
    inLanguage: 'fr',
    datePublished: fiche.generated_at,
    author: { '@type': 'Organization', name: 'AlgoProof' },
    about: { '@type': 'Corporation', name: fiche.asset_name, tickerSymbol: fiche.ticker },
  }
  const cat = fiche.category ? categoryLabel(fiche.category) : ''
  const date = new Date(fiche.generated_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex gap-4 text-sm">
        <Link href="/wealth" className="text-muted hover:text-foreground transition-colors">← Patrimoine</Link>
        <Link href="/wealth/analyses" className="text-muted hover:text-foreground transition-colors">Toutes mes analyses</Link>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted mt-6 mb-6">
        {cat && (
          <span className="px-2 py-0.5 rounded border border-border text-[10px] font-semibold uppercase tracking-wider">
            {cat}
          </span>
        )}
        <time>Mon analyse du {date}</time>
      </div>

      <h1 className="text-3xl font-bold mb-8">
        {fiche.asset_name}{' '}
        <span className="font-mono text-muted text-2xl">{fiche.ticker}</span>
      </h1>

      <EquityFichePanel fiche={fiche} market={market} />

      <div className="prose prose-invert prose-base max-w-none mt-10 prose-headings:font-semibold prose-p:text-foreground/70 prose-p:leading-relaxed prose-strong:text-foreground/90">
        {SECTIONS.map(({ title, key }) => (
          <section key={key}>
            <h2>{title}</h2>
            <p>{sanitizeProse(fiche[key])}</p>
          </section>
        ))}
      </div>

      {related.length > 0 && (
        <div className="mt-12 border-t border-border pt-6">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Autres {cat || 'analyses'}</p>
          <div className="flex flex-wrap gap-2">
            {related.map(r => (
              <Link key={r.ticker} href={`/wealth/${encodeURIComponent(r.ticker)}`}
                className="text-sm rounded border border-border px-3 py-1 hover:bg-zinc-900/60 transition-colors">
                <span className="font-mono font-bold">{r.ticker}</span>
                <span className="text-muted ml-2">{r.asset_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-12 text-xs text-muted leading-relaxed">
        Mon analyse du {date}. Le prix de référence ci-dessus est celui du jour de l&apos;analyse (figé) ;
        le cours et sa variation sont en direct. C&apos;est mon opinion, pas un conseil en investissement.
      </p>
    </div>
  )
}
