// src/app/dashboard/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { getAllBotsWithStats } from '@/lib/queries'
import { pnlEur, pnlPct, fmtEur, fmtPct, DISPLAY_CAPITAL } from '@/lib/display'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vue globale — AlgoProof',
  description: 'Tableau de bord complet : tous les bots, leurs performances et leur statut en temps réel.',
}

const FAMILY_LABEL: Record<string, string> = {
  'trend':        'Suivi de tendance',
  'breakout':     'Cassure de niveaux',
  'multi-signal': 'Multi-signaux',
  'multi-asset':  'Multi-actifs',
  'leveraged':    'Avec levier',
}

const FAMILY_COLOR: Record<string, string> = {
  'trend':        '#ff6b35',
  'breakout':     '#3fb950',
  'multi-signal': '#d29922',
  'multi-asset':  '#40c4ff',
  'leveraged':    '#ff4444',
}

export default async function DashboardPage() {
  const bots = await getAllBotsWithStats()

  const sorted = [...bots].sort((a, b) => b.stats.latest_capital - a.stats.latest_capital)

  const totalTrades  = bots.reduce((s, b) => s + b.stats.total_trades, 0)
  const botsWithData = bots.filter(b => b.stats.total_trades > 0)
  const winners      = botsWithData.filter(b => b.stats.latest_capital > 1000).length
  const avgPnl       = botsWithData.length > 0
    ? botsWithData.reduce((s, b) => s + pnlEur(b.stats.latest_capital), 0) / botsWithData.length
    : 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Vue globale</h1>
        <p className="text-sm text-muted">
          Tous les bots en paper trading, triés par performance. Chaque trade est public.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Bots actifs',    value: `${bots.length}` },
          { label: 'Trades fermés',  value: `${totalTrades}` },
          { label: 'En positif',     value: `${winners} / ${botsWithData.length}`, color: '#3fb950' },
          { label: `P&L moyen (${DISPLAY_CAPITAL}€)`, value: fmtEur(avgPnl), color: avgPnl >= 0 ? '#3fb950' : '#ff4444' },
        ].map(s => (
          <div key={s.label} className="rounded border border-border p-4 text-center">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-bold font-mono" style={s.color ? { color: s.color } : {}}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Bots table */}
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-card">
            <tr className="text-muted text-[10px] uppercase tracking-widest border-b border-border">
              <th className="px-4 py-3 text-left">Stratégie</th>
              <th className="px-4 py-3 text-left">Famille</th>
              <th className="px-4 py-3 text-left">Exchange</th>
              <th className="px-4 py-3 text-right">Trades</th>
              <th className="px-4 py-3 text-right">T. gain</th>
              <th className="px-4 py-3 text-right">F. profit</th>
              <th className="px-4 py-3 text-right">Drawdown</th>
              <th className="px-4 py-3 text-right font-bold">P&amp;L (€)</th>
              <th className="px-4 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(bot => {
              const hasData = bot.stats.total_trades > 0

              return (
                <tr
                  key={bot.id}
                  className="border-b border-border/50 hover:bg-card/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/strategies/${bot.slug}`}
                      className="font-medium hover:text-positive transition-colors"
                    >
                      {bot.name}
                    </Link>
                    <p className="text-muted text-[10px] mt-0.5">{bot.timeframe}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: FAMILY_COLOR[bot.family ?? ''] ?? '#888' }}
                    >
                      {FAMILY_LABEL[bot.family ?? ''] ?? bot.family ?? '—'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted">{bot.exchange}</td>

                  <td className="px-4 py-3 text-right font-mono">
                    {hasData ? bot.stats.total_trades : <span className="text-muted">—</span>}
                  </td>

                  <td className="px-4 py-3 text-right font-mono">
                    {hasData ? `${(bot.stats.win_rate * 100).toFixed(1)}%` : <span className="text-muted">—</span>}
                  </td>

                  <td className={`px-4 py-3 text-right font-mono ${hasData ? (bot.stats.profit_factor >= 1 ? 'text-positive' : 'text-negative') : ''}`}>
                    {hasData ? bot.stats.profit_factor.toFixed(2) : <span className="text-muted">—</span>}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-negative">
                    {hasData ? `${(bot.stats.max_drawdown * 100).toFixed(1)}%` : <span className="text-muted">—</span>}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {hasData ? (
                      <div>
                        <span className={`font-mono font-bold ${pnlEur(bot.stats.latest_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {fmtEur(pnlEur(bot.stats.latest_capital))}
                        </span>
                        <span className={`block text-[10px] font-mono ${pnlPct(bot.stats.latest_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {fmtPct(pnlPct(bot.stats.latest_capital))}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={bot.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-muted mt-6">
        P&amp;L calculé sur les trades fermés depuis le démarrage · Capital initial 1 000€ par bot
      </p>
    </div>
  )
}
