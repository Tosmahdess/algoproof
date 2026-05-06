import type { Metadata } from 'next'
import { getAllBotsWithStats } from '@/lib/queries'
import BotCard from '@/components/BotCard'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Strategies',
  description: 'All AlgoProof trading strategies — real performance data, paper and live.',
}

const FAMILIES: {
  slug: string
  label: string
  color: string
  description: string
}[] = [
  {
    slug:        'trend',
    label:       'Trend Following',
    color:       '#ff6b35',
    description: 'Bots that ride sustained price trends using moving averages. They enter when a trend is confirmed and exit when it weakens. Few trades, but high reward-to-risk when they hit.',
  },
  {
    slug:        'breakout',
    label:       'Breakout',
    color:       '#3fb950',
    description: 'Bots that detect when price breaks out of a consolidation range or key level. They capture the momentum burst at the start of a new move.',
  },
  {
    slug:        'multi-signal',
    label:       'Multi-Signal',
    color:       '#d29922',
    description: 'Bots that combine signals from multiple timeframes or indicators. Entry only when all signals align — lower frequency, higher conviction.',
  },
  {
    slug:        'multi-asset',
    label:       'Multi-Asset',
    color:       '#40c4ff',
    description: 'Non-crypto strategies trading Forex and Gold. True diversification — these bots are uncorrelated with the crypto market.',
  },
  {
    slug:        'leveraged',
    label:       'Leveraged',
    color:       '#ff4444',
    description: 'Amplified versions of core strategies using dynamic leverage. Higher potential returns, higher drawdown risk. Not suitable for all capital sizes.',
  },
]

export default async function StrategiesPage() {
  const bots = await getAllBotsWithStats()

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trading Strategies</h1>
        <p className="mt-2 text-sm text-muted">
          All bots run in paper mode. Every trade is public. Strategies marked{' '}
          <span className="text-positive font-medium">live</span> use real capital.
        </p>
      </div>

      {FAMILIES.map(fam => {
        const famBots = bots.filter(b => b.family === fam.slug)
        return (
          <section key={fam.slug}>
            <div className="flex items-baseline gap-3 mb-2">
              <h2
                className="text-base font-bold tracking-widest uppercase"
                style={{ color: fam.color }}
              >
                {fam.label}
              </h2>
              <span className="text-xs text-muted">
                {famBots.length} {famBots.length === 1 ? 'bot' : 'bots'}
              </span>
            </div>
            <p className="text-xs text-muted mb-6 max-w-2xl">{fam.description}</p>

            {famBots.length === 0 ? (
              <div className="rounded border border-border px-6 py-8 text-center text-xs text-muted">
                Coming soon — bots in this family are in development or backtest phase.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {famBots.map(bot => (
                  <BotCard key={bot.slug} bot={bot} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </main>
  )
}
