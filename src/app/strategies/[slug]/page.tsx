// src/app/strategies/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import StrategyDetail from '@/components/StrategyDetail'
import TrackView from '@/components/TrackView'
import BotParamsSection from '@/components/BotParams'
import ExplainerBox from '@/components/ExplainerBox'
import DiscussionTab from '@/components/DiscussionTab'
import ExchangeAlert from '@/components/ExchangeAlert'
import ConformityCard from '@/components/ConformityCard'
import PathToRealCard from '@/components/PathToRealCard'
import ThreeSentences from '@/components/ThreeSentences'
import CapitalSimulator from '@/components/CapitalSimulator'
import BotProvenance from '@/components/BotProvenance'
import BotTradeChartIsland from '@/components/BotTradeChartIsland'
import { getBotSlugs, getBotWithStats, getChangelogForBot } from '@/lib/queries'
import { getBotParams } from '@/lib/bot-params'
import { getBotExpectations } from '@/lib/bot-expectations'
import { getProvenanceForBot } from '@/lib/screening'

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
    description: `${bot.name} — performance live : WR ${(bot.stats.win_rate * 100).toFixed(1)}%, PF ${bot.stats.profit_factor.toFixed(2)}. ${bot.exchange} · ${bot.timeframe}. Chaque trade vérifié sur AlgoProof.`,
    openGraph: {
      type: 'website',
      url: `https://algoproof.fr/strategies/${slug}`,
    },
  }
}

export default async function StrategyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) notFound()

  const changelogs = await getChangelogForBot(bot)
  const expectations = getBotExpectations(slug)
  // Resolved by bot_slug directly (see getProvenanceForBot) — never breaks the page: it
  // returns null both when this bot was never screened and when the screening tables
  // don't exist yet in this environment.
  const provenance = await getProvenanceForBot(bot.slug)

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">

      {/* Analytics: view_bot on mount (client leaf, keeps the page server-rendered) */}
      <TrackView slug={slug} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusBadge status={bot.status} />
          <span className="text-muted text-sm">{bot.exchange} · {bot.timeframe} · {bot.assets.join(', ')}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{bot.name}</h1>
        <p className="text-muted">{bot.strategy}</p>
        <p className="text-xs text-muted mb-4 max-w-2xl">
          Pour qui : ce bot suit une logique systématique, sans intervention. Le trading comporte un risque de perte.
          La plupart de mes bots sont en <a href="/lexique#paper-trading" className="text-accent">paper trading</a> (simulation) ; ceux en argent réel sont marqués « live ».
        </p>
      </div>

      {/* Provenance: which screening campaign this bot came from, and how narrow its margin was */}
      {provenance && (
        <BotProvenance campaign={provenance.campaign} candidate={provenance.candidate} />
      )}

      {/* Exchange alert — Binance Futures bloqué FR */}
      <ExchangeAlert exchange={bot.exchange} />

      {/* Novice layer: plain-FR summary (only for bots with a documented envelope) */}
      {expectations?.threeSentences && <ThreeSentences data={expectations.threeSentences} />}

      {/* Filter + metrics + equity curve + trades — interactive client island */}
      <StrategyDetail bot={bot} />

      {/* Real price chart + trade entry/exit segments — client island, ssr:false.
          Bot has no single `asset` field (`assets: string[]`, some bots trade several
          symbols); use the first as the primary one, same order used in the header above.
          Renders null on any failure (unmappable asset, fetch error) — equity curve above
          stays the fallback. */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Trades réels sur le prix</h2>
        <BotTradeChartIsland asset={bot.assets[0] ?? ''} timeframe={bot.timeframe} trades={bot.all_trades} />
      </section>

      {/* Conformity: pre-registered envelope vs realized + public kill criteria */}
      {expectations && <ConformityCard expectations={expectations} stats={bot.stats} />}

      {/* Paper→real gate (paper bots) or real-money start date (live bots) */}
      <PathToRealCard
        status={bot.status}
        stats={bot.stats}
        liveGate={expectations?.liveGate}
        liveSince={expectations?.liveSince}
      />

      {/* "Sur mon capital" — observed history rescaled to a visitor-chosen capital */}
      {bot.perf_daily.length > 0 && (
        <CapitalSimulator perfDaily={bot.perf_daily} startCapital={bot.start_capital} />
      )}

      {/* Explanation: plain overview → technical params */}
      <section className="mb-8">
        <ExplainerBox
          functional={
            bot.description ? (
              <p>{bot.description}</p>
            ) : (
              <p className="text-muted italic">Description disponible prochainement.</p>
            )
          }
          technical={(() => {
            const params = getBotParams(slug)
            if (!params) return (
              <p className="text-muted italic text-xs">
                Paramètres techniques en cours de documentation.
              </p>
            )
            return <BotParamsSection params={params} />
          })()}
          changelogs={changelogs}
        />
      </section>

      {/* Bridge to the lab */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8 text-center">
        <p className="text-sm text-muted mb-3">
          Envie de tester une idée avec la même rigueur ? Le labo applique mes contrôles anti-overfit à tes propres backtests.
        </p>
        <a
          href="https://lab.algoproof.fr/lab"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-positive hover:underline"
        >
          Ouvrir le labo →
        </a>
      </div>

      {/* Discussion */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-4">💬 Discussion</h2>
        <DiscussionTab slug={slug} />
      </div>

      {/* Partager */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">🔗 Partager ce bot</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted mb-1.5">Intégrer (iframe)</p>
            <code className="block text-xs bg-background border border-border rounded px-3 py-2 font-mono text-muted/80 break-all select-all">
              {`<iframe src="https://algoproof.fr/embed/${slug}" width="480" height="200" frameborder="0"></iframe>`}
            </code>
          </div>
          <div>
            <p className="text-xs text-muted mb-1.5">Image directe (Twitter / Discord)</p>
            <code className="block text-xs bg-background border border-border rounded px-3 py-2 font-mono text-muted/80 break-all select-all">
              {`https://algoproof.fr/api/card/${slug}`}
            </code>
          </div>
        </div>
      </div>

    </div>
  )
}
