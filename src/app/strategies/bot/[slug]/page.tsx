// src/app/strategies/bot/[slug]/page.tsx
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import StrategyDetail from '@/components/StrategyDetail'
import TrackView from '@/components/TrackView'
import FavoriteButton from '@/components/FavoriteButton'
import FollowButton from '@/components/FollowButton'
import BotParamsSection from '@/components/BotParams'
import ExplainerBox from '@/components/ExplainerBox'
import BotQuestionForm from '@/components/BotQuestionForm'
import ConformityCard from '@/components/ConformityCard'
import PathToRealCard from '@/components/PathToRealCard'
import ThreeSentences from '@/components/ThreeSentences'
import CapitalSimulator from '@/components/CapitalSimulator'
import BotProvenance from '@/components/BotProvenance'
import RecipeGate from '@/components/RecipeGate'
import EngineBotSummary from '@/components/EngineBotSummary'
import VerdictPanel, { decisionColumn } from '@/components/VerdictPanel'
import BotFigures, { type FiguresProps } from '@/components/BotFigures'
import { getBotSimulation } from '@/lib/bot-simulation'
import { timelinePerfDaily } from '@/lib/backtest-segment'
import { getBotSlugs, getBotWithStats } from '@/lib/queries'
import { getBotParams } from '@/lib/bot-params'
import { getBotExpectations } from '@/lib/bot-expectations'
import { getProvenanceForBot } from '@/lib/screening'
import { ficheSlugForBot } from '@/lib/strategy-keys'
import { getStrategyFiche } from '@/lib/strategy-library'
import { provenanceSentence, dossierHref } from '@/lib/provenance'
import { familyLabel } from '@/lib/families'
import { labUrl } from '@/lib/lab-links'
import { botVerdict } from '@/lib/bot-verdict'
import { assessConformity } from '@/lib/conformity'
import { evaluatePathToReal, DEFAULT_LIVE_GATE } from '@/lib/path-to-real'
import { breadcrumbName } from '@/lib/trade-ledger'
import { fmtEur, frNumber, NARROW_NBSP, pnlPct } from '@/lib/display'
import { longDate, longDateOrdinal } from '@/lib/format-date'
import { readingDate } from '@/lib/home-register'
import { unstable_cache } from 'next/cache'
import { getLaunchedVariantTwins, numericTwinPrimary, type TwinFields } from '@/lib/library'

export const revalidate = 1800
export const dynamicParams = true

// Only the real-money fiches are rendered at build (chantier bibliotheque, lot 2): the
// engine adds bots by the hundred, and every fiche read its trades and its segment at
// build. The others render on their first visit and are cached like the rest
// (revalidate above); dynamicParams keeps their URLs reachable, getBotWithStats keeps a
// backtest-only survivor a 404 (tests/app/bot-slug-routes.test.tsx).
export async function generateStaticParams() {
  try {
    const slugs = await getBotSlugs({ status: 'live' })
    return slugs.map(slug => ({ slug }))
  } catch {
    return []
  }
}

const getTwinsCached = unstable_cache(getLaunchedVariantTwins, ['library-variant-twins'], { revalidate: 1800, tags: ['library'] })

/** Lot 2: a library variant that differs from an older sibling only by its settings'
 *  values is noindex (numericTwinPrimary); its links stay followed. A failed read
 *  leaves the page indexable, as it was. */
async function isNumericTwin(bot: TwinFields): Promise<boolean> {
  if (!bot.idea_key) return false
  try {
    return numericTwinPrimary(bot, await getTwinsCached()) !== null
  } catch {
    return false
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) return {}
  const twin = await isNumericTwin(bot as unknown as TwinFields)
  // Same figures as the fiche's tiles: the simulation since the freeze when there is one.
  const stats = (await getBotSimulation(bot))?.stats ?? bot.stats
  return {
    title: bot.name,
    description: `${bot.name} : performance live, WR ${(stats.win_rate * 100).toFixed(1)}%, PF ${stats.profit_factor.toFixed(2)}. ${bot.exchange} · ${bot.timeframe}. Chaque trade vérifié sur AlgoProof.`,
    openGraph: {
      type: 'website',
      url: `https://algoproof.fr/strategies/bot/${slug}`,
    },
    ...(twin ? { robots: { index: false, follow: true } } : {}),
  }
}

