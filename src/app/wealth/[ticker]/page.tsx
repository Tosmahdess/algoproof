import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLatestFiche, getGrowthRow } from '@/lib/equity'
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
  const cat = fiche.category ? categoryLabel(fiche.category) : ''
  const date = new Date(fiche.generated_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/wealth" className="text-sm text-muted hover:text-foreground transition-colors">
        ← Patrimoine
      </Link>

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

      <p className="mt-12 text-xs text-muted leading-relaxed">
        Mon analyse du {date}. Le prix de référence ci-dessus est celui du jour de l&apos;analyse (figé) ;
        le cours et sa variation sont en direct. C&apos;est mon opinion, pas un conseil en investissement.
      </p>
    </div>
  )
}
