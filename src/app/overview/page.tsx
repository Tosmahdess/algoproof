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
  title: "Vue d'ensemble — AlgoProof",
  description: "Tableau de bord complet : régime MI, tous les bots classés par performance, courbe globale et trades récents.",
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

  const today       = new Date().toISOString().slice(0, 10)
  const sorted      = [...bots].sort((a, b) => b.stats.latest_capital - a.stats.latest_capital)
  const botsWithData = bots.filter(b => b.stats.total_trades > 0)
  const totalTrades = bots.reduce((s, b) => s + b.stats.total_trades, 0)
  const winners     = botsWithData.filter(b => b.stats.latest_capital > 1000).length
  const avgPnl      = botsWithData.length > 0
    ? botsWithData.reduce((s, b) => s + pnlEur(b.stats.latest_capital), 0) / botsWithData.length
    : 0

  const todayPnl = bots.reduce((s, b) => {
    const row = b.perf_daily.find(p => p.date === today)
    return s + (row?.pnl_day ?? 0)
  }, 0)

  // Top bots for equity curve (max 12, most trades)
  const curveBots = [...botsWithData]
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
            Dashboard complet — données synchronisées depuis le VPS toutes les heures.
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
          { label: 'Bots actifs',    value: `${bots.length}` },
          { label: 'Trades fermés',  value: `${totalTrades}` },
          { label: 'En positif',     value: `${winners} / ${botsWithData.length}`, color: '#3fb950' },
          { label: "P&L aujourd'hui", value: fmtEur(todayPnl), color: todayPnl >= 0 ? '#3fb950' : '#ff4444' },
        ].map(s => (
          <div key={s.label} className="rounded border border-border p-4 text-center">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-bold font-mono" style={s.color ? { color: s.color } : {}}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tableau comparatif — tous les bots */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">
          Tous les bots — classés par performance
        </h2>
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
                  <tr key={bot.id} className="border-b border-border/50 hover:bg-card/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/strategies/${bot.slug}`} className="font-medium hover:text-positive transition-colors">
                        {bot.name}
                      </Link>
                      <p className="text-muted text-[10px] mt-0.5">{bot.timeframe}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: FAMILY_COLOR[bot.family ?? ''] ?? '#888' }}>
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
        <p className="text-center text-xs text-muted mt-3">
          P&amp;L calculé sur les trades fermés depuis le démarrage · Capital initial 1&nbsp;000€ par bot
        </p>
      </section>

      {/* Courbes d'équité globale */}
      {curveBots.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-muted">Courbes d&apos;équité — 30 jours</h2>
            <span className="text-[10px] text-muted">{curveBots.length} bots les plus actifs</span>
          </div>
          <div className="rounded border border-border p-4 bg-card">
            <GlobalEquityCurve bots={curveBots} days={30} />
          </div>
        </section>
      )}

      {/* 20 derniers trades — tous bots */}
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
