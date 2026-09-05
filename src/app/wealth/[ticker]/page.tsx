import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getFicheSummary, getFicheFull, getGrowthRow, getFichesByCategory } from '@/lib/equity'
import { getFreeTickers } from '@/lib/free-tier'
import { getEntitlement } from '@/lib/entitlement'
import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { LockedAnalysis } from '@/components/LockedAnalysis'
import { EquityFichePanel } from '@/components/EquityFichePanel'
import { EquityDisclosure } from '@/components/EquityDisclosure'
import { sanitizeProse } from '@/lib/prose'
import { categoryLabel } from '@/lib/fiche-categories'
import { longDate } from '@/lib/format-date'

export const runtime = 'nodejs'
// force-dynamic replaces `revalidate = 3600`: what this page renders now
// depends on who is asking.
export const dynamic = 'force-dynamic'

const SECTIONS: { title: string; key: 'fondamentaux' | 'valorisation' | 'momentum' | 'risques' }[] = [
  { title: 'Fondamentaux', key: 'fondamentaux' },
  { title: 'Valorisation', key: 'valorisation' },
  { title: 'Momentum', key: 'momentum' },
  { title: 'Risques', key: 'risques' },
]

export default async function FichePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const decoded = decodeURIComponent(ticker)

  const [summary, freeTickers, supabase] = await Promise.all([
    getFicheSummary(decoded),
    getFreeTickers(),
    createSupabaseAuthServer(),
  ])
  if (!summary) notFound()

  const entitlement = await getEntitlement(supabase)
  const isFree = freeTickers.includes(summary.ticker)
  const paid = entitlement === 'paid'
  // Two independent gates (spec 17.1): the free five are PARTIAL fiches.
  // Verdict + reason open on the free five OR for a paying member; the four
  // analysis sections open for a paying member only.
  const showVerdict = isFree || paid
  const showProse = paid
  // Fetched only when showProse. A conditional render would still ship the
  // prose in the RSC payload; not fetching it is what actually locks it.
  const full = showProse ? await getFicheFull(summary.ticker) : null

  const fiche = summary
  // The panel never sees the ungated verdict/reason unless showVerdict: a
  // guest on a locked ticker gets a copy with both fields nulled out.
  const panelFiche = showVerdict ? fiche : { ...fiche, verdict: null, verdict_reason: null }
  const market = await getGrowthRow(fiche.ticker)
  const related = fiche.category ? await getFichesByCategory(fiche.category, fiche.ticker, 3) : []
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${fiche.asset_name} : mon analyse DCA`,
    inLanguage: 'fr',
    datePublished: fiche.generated_at,
    author: { '@type': 'Organization', name: 'AlgoProof' },
    about: { '@type': 'Corporation', name: fiche.asset_name, tickerSymbol: fiche.ticker },
  }
  const cat = fiche.category ? categoryLabel(fiche.category) : ''
  const date = longDate(fiche.generated_at)

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex gap-4 text-sm">
        <Link href="/wealth" className="text-muted hover:text-foreground transition-colors">← Patrimoine</Link>
        <Link href="/wealth" className="text-muted hover:text-foreground transition-colors">Toutes mes analyses</Link>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted mt-6 mb-6">
        {cat && (
          <span className="px-2 py-0.5 rounded border border-border text-[10px] font-semibold uppercase tracking-wider">
            {cat}
          </span>
        )}
        <time>Mon analyse du {date}</time>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        {fiche.asset_name}{' '}
        <span className="font-mono text-muted text-2xl">{fiche.ticker}</span>
      </h1>

      <EquityFichePanel fiche={panelFiche} market={market} />

      {full ? (
        <div className="prose prose-invert prose-base max-w-none mt-10 prose-headings:font-semibold prose-p:text-foreground/70 prose-p:leading-relaxed prose-strong:text-foreground/90">
          {SECTIONS.map(({ title, key }) => (
            <section key={key}>
              <h2>{title}</h2>
              <p>{sanitizeProse(full[key])}</p>
            </section>
          ))}
        </div>
      ) : (
        <LockedAnalysis assetName={fiche.asset_name} verdictVisible={showVerdict} />
      )}

      {related.length > 0 && (
        <div className="mt-12 border-t border-border pt-6">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Autres {cat || 'analyses'}</p>
          <div className="flex flex-wrap gap-2">
            {related.map(r => (
              <Link key={r.ticker} href={`/wealth/${encodeURIComponent(r.ticker)}`}
                className="text-sm rounded border border-border px-3 py-1 hover:bg-card/60 transition-colors">
                <span className="font-mono font-bold">{r.ticker}</span>
                <span className="text-muted ml-2">{r.asset_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Deux pieds de page disaient la même chose à huit lignes d'intervalle
          (« mon opinion, pas un conseil ») sans jamais dire qui écrit, à quelle
          heure, ni ce que je détiens. Les trois manquants sont précisément ce que
          Del. Reg. 2016/958 demande d'une recommandation, et un verdict par
          société adossé à un plan de vente en a la forme. Un seul bloc, en bas,
          qui les porte. */}
      <EquityDisclosure generatedAt={fiche.generated_at} />
    </div>
  )
}
