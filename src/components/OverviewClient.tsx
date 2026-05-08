'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { BotWithStats, TradeWithBot } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import MiBanner from '@/components/MiBanner'
import GlobalEquityCurve from '@/components/GlobalEquityCurve'
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'

type SortCol = 'trades' | 'win_rate' | 'profit_factor' | 'max_drawdown' | 'pnl'
type SortDir = 'asc' | 'desc'

interface Props {
  bots: BotWithStats[]
  recentTrades: TradeWithBot[]
}

const FAMILY_LABEL: Record<string, string> = {
  trend: 'Suivi de tendance', breakout: 'Cassure de niveaux',
  'multi-signal': 'Multi-signaux', 'multi-asset': 'Multi-actifs', leveraged: 'Avec levier',
}
const FAMILY_COLOR: Record<string, string> = {
  trend: '#ff6b35', breakout: '#3fb950', 'multi-signal': '#d29922',
  'multi-asset': '#40c4ff', leveraged: '#ff4444',
}
const BOT_COLORS = [
  '#3fb950','#58a6ff','#ff6b35','#d2a8ff','#f6c90e',
  '#40c4ff','#ff4444','#4ade80','#fb923c','#a78bfa',
]

function getValue(bot: BotWithStats, col: SortCol): number {
  switch (col) {
    case 'trades':        return bot.stats.total_trades
    case 'win_rate':      return bot.stats.win_rate
    case 'profit_factor': return bot.stats.profit_factor
    case 'max_drawdown':  return bot.stats.max_drawdown
    case 'pnl':           return bot.stats.latest_capital
  }
}

function SortBtn({
  col, active, dir, onSort, children,
}: {
  col: SortCol; active: SortCol; dir: SortDir
  onSort: (col: SortCol) => void; children: React.ReactNode
}) {
  const isActive = col === active
  return (
    <button
      onClick={() => onSort(col)}
      className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
    >
      {children}
      <span className={`text-[9px] ml-0.5 ${isActive ? 'text-[#ff6b35]' : 'text-muted/40'}`}>
        {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}

export default function OverviewClient({ bots, recentTrades }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>('pnl')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = [...bots].sort((a, b) => {
    const va = getValue(a, sortCol)
    const vb = getValue(b, sortCol)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const today        = new Date().toISOString().slice(0, 10)
  const botsWithData = bots.filter(b => b.stats.total_trades > 0)
  const winners      = botsWithData.filter(b => b.stats.latest_capital > 1000).length
  const todayPnl     = bots.reduce((s, b) => {
    const row = b.perf_daily.find(p => p.date === today)
    return s + (row?.pnl_day ?? 0)
  }, 0)

  const curveBots = [...botsWithData]
    .sort((a, b) => b.stats.total_trades - a.stats.total_trades)
    .slice(0, 12)
    .map((b, i) => ({
      slug: b.slug, name: b.name,
      color: BOT_COLORS[i % BOT_COLORS.length],
      data: b.perf_daily.map(p => ({ date: p.date, capital: p.capital })),
    }))

  return (
    <div className="space-y-10">
      {/* MI Banner */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-3">Intelligence de marché</h2>
        <MiBanner />
      </section>

      {/* Summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Bots paper trading', value: `${bots.length}` },
          { label: 'Avec trades',        value: `${botsWithData.length} / ${bots.length}` },
          { label: 'En positif',         value: `${winners} / ${botsWithData.length}`, color: '#3fb950' },
          { label: "P&L aujourd'hui",    value: fmtEur(todayPnl), color: todayPnl >= 0 ? '#3fb950' : '#ff4444' },
        ].map(s => (
          <div key={s.label} className="rounded border border-border p-4 text-center">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-bold font-mono" style={s.color ? { color: s.color } : {}}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tableau triable */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">
          Tous les bots — classés par performance
        </h2>

        {/* Mobile */}
        <div className="md:hidden rounded border border-border overflow-hidden divide-y divide-border">
          {sorted.map((bot, i) => {
            const hasData = bot.stats.total_trades > 0
            const eur = pnlEur(bot.stats.latest_capital)
            const pct = pnlPct(bot.stats.latest_capital)
            return (
              <Link key={bot.id} href={`/strategies/${bot.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-card/40 transition-colors">
                <span className="text-xs text-muted font-mono w-6 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{bot.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold uppercase"
                      style={{ color: FAMILY_COLOR[bot.family ?? ''] ?? '#888' }}>
                      {FAMILY_LABEL[bot.family ?? ''] ?? '—'}
                    </span>
                    {hasData && <span className="text-[10px] text-muted">{bot.stats.total_trades} trades</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {hasData ? (
                    <>
                      <p className={`text-sm font-bold font-mono ${eur >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(eur)}</p>
                      <p className={`text-[10px] font-mono ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pct)}</p>
                    </>
                  ) : <span className="text-xs text-muted">—</span>}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Desktop */}
        <div className="hidden md:block rounded border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-card">
              <tr className="text-muted text-[10px] uppercase tracking-widest border-b border-border">
                <th className="px-4 py-3 text-left">Stratégie</th>
                <th className="px-4 py-3 text-left">Famille</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Exchange</th>
                <th className="px-4 py-3 text-right">
                  <SortBtn col="trades" active={sortCol} dir={sortDir} onSort={handleSort}>Trades</SortBtn>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortBtn col="win_rate" active={sortCol} dir={sortDir} onSort={handleSort}>T. gain</SortBtn>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortBtn col="profit_factor" active={sortCol} dir={sortDir} onSort={handleSort}>F. profit</SortBtn>
                </th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">
                  <SortBtn col="max_drawdown" active={sortCol} dir={sortDir} onSort={handleSort}>Drawdown</SortBtn>
                </th>
                <th className="px-4 py-3 text-right font-bold">
                  <SortBtn col="pnl" active={sortCol} dir={sortDir} onSort={handleSort}>P&amp;L (€)</SortBtn>
                </th>
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
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">{bot.exchange}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {hasData ? bot.stats.total_trades : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {hasData ? `${(bot.stats.win_rate * 100).toFixed(1)}%` : <span className="text-muted">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${hasData ? (bot.stats.profit_factor >= 1 ? 'text-positive' : 'text-negative') : ''}`}>
                      {hasData ? bot.stats.profit_factor.toFixed(2) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-negative hidden lg:table-cell">
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
                      ) : <span className="text-muted">—</span>}
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
          Cliquer sur un en-tête de colonne pour trier · P&amp;L sur trades fermés · Capital initial 1&nbsp;000€ par bot
        </p>
      </section>

      {/* Courbes d'équité */}
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

      {/* 20 derniers trades */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">
          20 derniers trades — tous bots
        </h2>
        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-xs min-w-[480px]">
            <thead className="bg-card border-b border-border">
              <tr className="text-muted text-[10px] uppercase tracking-widest">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Bot</th>
                <th className="px-4 py-2 text-left hidden sm:table-cell">Actif</th>
                <th className="px-4 py-2 text-center">Dir.</th>
                <th className="px-4 py-2 text-right">P&amp;L</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">Raison</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map(t => (
                <tr key={t.id} className="border-t border-border/50 hover:bg-card/40 transition-colors">
                  <td className="px-4 py-2 font-mono text-muted">
                    {new Date(t.closed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-2">
                    {t.bots ? (
                      <Link href={`/strategies/${t.bots.slug}`} className="hover:text-positive transition-colors">
                        {t.bots.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono hidden sm:table-cell">{t.asset}</td>
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
                  <td className="px-4 py-2 text-muted hidden md:table-cell">{t.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
