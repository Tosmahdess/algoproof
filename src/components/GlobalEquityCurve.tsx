'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface BotCurve {
  slug:  string
  name:  string
  color: string
  data:  { date: string; capital: number }[]
}

interface Props {
  bots: BotCurve[]
  days?: number
}

// Build a unified date-indexed dataset for multi-bot chart
function buildChartData(bots: BotCurve[], days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // Collect all dates
  const dateSet = new Set<string>()
  bots.forEach(b => b.data.forEach(d => { if (d.date >= cutoffStr) dateSet.add(d.date) }))
  const dates = Array.from(dateSet).sort()

  return dates.map(date => {
    const row: Record<string, string | number> = { date }
    bots.forEach(b => {
      const point = b.data.find(d => d.date === date)
      row[b.slug] = point?.capital ?? undefined as unknown as number
    })
    return row
  })
}

export default function GlobalEquityCurve({ bots, days = 30 }: Props) {
  if (!bots.length) return null

  const chartData = buildChartData(bots, days)

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: '#888', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={d => d.slice(5)}
          />
          <YAxis
            tick={{ fill: '#888', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `€${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #1e1e1e', fontSize: 11 }}
            formatter={(v: any, name: any) => {
              const bot = bots.find(b => b.slug === String(name))
              return [`€${Number(v).toFixed(2)}`, bot?.name ?? String(name)]
            }}
          />
          <Legend
            formatter={(slug) => bots.find(b => b.slug === slug)?.name ?? slug}
            wrapperStyle={{ fontSize: 10 }}
          />
          {bots.map(b => (
            <Line
              key={b.slug}
              type="monotone"
              dataKey={b.slug}
              stroke={b.color}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
