// src/app/strategies/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import MetricsRow from '@/components/MetricsRow'
import EquityCurve from '@/components/EquityCurve'
import TradesTable from '@/components/TradesTable'
import BotParamsSection from '@/components/BotParams'
import ExplainerBox from '@/components/ExplainerBox'
import { getBotSlugs, getBotWithStats } from '@/lib/queries'
import { getBotParams } from '@/lib/bot-params'
import { pnlEur, pnlPct, fmtEur, fmtPct, DISPLAY_CAPITAL } from '@/lib/display'

export const revalidate = 3600
export const dynamicParams = false

export async function generateStaticParams() {
  const slugs = await getBotSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) return {}
  return {
    title: bot.name,
    description: `${bot.name} — ${bot.strategy}. Real performance data: WR ${(bot.stats.win_rate * 100).toFixed(1)}%, PF ${bot.stats.profit_factor.toFixed(2)}.`,
  }
}

export default async function StrategyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) notFound()

  const pct = pnlPct(bot.stats.latest_capital)
  const eur = pnlEur(bot.stats.latest_capital)

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

      {/* Key metrics */}
      <div className="mb-8">
        <MetricsRow stats={bot.stats} />
      </div>

      {/* Equity curve */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Courbe d&apos;équité</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">Départ : {DISPLAY_CAPITAL}€</span>
            <span className={`font-mono font-semibold ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
              {fmtEur(eur)} ({fmtPct(pct)})
            </span>
          </div>
        </div>
        <EquityCurve data={bot.perf_daily} startCapital={1000} />
        {bot.status === 'paper' && (
          <p className="text-xs text-muted/60 mt-3 text-center">
            ⚠ Paper trading — exécution simulée, aucun capital réel exposé
          </p>
        )}
      </div>

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
        />
      </section>

      {/* Recent trades */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-4">
          Trades récents
          <span className="text-muted text-sm font-normal ml-2">({bot.recent_trades.length} affichés)</span>
        </h2>
        <TradesTable trades={bot.recent_trades} />
      </div>

      {/* Phase 2 teaser */}
      <div className="bg-card border border-border rounded-xl p-6 text-center opacity-60">
        <p className="text-sm text-muted mb-1">Forum Q&amp;R et accès au code disponibles en Phase 2</p>
        <p className="text-xs text-muted/60">Quand V1 aura 2+ mois de données en direct</p>
      </div>

    </div>
  )
}
