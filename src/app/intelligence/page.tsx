import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import { compileMDX } from 'next-mdx-remote/rsc'
import JsonLd from '@/components/JsonLd'
import Repli from '@/components/Repli'
import { faqJsonLd } from '@/lib/jsonld'
import MiRegimeBadge from '@/components/MiRegimeBadge'
import MiHistoryChart from '@/components/MiHistoryChart'
import MiPillarsSection from '@/components/MiPillarsSection'
import { MiFleetImpactSection } from '@/components/MiFleetImpact'
import { getLatestMacroReport, getMiHistory, getComponentChangelog } from '@/lib/queries'
import { getFleetImpact } from '@/lib/mi-fleet-impact'
import { withFrenchRegimes, withoutDashes, withoutOwnTitles, withoutRecommendation } from '@/lib/macro-report'
import { mediumDate } from '@/lib/format-date'
import { labUrl } from '@/lib/lab-links'
import { frNumber, NARROW_NBSP } from '@/lib/display'
import { ENTRY_FLOOR, MI_PILLARS, SCORE_MAX, SCORE_MIN, VIX_CEILING, scaleText, signedInt } from '@/lib/mi-pillars'
import PillarsLedger from './PillarsLedger'

export const metadata: Metadata = {
  title: 'Météo du marché : calme, tendu ou stress, chaque jour',
  description: 'Chaque jour, l\'état du marché en un mot, calme, tendu ou stress, à partir du sentiment, des dérivés, des actualités et de la macro. Et la mesure de ce que ça change vraiment pour mes bots.',
  openGraph: { url: 'https://algoproof.fr/intelligence' },
}

export const revalidate = 1800

