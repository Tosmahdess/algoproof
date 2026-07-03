'use client'

import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { MiSnapshot } from '@/lib/types'

interface Props {
  data: MiSnapshot[]
}

// The 'institutional' pillar (DVOL/ETF flows) had its scoring retired server-side on
// 2026-06-26 — institutional_score is always null since. Only the 4 live pillars remain.
const PILLAR_COLORS = {
  composite_score:     '#ffffff',
  sentiment_score:     '#ff6b35',
  derivatives_score:   '#d2a8ff',
  news_score:          '#3fb950',
  macro_score:         '#40c4ff',
}

const REGIME_BG: Record<string, string> = {
  GREEN:  '#3fb95018',
  YELLOW: '#f6c90e18',
  ORANGE: '#ff6b3518',
  RED:    '#ff444418',
}

function fmt(snap: MiSnapshot) {
  const d = new Date(snap.snapshot_at)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}h`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as any
  return (
    <div className="bg-[#161b22] border border-border rounded p-3 text-xs space-y-1 min-w-[180px]">
      <p className="text-muted font-mono mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {payload.map((p: any) => p.value != null && (
          <div key={p.dataKey} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            <span className="text-muted text-[10px]">{p.name}</span>
            <span className="font-mono ml-auto" style={{ color: p.color }}>
              {(p.value as number).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      {d?.sentiment_regime && (
        <p className="text-muted text-[10px] pt-1 border-t border-border">
          Régime sentiment : {d.sentiment_regime}
        </p>
      )}
      {d?.market_bias && (
        <p className="text-muted text-[10px]">Biais : {d.market_bias}</p>
      )}
    </div>
  )
}

export default function MiHistoryChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted">
        Pas encore de données historiques.
      </div>
    )
  }

  const chartData = data.map(snap => ({
    ...snap,
    label: fmt(snap),
  }))

  // Show every Nth label to avoid crowding
  const tickInterval = Math.max(1, Math.floor(data.length / 12))

  return (
    <div className="space-y-6">

      {/* Score global + piliers */}
      <div>
        <p className="text-xs text-muted mb-3">Score global et piliers (EMA 24h)</p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#8b949e' }}
              interval={tickInterval}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-50, 50]}
              tick={{ fontSize: 9, fill: '#8b949e' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#30363d" strokeDasharray="3 3" />
            <ReferenceLine y={30}  stroke="#f6c90e22" strokeWidth={1} />
            <ReferenceLine y={-30} stroke="#f6c90e22" strokeWidth={1} />

            {/* Pillar lines (thin, semi-transparent) */}
            <Line dataKey="sentiment_score"   name="Sentiment"      stroke={PILLAR_COLORS.sentiment_score}   strokeWidth={1} dot={false} strokeOpacity={0.6} />
            <Line dataKey="derivatives_score" name="Dérivés"        stroke={PILLAR_COLORS.derivatives_score} strokeWidth={1} dot={false} strokeOpacity={0.6} />
            <Line dataKey="news_score"        name="News"           stroke={PILLAR_COLORS.news_score}        strokeWidth={1} dot={false} strokeOpacity={0.6} />
            <Line dataKey="macro_score"       name="Macro"          stroke={PILLAR_COLORS.macro_score}       strokeWidth={1} dot={false} strokeOpacity={0.6} />
            {/* Global score — bold on top */}
            <Line dataKey="composite_score" name="Global" stroke="#ffffff" strokeWidth={2} dot={false} />

            <Legend
              wrapperStyle={{ fontSize: '9px', color: '#8b949e', paddingTop: '8px' }}
              iconSize={6}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pilier weights note */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
        {[
          { label: 'Sentiment', weight: '30%', color: PILLAR_COLORS.sentiment_score },
          { label: 'Dérivés',   weight: '30%', color: PILLAR_COLORS.derivatives_score },
          { label: 'News',      weight: '20%', color: PILLAR_COLORS.news_score },
          { label: 'Macro',     weight: '20%', color: PILLAR_COLORS.macro_score },
        ].map(p => (
          <div key={p.label} className="rounded border border-border py-1.5 px-1">
            <p style={{ color: p.color }} className="font-semibold">{p.weight}</p>
            <p className="text-muted mt-0.5 text-[9px]">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
