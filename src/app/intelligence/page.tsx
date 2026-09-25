import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import { compileMDX } from 'next-mdx-remote/rsc'
import ExplainerBox from '@/components/ExplainerBox'
import JsonLd from '@/components/JsonLd'
import Repli from '@/components/Repli'
import { faqJsonLd } from '@/lib/jsonld'
import MiRegimeBadge from '@/components/MiRegimeBadge'
import MiHistoryChart from '@/components/MiHistoryChart'
import MiPillarsSection from '@/components/MiPillarsSection'
import { MiFleetImpactSection } from '@/components/MiFleetImpact'
import { getLatestMacroReport, getMiHistory, getComponentChangelog } from '@/lib/queries'
import { getFleetImpact } from '@/lib/mi-fleet-impact'
import { withFrenchRegimes, withoutRecommendation } from '@/lib/macro-report'
import { mediumDate } from '@/lib/format-date'

export const metadata: Metadata = {
  title: 'Météo du marché : calme, tendu ou stress, chaque jour',
  description: 'Chaque jour, l\'état du marché en un mot, calme, tendu ou stress, à partir du sentiment, des dérivés, des actualités et de la macro. Et la mesure de ce que ça change vraiment pour mes bots.',
  openGraph: { url: 'https://algoproof.fr/intelligence' },
}

// Same 4-way categorical palette as MiRegimeBadge.PILLARS — see its comment
// (sentiment=severe, news=positive, derivatives/macro both map to accent).
const PILLARS = [
  {
    id: 'sentiment',
    label: 'Sentiment',
    weight: '30%',
    color: 'var(--severe)',
    functional:
      "Suit la peur et la cupidité du marché en temps réel. Quand les traders sont dans la peur extrême, c'est souvent un signal d'alarme. Quand ils sont euphoriques, le risque augmente. Ce pilier mesure l'état émotionnel de la foule.",
    technical:
      'Indice Fear & Greed (0 à 100), normalisé sur [−100, +100]. Actualisé toutes les 30 min. Produit l\'état du sentiment : peur extrême, peur, neutre, avidité, avidité extrême.',
  },
  {
    id: 'derivatives',
    label: 'Produits dérivés',
    weight: '40%',
    color: 'var(--accent)',
    functional:
      'Surveille le marché des futures crypto en temps réel. Les taux de financement, l\'open interest et les liquidations révèlent quand l\'effet de levier est dangereusement élevé, précurseur classique des corrections violentes.',
    technical:
      'Binance Futures : taux de financement (8h) × 40% + ratio Long/Short contrariant × 35% + delta OI × 25%. Flux WebSocket liquidations (60s) : ajustements ±20 pts si >10M$/h. Symboles : BTC/ETH/SOL.',
  },
  {
    id: 'news',
    label: 'Actualités',
    weight: '5%',
    color: 'var(--positive)',
    functional:
      "Analyse les titres financiers en continu. Un événement négatif majeur (hack d'exchange, répression réglementaire, choc macro) peut bouger les marchés plus vite que n'importe quel indicateur. Je surveille les news pour que les bots n'entrent pas dans la tempête.",
    technical:
      'Flux RSS : 3 sources crypto (CoinDesk, Decrypt, Cointelegraph) + 4 géopolitiques (Reuters, BBC, NYT, Al Jazeera). Scoring mots-clés ±15 pts/titre, décroissance exponentielle τ=2h. >20 000 titres archivés.',
  },
  {
    id: 'macro',
    label: 'Macro',
    weight: '25%',
    color: 'var(--accent)',
    functional:
      "Surveille les conditions macroéconomiques : volatilité des marchés actions (VIX), force du dollar américain (DXY), et événements à venir comme les décisions de la Fed ou le CPI. La crypto n'existe pas en vase clos.",
    technical:
      'Base : VIX + DXY 5j. Ajustements MI-8→MI-11 : VIX term structure · credit spreads HYG/IEI · Put/Call SPY · insider buying SEC Form 4 · earnings beat · analyst revisions · short interest · options flow SPY+QQQ. Calendrier d\'événements suivi à titre informatif : les fenêtres de blocage pré-événement ont été retirées le 23/07/2026 (contre-productives sur un replay de 2 ans).',
  },
  // The 'institutional' pillar (DVOL/ETF flows) had its scoring retired server-side on
  // 2026-06-26 — institutional_score is always null since. Removed from display.
]

export const revalidate = 1800

