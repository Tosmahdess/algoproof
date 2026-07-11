'use client'

import { useMemo, useState } from 'react'
import AssetFilterSelect from '@/components/AssetFilterSelect'
import { assetOptionsFromTrades, toBaseAsset } from '@/lib/asset'

interface TradeRow {
  pnl: number
  side: string
  closed_at: string
  bot_id: string
  asset: string
}

type Direction = 'all' | 'long' | 'short'
type Family = 'all' | 'trend' | 'breakout' | 'mean-reversion' | 'carry' | 'market-neutral'

interface DayRow {
  date: string
  dateFr: string
  trades: number
  winners: number
  wr: number
  pf: number
  pnl: number
  cumul: number
}

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'long', label: 'Long' },
  { value: 'short', label: 'Short' },
]

const FAMILY_OPTIONS: { value: Family; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'trend', label: 'Tendance' },
  { value: 'breakout', label: 'Cassure' },
  { value: 'mean-reversion', label: 'Retour moyenne' },
  { value: 'carry', label: 'Portage' },
  { value: 'market-neutral', label: 'Marché neutre' },
]

function signColor(v: number): string {
  if (v > 0) return 'text-positive'
  if (v < 0) return 'text-negative'
  return 'text-foreground/70'
}

function fmtPnl(v: number): string {
  const s = v >= 0 ? '+' : ''
  return `${s}${v.toFixed(2)}`
}

