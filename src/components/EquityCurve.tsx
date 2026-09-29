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
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as PerfDaily
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

export default function EquityCurve({ data, startCapital = 1000, segments, freezeDate }: Props) {
  if (segments && freezeDate) {
    return <SegmentedCurve rows={segments} startCapital={startCapital} freezeDate={freezeDate} />
  }
  const formatted = data.map(d => ({
    ...d,
    // Site date format (« 29 avr. »), not the ISO « 04-29 » (counter-audit S7).
    date: shortDate(d.date),
    capitalNum: Number(d.capital),
  }))

  if (formatted.length === 0) return null

  const min = Math.min(...formatted.map(d => d.capitalNum)) * 0.98
  const max = Math.max(...formatted.map(d => d.capitalNum)) * 1.02
  const isPositive = (formatted[formatted.length - 1]?.capitalNum ?? startCapital) >= startCapital

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
          <Area type="monotone" dataKey="paper" stroke={simColour} strokeWidth={2}
            fill="url(#equity-sim)" connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