// Lot 7 of the design audit (spec 5.4, 2026-09-25). The substance of the weather is
// FROZEN (arbitration of 2026-09-17: no computation, no pillar label, no weight
// changes here). Only the order of the blocks and their dressing move: the regime
// first, then the measurement that does not flatter it, then the history, then the
// method folded, then the generated report folded and labelled as such.
export default async function IntelligencePage() {
  // getFleetImpact() is deliberately NOT wrapped in unstable_cache the way src/lib/queries.ts
  // wraps its readers: freshness on this page is already governed by the route segment's
  // `revalidate = 1800` above, so the query runs at most once per half hour anyway, and the
  // source row only moves once a week. A second cache layer would buy nothing and add one
  // more place where a withdrawn figure could survive its withdrawal.
  const [report, miHistory, miChangelogs, fleetImpact] = await Promise.all([
    getLatestMacroReport(),
    getMiHistory(7),
    getComponentChangelog('mi'),
    getFleetImpact(),
  ])

  let reportContent: React.ReactElement | null = null
  if (report?.content) {
    try {
      const { content } = await compileMDX({
        // The generated report ends with a « Biais recommandé » section: a
        // recommendation, on a site that gives none (audit 2026-09-25, P0-1).
        // Stripped here, at render time, whatever the generator writes.
        // Its regime enums (« Régime : NEUTRAL ») become the site's French words.
        source: withFrenchRegimes(withoutRecommendation(report.content)),
        // The generated report carries its own h1 title: demote it so the page
        // keeps a single h1 (it was rendering 3, near-duplicated back to back).
        // h3, since the report now lives under the h2 of its fold.
        components: {
          h1: (props: React.ComponentProps<'h3'>) => <h3 className="text-lg font-semibold mt-6 mb-2" {...props} />,
        },
      })
      reportContent = content
    } catch {
      reportContent = null
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12">
      <JsonLd data={faqJsonLd([
        { question: 'C\'est quoi un régime de marché ?', answer: 'Une lecture d\'ensemble de l\'humeur du marché (calme, tendu ou en stress) calculée à partir de plusieurs signaux agrégés.' },
        { question: 'À quelle fréquence est-ce mis à jour ?', answer: 'Le rapport macro est régénéré chaque jour, et les signaux live plusieurs fois par heure.' },
        { question: 'Ça sert à quoi ?', answer: 'À savoir quand le contexte est porteur ou risqué, pour les bots comme pour les décisions d\'investissement.' },
      ])} />

      {/* First screen: the state, its score, its freshness, and what it changes for the
          bots today. No prose before the first figure. */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Météo du marché
        </h1>
        <MiRegimeBadge />
      </div>

      {/* The three paragraphs that used to open the page (139 words before the first
          figure on a computer, 98 on a phone), folded. */}
      <Repli
        id="ce-que-fait-la-meteo"
        titre="Ce que la météo fait, et ne fait pas"
        toujoursPliable
        titreClassName="text-base font-semibold"
        corpsClassName="mt-3 space-y-3 text-sm leading-relaxed max-w-2xl"
      >
        <p>
          Chaque jour, je résume l&apos;état du marché en un mot, calme, tendu ou stress, à partir de quatre piliers : sentiment, dérivés, actualités et macro. Les termes sont expliqués dans le <a href="/lexique" className={linkClass('inline')}>lexique</a>.
        </p>
        <p>
          Chaque bot passe par cette couche avant d&apos;entrer en position. Elle réduit la taille quand le contexte se dégrade, et coupe les entrées quand il devient franchement mauvais. Le blocage total, lui, est une sécurité de dernier recours et pas le régime de tous les jours.
        </p>
        <p>
          Ce qu&apos;elle a réellement changé sur mes bots, et ce qu&apos;elle n&apos;a pas changé, est mesuré juste en dessous, et remesuré chaque semaine.
        </p>
      </Repli>

      {/* Does it work? Second block: the measurement that does not flatter the machinery,
          control included. It is the most honest content of the page, so it moves up. */}
      <MiFleetImpactSection impact={fleetImpact} />

      {/* Historical scores — 7 days */}
      <section>
        <div className="flex items-baseline gap-3 mb-4 flex-wrap">
          <h2 className="text-xl font-semibold">Historique des scores</h2>
          <span className="text-xs text-muted">7 derniers jours · synchronisation toutes les 30 min</span>
        </div>
        <div className="rounded border border-border bg-card px-6 py-5">
          <MiHistoryChart data={miHistory} />
        </div>
        <p className="text-xs text-muted mt-2">
          Lignes fines = piliers individuels. Ligne blanche = score global composite.
          Lignes à ±30 = seuils de peur et d&apos;avidité.
        </p>
      </section>

      {/* How the score is computed: pillars, shield, terminal link. Folded. */}
      <Repli
        id="calcul"
        titre="Comment ce score est calculé"
        toujoursPliable
        corpsClassName="mt-4 space-y-8"
      >
        <div>
          <h3 className="text-base font-semibold mb-3">Les piliers</h3>
          <MiPillarsSection pillars={PILLARS} changelogs={miChangelogs} />
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">Bouclier défensif</h3>
          <ExplainerBox stacked
            functional={
              <p>
                Le bouclier défensif est un filet de protection à cinq couches autour de chaque bot. Chaque couche peut arrêter le trading indépendamment en cas de danger : une couche défaillante ne fait pas tomber le système. Même si le service MI est hors ligne, les bots basculent sur des valeurs prudentes par défaut.
              </p>
            }
            technical={
              <div className="space-y-1 text-sm">
                <div className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-1">
                  <span className="font-semibold">Layer 1</span>
                  <span className="text-muted">Taille de position, ajustée selon le score MI</span>
                  <span className="font-semibold">Layer 2</span>
                  <span className="text-muted">is_safe_to_trade() : verrou strict, toutes les conditions doivent être remplies</span>
                  <span className="font-semibold">Layer 3</span>
                  <span className="text-muted">VIX &gt; 30 : arrêt complet inconditionnel</span>
                  <span className="font-semibold">Layer 4</span>
                  <span className="text-muted">Blackouts événements : retirés le 23/07/2026 (un replay de 2 ans a montré qu'ils coûtaient du P&L sans réduire le drawdown)</span>
                  <span className="font-semibold">Layer 5</span>
                  <span className="text-muted">Tableau de bord du marché : données périmées, entrées bloquées par défaut</span>
                </div>
                <p className="pt-2 text-xs text-muted">
                  Plage de score : [−100, +100]. Pondérations : Sentiment 30% · Dérivés 40% · Actualités 5% · Macro 25% (re-pondération du 4 juillet 2026).
                  Condition : composite &gt; −30 ET VIX ≤ 30 (les fenêtres pré-événement T1/T2 ont été retirées le 23/07/2026).
                </p>
              </div>
            }
          />
        </div>

        <p className="text-xs text-muted">
          Tu peux suivre chaque signal accepté ou rejeté, en direct.{' '}
          <a href="https://lab.algoproof.fr/terminal" target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>
            Voir le terminal →
          </a>
        </p>
      </Repli>

      {/* The generated daily report: folded, closed, and labelled for what it is. */}
      <Repli
        id="rapport"
        titre="Rapport généré du jour"
        resume={report ? `${mediumDate(report.date)} · généré par un modèle, sans relecture` : 'généré par un modèle, sans relecture'}
        toujoursPliable
        corpsClassName="mt-4"
      >
        {reportContent ? (
          <div className="rounded border border-border bg-card px-6 py-5 prose prose-sm prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-sm prose-h2:font-medium prose-h2:text-muted prose-h2:mt-6 prose-h3:text-lg
            prose-p:text-sm prose-p:text-foreground prose-p:leading-relaxed
            prose-strong:text-foreground prose-blockquote:border-border prose-blockquote:text-muted prose-blockquote:text-xs">
            {reportContent}
          </div>
        ) : (
          <div className="rounded border border-dashed border-border px-6 py-8 text-center">
            <p className="text-xs text-muted">Rapport non disponible : généré chaque jour à 9h UTC.</p>
          </div>
        )}
      </Repli>

      {/* CTA: test météo on own strategy */}
      <section>
        <a href="https://lab.algoproof.fr/lab" className={linkClass('card', 'p-8 bg-card/40 text-center')}>
          <h2 className="text-xl font-semibold mb-3 group-hover:text-accent transition-colors">Teste la météo sur ta stratégie</h2>
          <p className="text-sm max-w-2xl mx-auto">
            Le labo rejoue mes règles réelles sur ton backtest, avec et sans la météo.
          </p>
          <span className="inline-block mt-4 text-sm text-muted group-hover:text-foreground">Ouvrir le labo →</span>
        </a>
      </section>
    </main>
  )
}
