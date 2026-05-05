// src/components/EquityCurve.tsx
'use client'

import { PerfDaily } from '@/lib/types'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface Props {
  data: PerfDaily[]
  startCapital?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as PerfDaily
  const pnl = d.pnl_day
  return (
    <div className="bg-card border border-border rounded p-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="text-white font-mono">€{d.capital.toFixed(2)}</p>
      <p className={`font-mono ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
      </p>
    </div>
  )
}

export default function EquityCurve({ data, startCapital = 1000 }: Props) {
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
    <div className="w-full h-64">
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
    </div>
  )
}
