'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { BotWithStats, BotStats, TradeWithBot } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import MiBanner from '@/components/MiBanner'
import GlobalEquityCurve from '@/components/GlobalEquityCurve'
import DirectionFilterPills from '@/components/DirectionFilterPills'
import PromotedBadge from '@/components/PromotedBadge'
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'
import { computeBotStats, countByDirection, type DirectionFilter } from '@/lib/stats'
import { splitByTier, visibleBots, headlineCohort } from '@/lib/tiers'

type SortCol = 'trades' | 'win_rate' | 'profit_factor' | 'max_drawdown' | 'pnl'
type SortDir = 'asc' | 'desc'

interface Props {
  bots: BotWithStats[]
  recentTrades: TradeWithBot[]
}

interface BotView extends BotWithStats {
  stats: BotStats
  breakdown: { total: number; long: number; short: number }
}

const FAMILY_LABEL: Record<string, string> = {
  trend: 'Suivi de tendance', breakout: 'Cassure',
  'mean-reversion': 'Retour à la moyenne', carry: 'Portage',
}
const FAMILY_COLOR: Record<string, string> = {
  trend: '#ff6b35', breakout: '#3fb950',
  'mean-reversion': '#7c3aed', carry: '#f6c90e',
}
const BOT_COLORS = [
  '#3fb950','#58a6ff','#ff6b35','#d2a8ff','#f6c90e',
  '#40c4ff','#ff4444','#4ade80','#fb923c','#a78bfa',
]