// Lot 7 of the design audit (spec 5.4, 2026-09-25). The substance of the weather is
// FROZEN (arbitration of 2026-09-17: no computation, no weight changes here). Only the
// order of the blocks and their dressing move.
//
// Refonte « Le registre des décisions », page Météo (2026-10-03): the state of the day in
// ONE framed panel, like the verdict of a bot fiche (regime, what it allows, date); then
// « Est-ce que ça marche ? », the audit's best block, kept prominent; then the seven days
// and the four pillars as a register, each section opened by a rule; then the method and
// the generated report, folded as they were.
const WEIGHTS = MI_PILLARS.map(p => `${p.label} ${frNumber(p.weight, 0)}${NARROW_NBSP}%`).join(', ')

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
  const lastReading = miHistory.length ? miHistory[miHistory.length - 1] : null

  let reportContent: React.ReactElement | null = null
  if (report?.content) {
    try {
      const { content } = await compileMDX({
        // The generated report ends with a « Biais recommandé » section: a
        // recommendation, on a site that gives none (audit 2026-09-25, P0-1).
        // Stripped here, at render time, whatever the generator writes.
        // Its regime enums (« Régime : NEUTRAL ») become the site's French words.
        // Its own titles (« Analyse Macro APEX », twice, with an em dash) repeated the
        // fold's title and date (audit 2026-10): they go, and so do its em dashes.
        source: withoutDashes(withFrenchRegimes(withoutOwnTitles(withoutRecommendation(report.content)))),
        // The report lives under the h2 of its fold: its sections are h3.
        components: {
          h2: (props: React.ComponentProps<'h3'>) => <h3 className="text-lg font-semibold mt-6 mb-2" {...props} />,
          h3: (props: React.ComponentProps<'h4'>) => <h4 className="text-base font-semibold mt-4 mb-2" {...props} />,
        },
      })
      reportContent = content
    } catch {
      reportContent = null
    }
  }

  return (
    <>
      <JsonLd data={faqJsonLd([
        { question: 'C\'est quoi un régime de marché ?', answer: 'Une lecture d\'ensemble de l\'humeur du marché (calme, tendu ou en stress) calculée à partir de plusieurs signaux agrégés.' },
        { question: 'À quelle fréquence est-ce mis à jour ?', answer: 'Le rapport macro est régénéré chaque jour, et les signaux live plusieurs fois par heure.' },
        { question: 'Ça sert à quoi ?', answer: 'À savoir quand le contexte est porteur ou risqué, pour les bots comme pour les décisions d\'investissement.' },
      ])} />

    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 space-y-10">
      {/* First screen: the title, then the state of the day in one panel. No prose
          before the first figure. */}
      <header className="space-y-5">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Météo du marché
        </h1>
        <MiRegimeBadge />
      </header>

      {/* What the weather does and does not do, folded (139 words before the first
          figure, before lot 7). */}
      <Repli
        id="ce-que-fait-la-meteo"
        titre="Ce que la météo fait, et ne fait pas"
        toujoursPliable
        titreClassName="text-base font-semibold"
        corpsClassName="mt-3 space-y-3 max-w-[68ch]"
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

      {/* The seven days: the global score in ink, one pillar at a time beside it. */}
      <section aria-labelledby="sept-jours" className="border-t border-border pt-8 sm:pt-10">
        <h2 id="sept-jours" className="text-2xl font-semibold tracking-tight">Les sept derniers jours</h2>
        <p className="mt-2 mb-5 max-w-[68ch] text-muted">
          {`Le score global, ${scaleText()}, relevé toutes les 30 minutes. Les filets pointillés marquent ${signedInt(ENTRY_FLOOR)} et ${signedInt(-ENTRY_FLOOR)}, les seuils de peur et d’avidité ; sous ${signedInt(ENTRY_FLOOR)}, mes bots n’entrent plus.`}
        </p>
        <MiHistoryChart data={miHistory} />
      </section>

      <PillarsLedger snapshot={lastReading} />

      {/* How the score is computed: pillars, shield, terminal link. Folded. */}
      <Repli
        id="calcul"
        titre="Comment ce score est calculé"
        toujoursPliable
        className="border-t border-border pt-6"
        corpsClassName="mt-4 space-y-8"
      >
        <div>
          <h3 className="text-base font-semibold mb-3">Chaque pilier</h3>
          <MiPillarsSection changelogs={miChangelogs} />
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">Bouclier défensif</h3>
          <p className="max-w-[68ch]">
            Cinq contrôles de sécurité entourent chaque bot. Chacun peut arrêter le trading en cas de danger, même si un autre contrôle tombe en panne. Si ma veille de marché est hors ligne, les bots utilisent des valeurs prudentes par défaut.
          </p>
          <ol className="mt-4 max-w-[72ch] list-decimal space-y-2 pl-5 text-sm">
            <li><span className="font-semibold">Taille.</span>{' '}<span className="text-muted">La taille de position suit le score de la météo.</span></li>
            <li><span className="font-semibold">Vérification.</span>{' '}<span className="text-muted">Avant chaque entrée, toutes les conditions de sécurité doivent être remplies.</span></li>
            <li><span className="font-semibold">Volatilité.</span>{' '}<span className="text-muted">{`Au-dessus de ${VIX_CEILING} sur le VIX, arrêt complet, sans condition.`}</span></li>
            <li><span className="font-semibold">Annonces.</span>{' '}<span className="text-muted">Les blocages avant les annonces économiques ont été retirés le 23/07/2026 : un rejeu sur deux ans a montré qu’ils coûtaient du résultat sans réduire la pire baisse.</span></li>
            <li><span className="font-semibold">Données périmées.</span>{' '}<span className="text-muted">Si le tableau de bord du marché n’est plus à jour, les entrées sont bloquées par défaut.</span></li>
          </ol>
          <p className="mt-4 max-w-[72ch] text-sm text-muted">
            {`Échelle : de ${signedInt(SCORE_MIN)} à ${signedInt(SCORE_MAX)}. Poids : ${WEIGHTS} (repondération du 4 juillet 2026). Les bots entrent quand le score global dépasse ${signedInt(ENTRY_FLOOR)} et que le VIX reste à ${VIX_CEILING} ou moins.`}
          </p>
        </div>

        <p className="text-sm text-muted">
          Tu peux suivre chaque signal accepté ou rejeté, en direct.{' '}
          <a href={labUrl('https://lab.algoproof.fr/terminal', 'intelligence')} target="_blank" rel="noopener noreferrer" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
            Voir le terminal ↗
          </a>
        </p>
      </Repli>

      {/* The generated daily report: folded, closed, and labelled for what it is. */}
      <Repli
        id="rapport"
        titre="Rapport généré du jour"
        resume={report ? `${mediumDate(report.date)} · généré par un modèle, sans relecture` : 'généré par un modèle, sans relecture'}
        toujoursPliable
        className="border-t border-border pt-6"
        corpsClassName="mt-4"
      >
        {reportContent ? (
          <div className="prose prose-sm prose-invert max-w-[72ch]
            prose-headings:text-foreground prose-headings:tracking-tight
            prose-p:text-sm prose-p:text-foreground prose-p:leading-relaxed prose-li:text-sm
            prose-strong:text-foreground prose-hr:border-border
            prose-blockquote:border-border prose-blockquote:text-muted prose-blockquote:not-italic">
            {reportContent}
          </div>
        ) : (
          <p className="text-sm text-muted">Rapport non disponible : il est généré chaque jour à 9 h UTC.</p>
        )}
      </Repli>

      {/* Test the weather on one's own strategy. */}
      <section aria-labelledby="tester" className="border-t border-border pt-8 sm:pt-10">
        <h2 id="tester" className="text-2xl font-semibold tracking-tight">Teste la météo sur ta stratégie</h2>
        <p className="mt-2 max-w-[68ch] text-muted">
          Le labo rejoue mes règles réelles sur ton backtest, avec et sans la météo.
        </p>
        <a
          href={labUrl('https://lab.algoproof.fr/lab', 'intelligence')}
          className="mt-4 inline-flex min-h-11 items-center rounded border border-accent bg-button px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card-2"
        >
          Ouvrir le labo
        </a>
      </section>
    </div>
    </>
  )
}
