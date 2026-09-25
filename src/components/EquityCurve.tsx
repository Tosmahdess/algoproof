// src/components/EquityCurve.tsx
'use client'

import { PerfDaily } from '@/lib/types'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import ChartFrame from '@/components/ChartFrame'
import type { JoinedRow } from '@/lib/backtest-segment'

// Backtest segment colour (pilot 2026-09-25): neutral, dashed, never the paper's green/red.
const BACKTEST_STROKE = '#94a3b8'

interface Props {
  data: PerfDaily[]
  startCapital?: number
  /** Backtest before launch + paper after it, as built by joinSegments. */
  segments?: JoinedRow[] | null
  launchDate?: string
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as PerfDaily
  const pnl = d.pnl_day
  return (
    <div className="bg-card border border-border rounded p-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="text-foreground font-mono">€{d.capital.toFixed(2)}</p>
      <p className={`font-mono ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
      </p>
    </div>
  )
}

export default function EquityCurve({ data, startCapital = 1000, segments, launchDate }: Props) {
  if (segments && launchDate) {
    return <SegmentedCurve rows={segments} startCapital={startCapital} launchDate={launchDate} />
  }
  const formatted = data.map(d => ({
    ...d,
    date: d.date.slice(5),
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
          <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[min, max]} tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v.toFixed(0)}`} width={55} />
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

/** The paper's colour follows ITS result since launch, not the curve's level: the paper
 *  continues from the backtest's end, so comparing it with the starting capital would
 *  paint a losing paper green whenever the backtest had gained. */
export function paperIsUp(rows: JoinedRow[], launchDate: string): boolean {
  const atLaunch = rows.find(r => r.date === launchDate)?.paper
  const last = [...rows].reverse().find(r => r.paper !== null)?.paper
  if (atLaunch == null || last == null) return true
  return last >= atLaunch
}

function SegmentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as JoinedRow
  const isPaper = row.paper !== null && row.backtest === null
  const value = isPaper ? row.paper : (row.backtest ?? row.paper)
  return (
    <div className="bg-card border border-border rounded p-2 text-xs">
      <p className="text-muted mb-1">{label} · {isPaper ? 'simulation' : 'backtest'}</p>
      <p className="text-foreground font-mono">€{Number(value).toFixed(2)}</p>
    </div>
  )
}

function SegmentedCurve({ rows, startCapital, launchDate }: {
  rows: JoinedRow[]; startCapital: number; launchDate: string
}) {
  const formatted = rows.map(r => ({ ...r, date: r.date.slice(5) }))
  const values = rows.flatMap(r => [r.backtest, r.paper]).filter((v): v is number => v !== null)
  const min = Math.min(...values) * 0.98
  const max = Math.max(...values) * 1.02
  const paperColour = paperIsUp(rows, launchDate) ? '#4ade80' : '#f87171'
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="equity-paper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={paperColour} stopOpacity={0.3} />
              <stop offset="95%" stopColor={paperColour} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[min, max]} tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v.toFixed(0)}`} width={55} />
          <Tooltip content={<SegmentTooltip />} />
          <ReferenceLine y={startCapital} stroke="#444" strokeDasharray="4 2" />
          <ReferenceLine x={launchDate.slice(5)} stroke="#888"
            label={{ value: 'Lancement', position: 'insideTopRight', fill: '#888', fontSize: 10 }} />
          <Area type="monotone" dataKey="backtest" stroke={BACKTEST_STROKE} strokeWidth={2}
            strokeDasharray="5 4" fill="none" connectNulls={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="paper" stroke={paperColour} strokeWidth={2}
            fill="url(#equity-paper)" connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