function getValue(bot: BotView, col: SortCol): number {
  switch (col) {
    case 'trades':        return bot.stats.total_trades
    case 'win_rate':      return bot.stats.win_rate
    case 'profit_factor': return bot.stats.profit_factor
    case 'max_drawdown':  return bot.stats.max_drawdown
    case 'pnl':           return bot.stats.latest_capital - bot.start_capital
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

function CohortTable({
  list, direction, sortCol, sortDir, onSort,
}: {
  list: BotView[]; direction: DirectionFilter
  sortCol: SortCol; sortDir: SortDir; onSort: (col: SortCol) => void
}) {
  if (list.length === 0) {
    return <p className="text-xs text-muted px-1 py-3">Aucun bot dans cette cohorte pour l&apos;instant.</p>
  }
  return (
    <>
      {/* Mobile */}
      <div className="md:hidden rounded border border-border overflow-hidden divide-y divide-border">
        {list.map((bot, i) => {
          const hasData = bot.stats.total_trades > 0
          const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
          const pct = pnlPct(bot.stats.latest_capital, bot.start_capital)
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
                  {hasData && (
                    <span className="text-[10px] text-muted">
                      {bot.stats.total_trades} trades
                      {direction === 'all' && bot.breakdown.total > 0 && (
                        <span className="ml-1 opacity-70">
                          ({bot.breakdown.long}L · {bot.breakdown.short}S)
                        </span>
                      )}
                    </span>
                  )}
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
                <SortBtn col="trades" active={sortCol} dir={sortDir} onSort={onSort}>Trades</SortBtn>
              </th>
              <th className="px-4 py-3 text-right">
                <SortBtn col="win_rate" active={sortCol} dir={sortDir} onSort={onSort}>T. gain</SortBtn>
              </th>
              <th className="px-4 py-3 text-right">
                <SortBtn col="profit_factor" active={sortCol} dir={sortDir} onSort={onSort}>F. profit</SortBtn>
              </th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">
                <SortBtn col="max_drawdown" active={sortCol} dir={sortDir} onSort={onSort}>Drawdown</SortBtn>
              </th>
              <th className="px-4 py-3 text-right font-bold">
                <SortBtn col="pnl" active={sortCol} dir={sortDir} onSort={onSort}>P&amp;L (€)</SortBtn>
              </th>
              <th className="px-4 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {list.map(bot => {
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
                    {hasData ? (
                      <>
                        {bot.stats.total_trades}
                        {direction === 'all' && bot.breakdown.total > 0 && (
                          <span className="block text-[10px] text-muted">
                            {bot.breakdown.long}L · {bot.breakdown.short}S
                          </span>
                        )}
                      </>
                    ) : <span className="text-muted">—</span>}
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
                        <span className={`font-mono font-bold ${pnlEur(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {fmtEur(pnlEur(bot.stats.latest_capital, bot.start_capital))}
                        </span>
                        <span className={`block text-[10px] font-mono ${pnlPct(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {fmtPct(pnlPct(bot.stats.latest_capital, bot.start_capital))}
                        </span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <StatusBadge status={bot.status} />
                      <PromotedBadge promoted={bot.promoted} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function OverviewClient({ bots, recentTrades }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>('pnl')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [direction, setDirection] = useState<DirectionFilter>('all')

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // Recompute each bot's stats according to the active direction filter.
  // Breakdown (long/short counts) is always derived from the full trade list.
  const views: BotView[] = useMemo(() => bots.map(b => ({
    ...b,
    stats: direction === 'all'
      ? b.stats
      : computeBotStats(b.all_trades, b.perf_daily, direction, b.start_capital),
    breakdown: countByDirection(b.all_trades),
  })), [bots, direction])

  // Global pill counts: total long/short trades across the fleet.
  const fleetCounts = useMemo(() => {
    let long = 0, short = 0
    for (const b of bots) {
      for (const t of b.all_trades) {
        if (t.side === 'long') long++; else short++
      }
    }
    return { long, short }
  }, [bots])

  const sorted = [...views].sort((a, b) => {
    const va = getValue(a, sortCol)
    const vb = getValue(b, sortCol)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const today        = new Date().toISOString().slice(0, 10)
  const botsWithData = visibleBots(views)                   // toutes cohortes visibles (courbes)
  const headlineViews = visibleBots(headlineCohort(views))  // Live + Promu (track record)
  const labViews      = visibleBots(splitByTier(views).lab) // Laboratoire R&D

  const winners      = headlineViews.filter(b => b.stats.latest_capital > b.start_capital).length
  const todayPnl     = direction === 'all'
    ? headlineViews.reduce((s, b) => {
        const row = b.perf_daily.find(p => p.date === today)
        return s + (row?.pnl_day ?? 0)
      }, 0)
    : headlineViews.reduce((s, b) =>
        s + b.all_trades
              .filter(t => t.side === direction && t.closed_at.slice(0, 10) === today)
              .reduce((acc, t) => acc + t.pnl, 0),
      0)
  const allTimePnl   = headlineViews.reduce((s, b) => s + (b.stats.latest_capital - b.start_capital), 0)
  const labPnl       = labViews.reduce((s, b) => s + (b.stats.latest_capital - b.start_capital), 0)
  const filteredRecentTrades = direction === 'all'
    ? recentTrades
    : recentTrades.filter(t => t.side === direction)

  const headlineSlugs  = new Set(headlineViews.map(b => b.slug))
  const sortedHeadline = sorted.filter(b => headlineSlugs.has(b.slug))
  const sortedLab      = sorted.filter(b => !headlineSlugs.has(b.slug) && b.stats.total_trades > 0)

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

      {/* Direction filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted">Filtrer par direction</h2>
        <DirectionFilterPills
          value={direction}
          onChange={setDirection}
          longCount={fleetCounts.long}
          shortCount={fleetCounts.short}
        />
      </div>

      {/* Summary counters — track record (Live + Promu) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Bots track record', value: `${headlineViews.length}`,                 testid: 'headline-count' },
          { label: 'En positif',        value: `${winners} / ${headlineViews.length}`,    color: '#3fb950' },
          { label: "P&L aujourd'hui",   value: fmtEur(todayPnl),   color: todayPnl   >= 0 ? '#3fb950' : '#ff4444', testid: 'headline-today' },
          { label: 'P&L all-time',      value: fmtEur(allTimePnl), color: allTimePnl >= 0 ? '#3fb950' : '#ff4444', testid: 'headline-pnl' },
          { label: 'P&L labo R&D',      value: fmtEur(labPnl),     color: labPnl     >= 0 ? '#3fb950' : '#ff4444', testid: 'lab-pnl' },
        ].map(s => (
          <div key={s.label} className="rounded border border-border p-4 text-center">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
            <p data-testid={s.testid} className="text-xl font-bold font-mono" style={s.color ? { color: s.color } : {}}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tableau triable */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">
          Track record — bots live &amp; promus
        </h2>
        <p className="text-xs text-muted mb-4">Les bots en argent réel et les paper que j&apos;ai promus après validation. C&apos;est le périmètre du chiffre mis en avant.</p>
        <CohortTable list={sortedHeadline} direction={direction} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />

        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-2 mt-10">
          Laboratoire — expériences R&amp;D
        </h2>
        <p className="text-xs text-muted mb-4">Tout le reste : des paper en recherche, perdants inclus. Hors track record, mais rien n&apos;est caché.</p>
        <CohortTable list={sortedLab} direction={direction} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />

        <p className="text-center text-xs text-muted mt-3">
          Cliquer sur un en-tête de colonne pour trier · P&amp;L sur trades fermés · Capital initial par bot (1&nbsp;000€ par défaut)
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
          {direction === 'all' ? '20 derniers trades — tous bots' : `Derniers trades ${direction === 'long' ? 'long' : 'short'} — tous bots`}
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
              {filteredRecentTrades.map(t => (
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
