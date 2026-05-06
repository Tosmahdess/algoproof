import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBotsWithStats } from '@/lib/queries'
import { supabaseServer } from '@/lib/supabase-server'
import StatusBadge from '@/components/StatusBadge'
import MiBanner from '@/components/MiBanner'
import GlobalEquityCurve from '@/components/GlobalEquityCurve'
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vue d\'ensemble — AlgoProof',
  description: 'Tableau de bord complet : régime MI, performance de tous les bots, courbe globale et trades récents.',
}

// Bot color palette for equity curve
const BOT_COLORS = [
  '#3fb950','#58a6ff','#ff6b35','#d2a8ff','#f6c90e',
  '#40c4ff','#ff4444','#4ade80','#fb923c','#a78bfa',
]

interface TradeWithBot {
  id: string
  opened_at: string
  closed_at: string
  asset: string
  side: string
  pnl: number
  reason: string | null
  bots: { name: string; slug: string; family: string | null } | null
}

async function getRecentTrades(limit = 20): Promise<TradeWithBot[]> {
  const { data } = await supabaseServer
    .from('trades')
    .select('id,opened_at,closed_at,asset,side,pnl,reason,bots(name,slug,family)')
    .order('closed_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as TradeWithBot[]
}

export default async function OverviewPage() {
  const [bots, recentTrades] = await Promise.all([
    getAllBotsWithStats(),
    getRecentTrades(20),
  ])

  const today = new Date().toISOString().slice(0, 10)

  // Bots with trades (active), sorted by P&L desc
  const activeBots = bots
    .filter(b => b.stats.total_trades > 0)
    .sort((a, b) => b.stats.latest_capital - a.stats.latest_capital)

  // Summary stats
  const totalTrades = bots.reduce((s, b) => s + b.stats.total_trades, 0)
  const inProfit    = activeBots.filter(b => b.stats.latest_capital > 1000).length

  // Today's global P&L
  const todayPnl = bots.reduce((s, b) => {
    const row = b.perf_daily.find(p => p.date === today)
    return s + (row?.pnl_day ?? 0)
  }, 0)

  // Top bots for equity curve (max 12, those with most trades)
  const curveBots = [...activeBots]
    .sort((a, b) => b.stats.total_trades - a.stats.total_trades)
    .slice(0, 12)
    .map((b, i) => ({
      slug:  b.slug,
      name:  b.name,
      color: BOT_COLORS[i % BOT_COLORS.length],
      data:  b.perf_daily.map(p => ({ date: p.date, capital: p.capital })),
    }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-muted mt-1">
            Réplique du dashboard interne APEX — données synchronisées depuis le VPS toutes les heures.
          </p>
        </div>
        <div className="text-right text-xs text-muted font-mono">
          <p>{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
          <p className="opacity-60">ISR 1h</p>
        </div>
      </div>

      {/* MI Banner — live (client) */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-3">Intelligence de marché</h2>
        <MiBanner />
      </section>

      {/* Summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Bots actifs',      value: `${activeBots.length} / ${bots.length}` },
          { label: 'Trades totaux',    value: String(totalTrades) },
          { label: 'En positif',       value: `${inProfit} / ${activeBots.length}`, color: '#3fb950' },
          { label: 'P&L aujourd\'hui', value: fmtEur(todayPnl), color: todayPnl >= 0 ? '#3fb950' : '#ff4444' },
        ].map(s => (
          <div key={s.label} className="rounded border border-border p-4 text-center">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-bold font-mono" style={s.color ? { color: s.color } : {}}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Bot cards grid — like VPS dashboard */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">Bots paper trading</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeBots.map(bot => {
            const todayRow = bot.perf_daily.find(p => p.date === today)
            const pnlJour  = todayRow?.pnl_day ?? 0
            const total    = pnlEur(bot.stats.latest_capital)
            const pct      = pnlPct(bot.stats.latest_capital)

            return (
              <Link key={bot.id} href={`/strategies/${bot.slug}`} className="block group">
                <div className="rounded border border-border p-4 hover:border-muted/50 transition-colors bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate group-hover:text-positive transition-colors">
                        {bot.name}
                      </p>
                      <p className="text-[10px] text-muted">{bot.exchange} · {bot.timeframe}</p>
                    </div>
                    <StatusBadge status={bot.status} />
                  </div>

                  {/* Capital + P&L total */}
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-mono font-bold text-lg">€{bot.stats.latest_capital.toFixed(2)}</span>
                    <span className={`text-xs font-mono font-semibold ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {fmtPct(pct)}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div>
                      <p className="text-[9px] text-muted uppercase">Auj.</p>
                      <p className={`text-xs font-mono font-semibold ${pnlJour >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {fmtEur(pnlJour, 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted uppercase">WR</p>
                      <p className="text-xs font-mono">{(bot.stats.win_rate * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted uppercase">PF</p>
                      <p className={`text-xs font-mono ${bot.stats.profit_factor >= 1 ? 'text-positive' : 'text-negative'}`}>
                        {bot.stats.profit_factor.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted uppercase">Trades</p>
                      <p className="text-xs font-mono">{bot.stats.total_trades}</p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Bots sans trades */}
        {bots.length > activeBots.length && (
          <p className="text-xs text-muted mt-3 text-center">
            + {bots.length - activeBots.length} bots en attente de leur premier trade
          </p>
        )}
      </section>

      {/* Global equity curve */}
      {curveBots.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-muted">Courbes d&apos;équité — 30 jours</h2>
            <span className="text-[10px] text-muted">{curveBots.length} bots affichés</span>
          </div>
          <div className="rounded border border-border p-4 bg-card">
            <GlobalEquityCurve bots={curveBots} days={30} />
          </div>
        </section>
      )}

      {/* Recent trades — all bots */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">
          20 derniers trades — tous bots
        </h2>
        <div className="rounded border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-card border-b border-border">
              <tr className="text-muted text-[10px] uppercase tracking-widest">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Bot</th>
                <th className="px-4 py-2 text-left">Actif</th>
                <th className="px-4 py-2 text-center">Dir.</th>
                <th className="px-4 py-2 text-right">P&amp;L</th>
                <th className="px-4 py-2 text-left">Raison</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map(t => (
                <tr key={t.id} className="border-t border-border/50 hover:bg-card/40 transition-colors">
                  <td className="px-4 py-2 font-mono text-muted">
                    {new Date(t.closed_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                  </td>
                  <td className="px-4 py-2">
                    {t.bots ? (
                      <Link href={`/strategies/${t.bots.slug}`} className="hover:text-positive transition-colors">
                        {t.bots.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono">{t.asset}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      t.side === 'long' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                    }`}>
                      {t.side?.toUpperCase()}
                    </span>
                  </td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold ${t.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}€
                  </td>
                  <td className="px-4 py-2 text-muted">{t.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
