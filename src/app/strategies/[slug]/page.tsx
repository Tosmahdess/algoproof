// src/app/strategies/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import StrategyDetail from '@/components/StrategyDetail'
import BotParamsSection from '@/components/BotParams'
import ExplainerBox from '@/components/ExplainerBox'
import DiscussionTab from '@/components/DiscussionTab'
import ExchangeAlert from '@/components/ExchangeAlert'
import { getBotSlugs, getBotWithStats, getChangelogForBot } from '@/lib/queries'
import { getBotParams } from '@/lib/bot-params'

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusBadge status={bot.status} />
          <span className="text-muted text-sm">{bot.exchange} · {bot.timeframe} · {bot.assets.join(', ')}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{bot.name}</h1>
        <p className="text-muted">{bot.strategy}</p>
      </div>

      {/* Exchange alert — Binance Futures bloqué FR */}
      <ExchangeAlert exchange={bot.exchange} />

      {/* Filter + metrics + equity curve + trades — interactive client island */}
      <StrategyDetail bot={bot} />

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

      {/* Discussion */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-4">💬 Discussion</h2>
        <DiscussionTab slug={slug} />
      </div>

      {/* Partager */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-sm mb-4">🔗 Partager ce bot</h2>
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
