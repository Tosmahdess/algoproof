import { notFound } from 'next/navigation'
import { getLatestFiche, getGrowthRow } from '@/lib/equity'
import { EquityFichePanel } from '@/components/EquityFichePanel'

export const runtime = 'nodejs'
export const revalidate = 3600

const CATEGORY_LABELS: Record<string, string> = {
  semiconductors: 'Semiconducteurs', tech_platform: 'Tech Platform / Cloud AI',
  tech_us_growth: 'Tech US Growth', luxury_eu: 'Luxe EU', pharma_growth: 'Pharma Croissance',
  pharma_defensive: 'Pharma Défensif', defense_aerospace: 'Défense / Aérospatial',
  energy_oil: 'Énergie Oil & Gas', energy_transition: 'Énergie Transition',
  commodities_metal: 'Métaux & Ressources',
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-6">
      <h2 className="text-accent text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-foreground/80 leading-relaxed">{body}</p>
    </section>
  )
}

export default async function FichePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const fiche = await getLatestFiche(decodeURIComponent(ticker))
  if (!fiche) notFound()
  const market = await getGrowthRow(fiche.ticker)
  const cat = fiche.category ? (CATEGORY_LABELS[fiche.category] ?? fiche.category) : ''
  const date = new Date(fiche.generated_at).toLocaleDateString('fr-FR')

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <a href="/wealth" className="text-sm text-foreground/50 hover:text-foreground/80">← Patrimoine</a>
      <header className="mt-3">
        <h1 className="text-2xl font-bold">{fiche.asset_name} <span className="text-foreground/50">({fiche.ticker})</span></h1>
        <p className="text-sm text-foreground/50">{cat} · analyse du {date}</p>
      </header>
      <div className="mt-5"><EquityFichePanel fiche={fiche} market={market} /></div>
      <Section title="Fondamentaux" body={fiche.fondamentaux} />
      <Section title="Valorisation" body={fiche.valorisation} />
      <Section title="Momentum" body={fiche.momentum} />
      <Section title="Risques" body={fiche.risques} />
      <p className="mt-10 text-xs text-foreground/40">
        Analyse générée automatiquement le {date}, à titre informatif — ce n&apos;est pas un conseil en investissement.
      </p>
    </main>
  )
}
