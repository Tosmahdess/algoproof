// src/components/EquityCurve.tsx
'use client'

import { PerfDaily } from '@/lib/types'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import ChartFrame from '@/components/ChartFrame'
import { fmtEur, frNumber } from '@/lib/display'
import { shortDate } from '@/lib/format-date'
import type { JoinedRow } from '@/lib/backtest-segment'

// Backtest segment colour (pilot 2026-09-25): neutral, dashed, never the simulation's green/red.
const BACKTEST_STROKE = '#94a3b8'

interface Props {
  data: PerfDaily[]
  startCapital?: number
  /** Backtest up to the freeze + simulation after it, as built by buildTimeline. */
  segments?: JoinedRow[] | null
  freezeDate?: string
  /** Start the axis on this day (paper bots without a segment, D074): days before the
   *  first data point are drawn as nothing, never as a flat line that reads as data. */
  axisFrom?: string
}

/** Empty days from `from` to the day before the first data point (capital null). */
export function padFrom(data: PerfDaily[], from: string): (Omit<PerfDaily, 'capital'> & { capital: number | null })[] {
  if (data.length === 0 || data[0].date <= from) return data
  const pad: (Omit<PerfDaily, 'capital'> & { capital: number | null })[] = []
  for (let d = from; d < data[0].date; d = nextDay(d)) {
    pad.push({ id: d, bot_id: data[0].bot_id, date: d, capital: null, pnl_day: 0,
      win_rate: null, profit_factor: null })
  }
  return [...pad, ...data]
}

function nextDay(isoDate: string): string {
  const t = new Date(`${isoDate}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as PerfDaily
  if (d.capital === null) return null      // a padded day before the bot existed
  const pnl = d.pnl_day
  return (
    <div className="bg-card border border-border rounded p-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="text-foreground font-mono">{frNumber(Number(d.capital), 2)} €</p>
      <p className={`font-mono ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
        {fmtEur(pnl)}
      </p>
    </div>
  )
}

export default function EquityCurve({ data, startCapital = 1000, segments, freezeDate, axisFrom }: Props) {
  if (segments && freezeDate) {
    return <SegmentedCurve rows={segments} startCapital={startCapital} freezeDate={freezeDate} />
  }
  const series = axisFrom ? padFrom(data, axisFrom) : data
  const formatted = series.map(d => ({
    ...d,
    // Site date format (« 29 avr. »), not the ISO « 04-29 » (counter-audit S7).
    date: shortDate(`${d.date}T12:00:00Z`),
    capitalNum: d.capital === null ? null : Number(d.capital),
  }))
  const values = formatted.map(d => d.capitalNum).filter((v): v is number => v !== null)

  if (formatted.length === 0) return null

  if (values.length === 0) return null
  const min = Math.min(...values) * 0.98
  const max = Math.max(...values) * 1.02
  const isPositive = (values[values.length - 1] ?? startCapital) >= startCapital

  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={isPositive ? '#4ade80' : '#f87171'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#4ade80' : '#f87171'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[min, max]} tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={v => `${frNumber(v, 0)} €`} width={64} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={startCapital} stroke="#444" strokeDasharray="4 2" />
          <Area
            type="monotone"
            dataKey="capitalNum"
            stroke={isPositive ? '#4ade80' : '#f87171'}
            strokeWidth={2}
            fill="url(#equity)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/** The simulation's colour follows ITS result since the freeze, not the curve's level: it
 *  continues from the backtest's end, so comparing it with the starting capital would
 *  paint a losing simulation green whenever the backtest had gained. */
export function paperIsUp(rows: JoinedRow[], freezeDate: string): boolean {
  const atStart = rows.find(r => r.date === freezeDate)?.paper
  const last = [...rows].reverse().find(r => r.paper !== null)?.paper
  if (atStart == null || last == null) return true
  return last >= atStart
}

function SegmentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as JoinedRow
  const isSim = row.paper !== null && row.backtest === null
  const value = isSim ? row.paper : (row.backtest ?? row.paper)
  return (
    <div className="bg-card border border-border rounded p-2 text-xs">
      <p className="text-muted mb-1">{label} · {isSim ? 'simulation' : 'backtest'}</p>
      <p className="text-foreground font-mono">{frNumber(Number(value), 2)} €</p>
    </div>
  )
}

function SegmentedCurve({ rows, startCapital, freezeDate }: {
  rows: JoinedRow[]; startCapital: number; freezeDate: string
}) {
  const formatted = rows.map(r => ({ ...r, date: shortDate(`${r.date}T12:00:00Z`) }))
  const values = rows.flatMap(r => [r.backtest, r.paper]).filter((v): v is number => v !== null)
  const min = Math.min(...values) * 0.98
  const max = Math.max(...values) * 1.02
  const simColour = paperIsUp(rows, freezeDate) ? '#4ade80' : '#f87171'
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="equity-sim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={simColour} stopOpacity={0.3} />
              <stop offset="95%" stopColor={simColour} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[min, max]} tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={v => `${frNumber(v, 0)} €`} width={64} />
          <Tooltip content={<SegmentTooltip />} />
          <ReferenceLine y={startCapital} stroke="#444" strokeDasharray="4 2" />
          <Area type="monotone" dataKey="backtest" stroke={BACKTEST_STROKE} strokeWidth={2}
            strokeDasharray="5 4" fill="none" connectNulls={false} isAnimationActive={false} />
          {/* No draw-in animation, like the backtest line: a screenshot or a slow device
              caught mid-animation showed the backtest alone (29/09). */}
          <Area type="monotone" dataKey="paper" stroke={simColour} strokeWidth={2}
            fill="url(#equity-sim)" connectNulls={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
