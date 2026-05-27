'use client'

import { useMemo, useState } from 'react'

interface TradeRow {
  pnl: number
  side: string
  closed_at: string
  bot_id: string
}

type Direction = 'all' | 'long' | 'short'
type Family = 'all' | 'trend' | 'breakout' | 'mean-reversion' | 'carry'
type Period = '7d' | '30d' | '90d' | 'all'

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
]

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
  { value: '90d', label: '90 j' },
  { value: 'all', label: 'Tout' },
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
  if (losses === 0) return wins > 0 ? 99.9 : 0
  return Math.round((wins / Math.abs(losses)) * 100) / 100
}

export function PerformanceClient({
  trades,
  botFamilyMap,
}: {
  trades: TradeRow[]
  botFamilyMap: Record<string, string>
}) {
  const [direction, setDirection] = useState<Direction>('all')
  const [family, setFamily] = useState<Family>('all')
  const [period, setPeriod] = useState<Period>('all')

  const { rows, totalTrades, totalPnl, totalWr, totalPf } = useMemo(() => {
    let filtered = trades

    if (direction !== 'all') {
      filtered = filtered.filter(t => t.side === direction)
    }
    if (family !== 'all') {
      filtered = filtered.filter(t => botFamilyMap[t.bot_id] === family)
    }
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      const cutoffIso = cutoff.toISOString()
      filtered = filtered.filter(t => t.closed_at >= cutoffIso)
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
  }, [trades, botFamilyMap, direction, family, period])

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Performance</h1>
      <p className="text-muted text-sm mb-8">P&L journalier de la flotte — données réelles, mises à jour toutes les heures.</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-6 mb-8">
        <FilterGroup label="Direction" options={DIRECTION_OPTIONS} value={direction} onChange={v => setDirection(v as Direction)} />
        <FilterGroup label="Famille" options={FAMILY_OPTIONS} value={family} onChange={v => setFamily(v as Family)} />
        <FilterGroup label="Période" options={PERIOD_OPTIONS} value={period} onChange={v => setPeriod(v as Period)} />
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
            {/* Header */}
            <div className="grid bg-card border-b border-border" style={{ gridTemplateColumns: '1.2fr 0.7fr 0.7fr 0.7fr 1fr 1fr' }}>
              {['Date', 'Trades', 'WR', 'PF', 'P&L', 'Cumul'].map((h, i) => (
                <div key={h} className={`px-3 sm:px-4 py-2.5 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-muted font-semibold whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/60">
              {rows.length === 0 && (
                <div className="px-4 py-8 text-center text-muted text-sm">
                  Aucun trade sur cette période.
                </div>
              )}
              {rows.map((r) => (
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

            {/* Summary row */}
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
  label,
  options,
  value,
  onChange,
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