const SECTION = 'border-t border-border py-8 sm:py-10 scroll-mt-20'
const H2 = 'text-2xl font-semibold tracking-tight mb-5'
const money = (n: number) => `${frNumber(n, 2)}${NARROW_NBSP}€`

export default async function StrategyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) notFound()
  // Engine bots with a backtest segment (D072): ONE simulation feeds every figure of the
  // fiche (panel, figures, path-to-real criteria, curve, capital simulator), so none
  // falls back to the ledger alone while another counts the replay after the freeze.
  // Null = plain paper view, bot.stats everywhere.
  const simulation = await getBotSimulation(bot)
  const stats = simulation?.stats ?? bot.stats

  const expectations = getBotExpectations(slug)
  // Resolved by bot_slug directly (see getProvenanceForBot) — never breaks the page: it
  // returns null both when this bot was never screened and when the screening tables
  // don't exist yet in this environment.
  const provenance = await getProvenanceForBot(bot.slug)
  // The `orb` fiche describes the Labo's ORB: a cap on trades per day and a session end
  // where every position is closed. The engine's ORB closes nothing at session end and can
  // fire several times in one session (audit 2026-09-10). Pointing an engine-born ORB bot
  // at that fiche would describe a strategy it does not run, so both links from this page
  // are withheld for those bots only; the hand-deployed ORB keeps its link.
  const resolvedConcept = ficheSlugForBot(bot)
  const conceptSlug = bot.origin === 'engine' && resolvedConcept === 'orb' ? null : resolvedConcept

  // Refonte « Le registre des décisions », lot 3 (2026-10-02). The verdict panel under
  // the title, never folded (audit 2026-10, constat 3): one state chosen from the data
  // the fiche already has, the decision quoted from its published text.
  const verdict = botVerdict({ status: bot.status, archivedAt: bot.archived_at, stats, expectations })
  const gate = { ...DEFAULT_LIVE_GATE, ...expectations?.liveGate }
  const column = decisionColumn(verdict, {
    status: bot.status, criteriaCount: evaluatePathToReal(stats, gate).criteria.length,
  })
  // The drawdown takes the colour of its published limit, or none (constat 30).
  const ddCheck = expectations && stats.total_trades > 0
    ? assessConformity(expectations, stats).checks.find(c => c.label === 'Drawdown max')?.status
    : undefined
  const drawdownTone = ddCheck === 'breach' || ddCheck === 'watch' ? ddCheck : 'neutral'

  // The three figures. Real money on the comparison base, without a sentence explaining
  // it (owner, 02/10); a simulation on its own start, the backtest apart (constat 4).
  const traded = stats.total_trades > 0
  const figures: FiguresProps = (() => {
    if (simulation) {
      const base = simulation.timeline.simStartCapital
      const result = traded ? stats.latest_capital - base : null
      return {
        baseLabel: 'Départ de la simulation',
        base,
        resultLabel: 'Résultat de la simulation',
        result,
        resultPct: result === null ? null : pnlPct(stats.latest_capital, base),
        totalLabel: 'Départ + résultat',
        apart: `Simulation depuis le ${longDateOrdinal(simulation.timeline.simStart)}. Depuis ${money(bot.start_capital)} le 1er janvier, backtest compris : ${fmtEur(stats.latest_capital - bot.start_capital)}, dont backtest ${fmtEur(base - bot.start_capital)}.`,
      }
    }
    const result = traded ? stats.latest_capital - bot.start_capital : null
    const live = bot.status === 'live'
    return {
      baseLabel: live ? 'Base de comparaison' : 'Capital de départ',
      base: bot.start_capital,
      resultLabel: live ? 'Résultat' : 'Résultat de la simulation',
      result,
      resultPct: result === null ? null : pnlPct(stats.latest_capital, bot.start_capital),
      totalLabel: live ? 'Base + résultat' : 'Départ + résultat',
    }
  })()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">

      {/* Analytics: view_bot on mount (client leaf, keeps the page server-rendered) */}
      <TrackView slug={slug} />

      {/* The way back (audit 2026-10, constat 35): the fleet, then this bot. */}
      <nav aria-label="Fil d’Ariane" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li><Link href="/" className={linkClass('nav', 'inline-flex min-h-11 items-center')}>Accueil</Link></li>
          <li aria-hidden="true" className="text-muted">/</li>
          <li><Link href="/overview" className={linkClass('nav', 'inline-flex min-h-11 items-center')}>La flotte</Link></li>
          <li aria-hidden="true" className="text-muted">/</li>
          <li aria-current="page" className="text-foreground">{breadcrumbName(bot.name, bot.exchange)}</li>
        </ol>
      </nav>

      <header data-testid="bot-header" className="pt-2">
        {/* Regime and market first, then the name. A long asset list folds under
            « N actifs » (lot 5, conception §5.6). */}
        <div className="flex items-center gap-3 flex-wrap text-sm text-muted">
          <StatusBadge status={bot.status} variant="registre" />
          <span>{`${bot.exchange} · ${bot.timeframe}`}</span>
          {bot.assets.length > 3 ? (
            <details data-testid="bot-assets" className="inline-block">
              <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 min-h-11 hover:text-foreground [&::-webkit-details-marker]:hidden">
                {`${bot.assets.length} actifs`}
                <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <span className="block font-mono text-sm leading-relaxed max-w-[68ch]">{bot.assets.join(', ')}</span>
            </details>
          ) : (
            <span>{`· ${bot.assets.join(', ')}`}</span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 mb-5 max-w-[850px]">{bot.name}</h1>

        <VerdictPanel verdict={verdict} column={column} />

        {/* « Relevé du … » in the home's format: the bot's last sync, else the render. */}
        <BotFigures {...figures} reading={readingDate([bot.last_sync_at]) ?? longDate(new Date())} />

        {/* Where this bot came from and since when. The real-money start date is said
            here, once, from bots.live_since (D057). */}
        <p className="text-xs text-muted mt-3 max-w-[90ch]">
          {`${stats.total_trades} trade${stats.total_trades > 1 ? 's' : ''} clos. ${provenanceSentence(bot)}`}
          {dossierHref(bot) && (
            <>
              {' '}
              <a href={labUrl(dossierHref(bot)!, 'fiche-bot-dossier')} className={linkClass('inline')}
                 target="_blank" rel="noopener noreferrer">
                Voir le dossier de validation ↗
              </a>
            </>
          )}
        </p>
        <p className="text-xs text-muted mt-1">
          <span data-testid="bot-family" className="text-muted">{familyLabel(bot.family)}</span>
          {/* An engine bot's name already reads strategy, TF, platform (24/09): its
              `strategy` line would repeat the h1. */}
          {/* A stored strategy line may carry a dash (« Opening Range H1 — 25 actifs »); the
              site writes no em dash, so it reads with a middle dot. */}
          {!bot.engine_unit_key && <>{' · '}<span>{bot.strategy.replace(/\s+—\s+/g, ' · ')}</span></>}
          {/* The third edge of the graph: back to the strategy this bot runs. Absent,
              not broken, when no fiche claims this bot. */}
          {conceptSlug && (
            <>
              {' · '}
              <Link href={`/strategies/${conceptSlug}`} className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
                La stratégie derrière ce bot →
              </Link>
            </>
          )}
        </p>

        {/* Client islands: the page stays static and public, the star and the bell
            alone ask who is reading (espace-direct lots A and H). The bell shows to a
            Direct account only, as before. */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <FavoriteButton slug={bot.slug} appearance="registre" />
          <FollowButton slug={bot.slug} />
          <span className="text-xs text-muted">Un favori n’envoie aucun message.</span>
        </div>

        <nav aria-label="Dans cette fiche" className="mt-6 border-t border-border">
          <ul className="flex flex-wrap gap-x-6 text-sm">
            <li><a href="#regles" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>Règles et décision</a></li>
            <li><a href="#trades" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>Trades clos</a></li>
            <li><a href="#methode" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>Comment il tourne</a></li>
          </ul>
        </nav>
      </header>

      {/* What I had fixed, against what happened (constats 6 and 30). */}
      <section id="regles" aria-labelledby="regles-title" className={SECTION}>
        <h2 id="regles-title" className={H2}>Ce que j’avais fixé. Ce qui s’est passé.</h2>
        {expectations ? (
          <ConformityCard expectations={expectations} stats={stats} />
        ) : bot.status !== 'paper' ? (
          <p className="max-w-[68ch]">
            Je n’ai pas fixé de limites à l’avance pour ce bot : je n’ai ni seuil à confronter
            à ses résultats ni règle d’arrêt publiée. Je publie chacun de ses trades, plus bas.
          </p>
        ) : null}
        {/* Paper→real gate, paper bots only. A live bot's real-money start date is on
            the provenance line above, and only there (D057). */}
        {bot.status === 'paper' && (
          <div className={expectations ? 'mt-10' : ''}>
            <PathToRealCard status={bot.status} stats={stats} liveGate={expectations?.liveGate} />
          </div>
        )}
      </section>

      {/* Filters, figures, curve and the register of closed trades. */}
      <section id="trades" aria-labelledby="trades-title" className={SECTION}>
        <h2 id="trades-title" className={H2}>Je laisse l’addition visible.</h2>
        <StrategyDetail bot={bot} simulation={simulation} drawdownTone={drawdownTone} />
      </section>

      {/* Provenance: which screening campaign this bot came from, and what it measured */}
      {provenance && (
        <section aria-labelledby="provenance-title" className={SECTION}>
          <h2 id="provenance-title" className={H2}>D’où vient ce bot</h2>
          <BotProvenance campaign={provenance.campaign} candidate={provenance.candidate} />
        </section>
      )}

      <section id="methode" aria-labelledby="methode-title" className={SECTION}>
        <h2 id="methode-title" className={H2}>Comment je fais tourner ce bot</h2>
        {/* Novice layer: plain-FR summary (only for bots with a documented envelope) */}
        {expectations?.threeSentences && <ThreeSentences data={expectations.threeSentences} />}
        <ExplainerBox
          functional={(() => {
            // An engine bot's `description` is one generic sentence per base,
            // identical on every bot of that base (publisher: ARMADA_BASE_DESC_FR).
            // Since 2026-09-24 the tab carries the concept summary inline plus
            // this bot's own facts (EngineBotSummary), instead of one line and
            // a link. Legacy bots keep their hand-written text; an engine base
            // with no concept page yet (WilliamsVolBreak) falls back to its
            // sentence, because an empty slot would read as "nothing to say".
            const fiche = bot.engine_unit_key && conceptSlug ? getStrategyFiche(conceptSlug) : null
            if (fiche && conceptSlug) {
              return (
                <EngineBotSummary
                  fiche={fiche}
                  conceptSlug={conceptSlug}
                  slug={bot.slug}
                  timeframe={bot.timeframe}
                  exchange={bot.exchange}
                  assetCount={bot.assets.length}
                  technicalIsPublic={getBotParams(slug) !== null}
                />
              )
            }
            return bot.description ? (
              <p>{bot.description}</p>
            ) : (
              <p className="text-muted italic">Description disponible prochainement.</p>
            )
          })()}
          technical={(() => {
            const params = getBotParams(slug)
            if (params) return <BotParamsSection params={params} />
            // No fiche entry yet, but the engine tags this bot with a unit key:
            // a wave bot whose exact recipe is a paid labo asset. The page is
            // static and the same for everyone, so it hands only the slug to
            // RecipeGate, which asks /api/bot/[slug]/recipe after load: a
            // paying member gets the recipe, anyone else the members-only
            // sentence. dossier slug: engine_unit_key's `base` segment,
            // lowercased (e.g. 'HMAcross|H4|data_20260802|3' -> 'hmacross').
            if (bot.engine_unit_key) {
              const dossier = bot.engine_unit_key.split('|')[0].toLowerCase()
              return <RecipeGate slug={slug} dossierBase={dossier} />
            }
            return (
              <p className="text-sm text-muted italic">
                Paramètres techniques en cours de documentation.
              </p>
            )
          })()}
        />
        {/* Bridge to the lab and to the method */}
        <p className="text-sm text-muted mt-6 max-w-[68ch]">
          Envie de tester une idée avec la même rigueur ? Le labo applique mes contrôles anti-overfit à tes propres backtests.
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-6 text-sm">
          <li><Link href="/preuve" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>Ma méthode →</Link></li>
          <li>
            <a href={labUrl('https://lab.algoproof.fr/lab', 'fiche-bot')} target="_blank" rel="noopener noreferrer"
               className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
              Ouvrir le labo ↗
            </a>
          </li>
        </ul>
      </section>

      {/* "Sur mon capital" — observed history rescaled to a visitor-chosen
          capital. AFTER the explanation since 2026-09-19 (D057): a reader
          handled amounts before learning what the bot does. */}
      {/* An engine bot with a backtest segment is read from 1 January (user, 2026-09-28),
          the simulation first and the backtest's share named apart (constat 4). */}
      {simulation ? (
        <CapitalSimulator perfDaily={timelinePerfDaily(simulation.timeline, bot.slug)}
          startCapital={bot.start_capital} backtestUntil={simulation.segment.freezeDate}
          backtestEndCapital={simulation.timeline.simStartCapital} traded={traded} />
      ) : bot.perf_daily.length > 0 && (
        <CapitalSimulator perfDaily={bot.perf_daily} startCapital={bot.start_capital} traded={traded} />
      )}

      {/* A private question, the lab account page's form (owner, 2026-09-26). It
          replaces a public, unmoderated Discussion that had no comment in two months. */}
      <BotQuestionForm botName={bot.name} slug={slug} />

      {/* Partager — folded on every screen (D057): embed code, rarely used,
          262 px on a phone. A native <details>, not Repli: this one SHOULD
          have a toggle on a computer too. */}
      {/* The FAQ's drawn chevron says it opens, and turns when it is open (refonte
          finition, 2026-10-02): a bare title read as a heading over nothing. */}
      <details className="group border-t border-border py-6 mb-10">
        <summary className="cursor-pointer min-h-11 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden hover:text-accent">
          <h2 className="inline text-xl font-semibold">Partager ce bot</h2>
          <svg aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted transition-transform group-open:rotate-180"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="space-y-3 mt-3">
          <div>
            <p className="text-xs text-muted mb-1.5">Intégrer (iframe)</p>
            <code className="block text-xs bg-card border border-border rounded px-3 py-2 font-mono text-muted break-all select-all">
              {`<iframe src="https://algoproof.fr/embed/${slug}" width="480" height="200" frameborder="0"></iframe>`}
            </code>
          </div>
          <div>
            <p className="text-xs text-muted mb-1.5">Image directe (Twitter / Discord)</p>
            <code className="block text-xs bg-card border border-border rounded px-3 py-2 font-mono text-muted break-all select-all">
              {`https://algoproof.fr/api/card/${slug}`}
            </code>
          </div>
        </div>
      </details>

    </div>
  )
}