function fmtPf(wins: number, losses: number): number {
  // Cap at 99.9: a near-zero-loss day produced a 4-digit ratio (5561.91 live)
  // that reads as a bug, not transparency.
  if (losses === 0) return wins > 0 ? 99.9 : 0
  return Math.min(Math.round((wins / Math.abs(losses)) * 100) / 100, 99.9)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function PerformanceClient({
  trades,
  botFamilyMap,
  botNameMap,
}: {
  trades: TradeRow[]
  botFamilyMap: Record<string, string>
  botNameMap: Record<string, string>
}) {
  const [direction, setDirection] = useState<Direction>('all')
  const [family, setFamily] = useState<Family>('all')
  const [asset, setAsset] = useState<string>('all')
  const assetOptions = useMemo(() => assetOptionsFromTrades(trades), [trades])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set())
  const [botsExpanded, setBotsExpanded] = useState(false)

  const allBotIds = useMemo(() => {
    const ids = [...new Set(trades.map(t => t.bot_id))]
    ids.sort((a, b) => (botNameMap[a] ?? '').localeCompare(botNameMap[b] ?? ''))
    return ids
  }, [trades, botNameMap])

  const toggleBot = (id: string) => {
    setSelectedBots(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllBots = () => setSelectedBots(new Set(allBotIds))
  const clearAllBots = () => setSelectedBots(new Set())

  const setPreset = (days: number | null) => {
    if (days === null) {
      setDateFrom('')
      setDateTo('')
    } else {
      setDateFrom(daysAgo(days))
      setDateTo(new Date().toISOString().slice(0, 10))
    }
  }

  const { rows, totalTrades, totalPnl, totalWr, totalPf } = useMemo(() => {
    let filtered = trades

    if (direction !== 'all') {
      filtered = filtered.filter(t => t.side === direction)
    }
    if (family !== 'all') {
      filtered = filtered.filter(t => botFamilyMap[t.bot_id] === family)
    }
    if (asset !== 'all') {
      filtered = filtered.filter(t => toBaseAsset(t.asset) === asset)
    }
    if (selectedBots.size > 0) {
      filtered = filtered.filter(t => selectedBots.has(t.bot_id))
    }
    if (dateFrom) {
      filtered = filtered.filter(t => (t.closed_at || '').slice(0, 10) >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(t => (t.closed_at || '').slice(0, 10) <= dateTo)
    }

    const byDay: Record<string, { trades: number; winners: number; pnlWin: number; pnlLoss: number; pnl: number }> = {}
    for (const t of filtered) {
      const day = (t.closed_at || '').slice(0, 10)
      if (!day) continue
      if (!byDay[day]) byDay[day] = { trades: 0, winners: 0, pnlWin: 0, pnlLoss: 0, pnl: 0 }
      byDay[day].trades++
      byDay[day].pnl += t.pnl || 0
      if ((t.pnl || 0) > 0) {
        byDay[day].winners++
        byDay[day].pnlWin += t.pnl
      } else {
        byDay[day].pnlLoss += t.pnl
      }
    }

    const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))

    let cumul = 0
    const dayRows: DayRow[] = sorted.map(([date, d]) => {
      cumul += d.pnl
      const parts = date.split('-')
      return {
        date,
        dateFr: `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`,
        trades: d.trades,
        winners: d.winners,
        wr: d.trades > 0 ? Math.round((d.winners / d.trades) * 1000) / 10 : 0,
        pf: fmtPf(d.pnlWin, d.pnlLoss),
        pnl: Math.round(d.pnl * 100) / 100,
        cumul: Math.round(cumul * 100) / 100,
      }
    })

    dayRows.reverse()

    const tTrades = filtered.length
    const tWinners = filtered.filter(t => (t.pnl || 0) > 0).length
    const tPnlWin = filtered.filter(t => (t.pnl || 0) > 0).reduce((s, t) => s + (t.pnl || 0), 0)
    const tPnlLoss = filtered.filter(t => (t.pnl || 0) <= 0).reduce((s, t) => s + (t.pnl || 0), 0)

    return {
      rows: dayRows,
      totalTrades: tTrades,
      totalPnl: Math.round(filtered.reduce((s, t) => s + (t.pnl || 0), 0) * 100) / 100,
      totalWr: tTrades > 0 ? Math.round((tWinners / tTrades) * 1000) / 10 : 0,
      totalPf: fmtPf(tPnlWin, tPnlLoss),
    }
  }, [trades, botFamilyMap, direction, family, asset, dateFrom, dateTo, selectedBots])

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Performance</h1>
      <p className="text-muted text-sm mb-8">P&L journalier de la flotte — données réelles, mises à jour toutes les heures.</p>

      {/* Filters row 1: direction + family */}
      <div className="flex flex-wrap gap-6 mb-4">
        <FilterGroup label="Direction" options={DIRECTION_OPTIONS} value={direction} onChange={v => setDirection(v as Direction)} />
        <FilterGroup label="Famille" options={FAMILY_OPTIONS} value={family} onChange={v => setFamily(v as Family)} />
        <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} />
      </div>

      {/* Filters row 2: date range */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted font-semibold mb-1.5">Période</div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-card border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <span className="text-muted text-xs">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-card border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-1.5 pb-0.5">
          {[
            { label: '7j', days: 7 },
            { label: '30j', days: 30 },
            { label: '90j', days: 90 },
            { label: 'Tout', days: null },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => setPreset(p.days)}
              className="px-2.5 py-1 text-xs rounded-md border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row 3: bots */}
      <div className="mb-8">
        <button
          onClick={() => setBotsExpanded(o => !o)}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-muted font-semibold hover:text-foreground transition-colors"
        >
          Bots {selectedBots.size > 0 && `(${selectedBots.size} sélectionnés)`}
          <svg className={`w-2.5 h-2.5 transition-transform ${botsExpanded ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="currentColor">
            <path d="M0 0l5 6 5-6H0z"/>
          </svg>
        </button>
        {botsExpanded && (
          <div className="mt-2 p-3 border border-border rounded-md bg-card/40 max-h-48 overflow-y-auto">
            <div className="flex gap-3 mb-2 border-b border-border/60 pb-2">
              <button onClick={selectAllBots} className="text-[10px] text-accent hover:underline">Tout cocher</button>
              <button onClick={clearAllBots} className="text-[10px] text-accent hover:underline">Tout décocher</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {allBotIds.map(id => (
                <label key={id} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-card/70 rounded px-1">
                  <input
                    type="checkbox"
                    checked={selectedBots.has(id)}
                    onChange={() => toggleBot(id)}
                    className="rounded border-border accent-accent"
                  />
                  <span className="text-xs text-foreground/80 truncate">{botNameMap[id] ?? id.slice(0, 8)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-x-2 gap-y-4 border-y border-border py-5 mb-8">
        <SummaryMetric label="P&L total" value={fmtPnl(totalPnl)} unit="USDT" sign={totalPnl} />
        <SummaryMetric label="Trades" value={String(totalTrades)} />
        <SummaryMetric label="Win rate" value={`${totalWr} %`} />
        <SummaryMetric label="Profit factor" value={String(totalPf)} sign={totalPf > 1 ? 1 : totalPf < 1 ? -1 : 0} />
      </div>

      {/* Table */}
      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="border border-border rounded-md overflow-hidden bg-card/40">
            <div className="grid bg-card border-b border-border" style={{ gridTemplateColumns: '1.2fr 0.7fr 0.7fr 0.7fr 1fr 1fr' }}>
              {['Date', 'Trades', 'WR', 'PF', 'P&L', 'Cumul'].map((h, i) => (
                <div key={h} className={`px-3 sm:px-4 py-2.5 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-muted font-semibold whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </div>
              ))}
            </div>

            <div className="divide-y divide-border/60">
              {rows.length === 0 && (
                <div className="px-4 py-8 text-center text-muted text-sm">Aucun trade sur cette période.</div>
              )}
              {rows.map(r => (
                <div key={r.date} className="grid hover:bg-card/70 transition-colors" style={{ gridTemplateColumns: '1.2fr 0.7fr 0.7fr 0.7fr 1fr 1fr' }}>
                  <div className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-foreground/90">{r.dateFr}</div>
                  <div className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums text-right text-foreground/90">{r.trades}</div>
                  <div className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums text-right text-foreground/90">{r.wr} %</div>
                  <div className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums text-right ${r.pf >= 1.5 ? 'text-positive' : r.pf < 1 ? 'text-negative' : 'text-foreground/90'}`}>{r.pf}</div>
                  <div className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums text-right font-medium ${signColor(r.pnl)}`}>{fmtPnl(r.pnl)}</div>
                  <div className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums text-right font-semibold ${signColor(r.cumul)}`}>{fmtPnl(r.cumul)}</div>
                </div>
              ))}
            </div>

            {rows.length > 0 && (
              <div className="grid bg-card border-t border-border" style={{ gridTemplateColumns: '1.2fr 0.7fr 0.7fr 0.7fr 1fr 1fr' }}>
                <div className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-foreground/90">Total</div>
                <div className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-mono tabular-nums text-right font-semibold text-foreground/90">{totalTrades}</div>
                <div className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-mono tabular-nums text-right font-semibold text-foreground/90">{totalWr} %</div>
                <div className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-mono tabular-nums text-right font-semibold ${totalPf >= 1.5 ? 'text-positive' : totalPf < 1 ? 'text-negative' : 'text-foreground/90'}`}>{totalPf}</div>
                <div className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-mono tabular-nums text-right font-bold ${signColor(totalPnl)}`}>{fmtPnl(totalPnl)}</div>
                <div className="px-3 sm:px-4 py-3"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted mt-4">Données synchronisées toutes les heures depuis le VPS. Tous les trades (paper + live) sont inclus.</p>
    </div>
  )
}

function FilterGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted font-semibold mb-1.5">{label}</div>
      <div className="flex gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              value === o.value
                ? 'bg-foreground/10 border-foreground/30 text-foreground'
                : 'border-border text-muted hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SummaryMetric({ label, value, unit, sign }: { label: string; value: string; unit?: string; sign?: number }) {
  const color = sign !== undefined ? signColor(sign) : 'text-foreground'
  return (
    <div className="flex-1 min-w-[120px] border-l-2 border-border pl-4 py-1">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold mb-1">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono tabular-nums text-2xl font-semibold ${color}`}>{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
    </div>
  )
}
