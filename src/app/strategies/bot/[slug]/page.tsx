// src/app/strategies/bot/[slug]/page.tsx
import TermPopover from '@/components/TermPopover'
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import StrategyDetail from '@/components/StrategyDetail'
import TrackView from '@/components/TrackView'
import BotParamsSection from '@/components/BotParams'
import ExplainerBox from '@/components/ExplainerBox'
import DiscussionTab from '@/components/DiscussionTab'
import ConformityCard from '@/components/ConformityCard'
import PathToRealCard from '@/components/PathToRealCard'
import ThreeSentences from '@/components/ThreeSentences'
import CapitalSimulator from '@/components/CapitalSimulator'
import BotProvenance from '@/components/BotProvenance'
import SampleNote from '@/components/SampleNote'
import RecipeGate from '@/components/RecipeGate'
import EngineBotSummary from '@/components/EngineBotSummary'
import { getBotSlugs, getBotWithStats } from '@/lib/queries'
import { getBotParams } from '@/lib/bot-params'
import { getBotExpectations } from '@/lib/bot-expectations'
import { getProvenanceForBot } from '@/lib/screening'
import { ficheSlugForBot } from '@/lib/strategy-keys'
import { getStrategyFiche } from '@/lib/strategy-library'
import { provenanceSentence, dossierHref } from '@/lib/provenance'

export const revalidate = 1800
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const slugs = await getBotSlugs()
    return slugs.map(slug => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) return {}
  return {
    title: bot.name,
    description: `${bot.name} : performance live, WR ${(bot.stats.win_rate * 100).toFixed(1)}%, PF ${bot.stats.profit_factor.toFixed(2)}. ${bot.exchange} · ${bot.timeframe}. Chaque trade vérifié sur AlgoProof.`,
    openGraph: {
      type: 'website',
      url: `https://algoproof.fr/strategies/bot/${slug}`,
    },
  }
}

export default async function StrategyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) notFound()

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">

      {/* Analytics: view_bot on mount (client leaf, keeps the page server-rendered) */}
      <TrackView slug={slug} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusBadge status={bot.status} />
          <span className="text-muted text-sm">{bot.exchange} · {bot.timeframe} · {bot.assets.join(', ')}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">{bot.name}</h1>
        <p className="text-muted">{bot.strategy}</p>
        {/* The third edge of the graph. /overview groups this bot under its
            strategy and /strategies/<concept> explains that strategy and lists
            this bot — and from here there was no way back to either. Absent,
            not broken, when no fiche claims this bot: six of the 27 deployed
            bots run something no fiche describes (grid, delta-neutral carry,
            funding reversal…). */}
        {conceptSlug && (
          <p className="text-sm mt-1 mb-2">
            <Link href={`/strategies/${conceptSlug}`} className={linkClass('inline')}>
              La stratégie derrière ce bot →
            </Link>
          </p>
        )}
        <p className="text-sm text-muted mb-4 max-w-2xl">
          Pour qui : ce bot suit une logique systématique, sans intervention. Le trading comporte un risque de perte.
          La plupart de mes bots sont en <TermPopover id="paper-trading">paper trading</TermPopover> (simulation) ; ceux qui tournent avec mon argent sont marqués « Argent réel ».
        </p>
      </div>

      {/* Provenance: where this bot came from — engine-born or hand-deployed — and when */}
      <p className="text-xs text-muted mb-4">
        {provenanceSentence(bot)}
        {dossierHref(bot) && (
          <>
            {' '}
            <a href={dossierHref(bot)!} className={linkClass('inline')}
               target="_blank" rel="noopener noreferrer">
              Voir le dossier de validation
            </a>
          </>
        )}
      </p>

      {/* Provenance: which screening campaign this bot came from, and what it measured */}
      {provenance && (
        <BotProvenance campaign={provenance.campaign} candidate={provenance.candidate} />
      )}

      {/* Novice layer: plain-FR summary (only for bots with a documented envelope) */}
      {expectations?.threeSentences && <ThreeSentences data={expectations.threeSentences} />}

      {/* Honest dormancy / low-sample note — applies to every bot, documented
          envelope or not, unlike ConformityCard's dormancyNote below (which only
          renders for the handful of bots with a pre-registered envelope).
          `dormancyNote` is NOT passed here: it comes from `expectations`, and
          whenever `expectations` exists, ConformityCard mounts unconditionally
          a few lines down and shows the same sentence itself once totalTrades
          is 0 — passing it to both would print it twice on one page (found in
          fix round 1, funding-rev-long). SampleNote keeps its own generic
          "il attend son signal" line either way. */}
      <SampleNote totalTrades={bot.stats.total_trades} />

      {/* Filter + metrics + equity curve + trades — interactive client island */}
      <StrategyDetail bot={bot} />

      {/* Conformity: pre-registered envelope vs realized + public kill criteria */}
      {expectations && <ConformityCard expectations={expectations} stats={bot.stats} />}

      {/* Paper→real gate, paper bots only. A live bot's real-money start date
          is on the provenance line above, and only there (D057): the card
          used to repeat it from the same column. */}
      <PathToRealCard
        status={bot.status}
        stats={bot.stats}
        liveGate={expectations?.liveGate}
      />

      {/* Explanation: plain overview → technical params */}
      <section className="mb-8">
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
      </section>

      {/* "Sur mon capital" — observed history rescaled to a visitor-chosen
          capital. AFTER the explanation since 2026-09-19 (D057): a reader
          handled amounts before learning what the bot does. */}
      {bot.perf_daily.length > 0 && (
        <CapitalSimulator perfDaily={bot.perf_daily} startCapital={bot.start_capital} />
      )}

      {/* Bridge to the lab */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8 text-center">
        <p className="text-sm mb-3">
          Envie de tester une idée avec la même rigueur ? Le labo applique mes contrôles anti-overfit à tes propres backtests.
        </p>
        <a
          href="https://lab.algoproof.fr/lab"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass('inline', 'text-sm')}
        >
          Ouvrir le labo →
        </a>
      </div>

      {/* Discussion */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-3">💬 Discussion</h2>
        <DiscussionTab slug={slug} />
      </div>

      {/* Partager — folded on every screen (D057): embed code, rarely used,
          262 px on a phone. A native <details>, not Repli: this one SHOULD
          have a toggle on a computer too. */}
      <details className="bg-card border border-border rounded-lg p-6">
        <summary className="cursor-pointer">
          <h2 className="inline text-xl font-semibold">🔗 Partager ce bot</h2>
        </summary>
        <div className="space-y-3 mt-3">
          <div>
            <p className="text-xs text-muted mb-1.5">Intégrer (iframe)</p>
            <code className="block text-xs bg-bg border border-border rounded px-3 py-2 font-mono text-muted break-all select-all">
              {`<iframe src="https://algoproof.fr/embed/${slug}" width="480" height="200" frameborder="0"></iframe>`}
            </code>
          </div>
          <div>
            <p className="text-xs text-muted mb-1.5">Image directe (Twitter / Discord)</p>
            <code className="block text-xs bg-bg border border-border rounded px-3 py-2 font-mono text-muted break-all select-all">
              {`https://algoproof.fr/api/card/${slug}`}
            </code>
          </div>
        </div>
      </details>

    </div>
  )
}
