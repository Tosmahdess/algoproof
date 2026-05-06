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
    label:       'Suivi de tendance',
    color:       '#ff6b35',
    description: 'Les stratégies de suivi de tendance exploitent les mouvements directionnels du marché. Le bot entre quand la tendance est confirmée et sort quand elle s\'affaiblit. Peu de trades, mais un excellent ratio gain/risque quand ils se déclenchent.',
  },
  {
    slug:        'breakout',
    label:       'Cassure de niveaux',
    color:       '#3fb950',
    description: 'Détecte quand le prix franchit un niveau clé ou sort d\'une zone de consolidation. Ces bots capturent l\'élan naissant au début d\'un nouveau mouvement.',
  },
  {
    slug:        'multi-signal',
    label:       'Multi-signaux',
    color:       '#d29922',
    description: 'Combine des signaux issus de plusieurs unités de temps ou indicateurs. L\'entrée n\'est validée que lorsque tous les signaux s\'alignent — moins de trades, plus de conviction.',
  },
  {
    slug:        'multi-asset',
    label:       'Multi-actifs',
    color:       '#40c4ff',
    description: 'Stratégies non-crypto tradant sur le Forex et l\'or. Décorrélation réelle par rapport au marché crypto.',
  },
  {
    slug:        'leveraged',
    label:       'Avec levier',
    color:       '#ff4444',
    description: 'Versions amplifiées de stratégies existantes utilisant un levier dynamique. Rendements potentiels plus élevés, risque de drawdown accru. Réservé aux capitaux adaptés.',
  },
]

export default async function StrategiesPage() {
  const bots = await getAllBotsWithStats()

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stratégies de trading</h1>
        <p className="mt-2 text-sm text-muted">
          Tous les bots tournent en paper trading. Chaque trade est public. Les stratégies marquées{' '}
          <span className="text-positive font-medium">en direct</span> utilisent du capital réel.
        </p>
      </div>

      {FAMILIES.map(fam => {
        const famBots = bots
          .filter(b => b.family === fam.slug)
          .sort((a, b) => b.stats.latest_capital - a.stats.latest_capital)
        return (
          <section key={fam.slug} id={fam.slug}>
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
                Bientôt disponible — bots en développement ou en phase de backtest.
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
