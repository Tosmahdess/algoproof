'use client'

import { useState } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { MiSnapshot } from '@/lib/types'
import { sentimentFr, biasFr } from '@/lib/regime-labels'

interface Props {
  data: MiSnapshot[]
}

// The 'institutional' pillar (DVOL/ETF flows) had its scoring retired server-side on
// 2026-06-26 — institutional_score is always null since. Only the 4 live pillars remain.
// Same 4-way categorical palette as MiRegimeBadge.PILLARS — see its comment
// (sentiment=severe, derivatives=accent, news=positive, macro=pillar-macro).
const PILLAR_COLORS = {
  composite_score:     '#ffffff',
  sentiment_score:     'var(--severe)',
  derivatives_score:   'var(--accent)',
  news_score:          'var(--positive)',
  macro_score:         'var(--pillar-macro)',
}

// rgba mirrors of the positive/warning/severe/negative tokens: a CSS variable
// can't carry a hex alpha suffix (`var(--positive)18` isn't valid CSS), so the
// tinted regime background keeps the token's RGB spelled out at ~9% opacity.
const REGIME_BG: Record<string, string> = {
  GREEN:  'rgba(74,222,128,0.09)',
  YELLOW: 'rgba(245,158,11,0.09)',
  ORANGE: 'rgba(255,107,53,0.09)',
  RED:    'rgba(248,113,113,0.09)',
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
      <p className="text-muted tabular-nums mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {payload.map((p: any) => p.value != null && (
          <div key={p.dataKey} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            <span className="text-muted text-xs">{p.name}</span>
            <span className="tabular-nums ml-auto" style={{ color: p.color }}>
              {(p.value as number).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      {d?.sentiment_regime && (
        <p className="text-muted text-xs pt-1 border-t border-border">
          Régime sentiment : {sentimentFr(d.sentiment_regime)}
        </p>
      )}
      {d?.market_bias && (
        <p className="text-muted text-xs">Biais : {biasFr(d.market_bias)}</p>
      )}
    </div>
  )
}

export default function MiHistoryChart({ data }: Props) {
  // The legend isolates a series (counter-audit 2026-09-26, item 23): five lines on one
  // small chart are hard to read, and the legend was passive. A click hides or shows a
  // series; the data and the weights are unchanged.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const toggle = (key: string) =>
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

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
  const tickInterval = Math.max(1, Math.floor(data.length / 6))

  return (
    <div className="space-y-6">

      {/* Score global + piliers */}
      <div>
        <p className="text-xs text-muted mb-3">Score global et piliers (EMA 24h). Clique sur un nom pour masquer ou afficher sa courbe.</p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: 'var(--muted)' }}
              interval={tickInterval}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-50, 50]}
              tick={{ fontSize: 12, fill: 'var(--muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#30363d" strokeDasharray="3 3" />
            <ReferenceLine y={30}  stroke="rgba(245,158,11,0.13)" strokeWidth={1} />
            <ReferenceLine y={-30} stroke="rgba(245,158,11,0.13)" strokeWidth={1} />

            {/* Pillar lines (thin, semi-transparent) */}
            <Line hide={hidden.has('sentiment_score')} dataKey="sentiment_score"   name="Sentiment"      stroke={PILLAR_COLORS.sentiment_score}   strokeWidth={1} dot={false} strokeOpacity={0.6} />
            <Line hide={hidden.has('derivatives_score')} dataKey="derivatives_score" name="Dérivés"        stroke={PILLAR_COLORS.derivatives_score} strokeWidth={1} dot={false} strokeOpacity={0.6} />
            <Line hide={hidden.has('news_score')} dataKey="news_score"        name="News"           stroke={PILLAR_COLORS.news_score}        strokeWidth={1} dot={false} strokeOpacity={0.6} />
            <Line hide={hidden.has('macro_score')} dataKey="macro_score"       name="Macro"          stroke={PILLAR_COLORS.macro_score}       strokeWidth={1} dot={false} strokeOpacity={0.6} />
            {/* Global score — bold on top */}
            <Line hide={hidden.has('composite_score')} dataKey="composite_score" name="Global" stroke="#ffffff" strokeWidth={2} dot={false} />

            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'var(--muted)', paddingTop: '8px', cursor: 'pointer' }}
              iconSize={6}
              onClick={entry => { if (typeof entry.dataKey === 'string') toggle(entry.dataKey) }}
              formatter={(value, entry) => (
                <span style={{ opacity: typeof entry.dataKey === 'string' && hidden.has(entry.dataKey) ? 0.35 : 1 }}>{value}</span>
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pilier weights note */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs tabular-nums">
        {[
          { label: 'Sentiment', weight: '30%', color: PILLAR_COLORS.sentiment_score },
          { label: 'Dérivés',   weight: '40%', color: PILLAR_COLORS.derivatives_score },
          { label: 'News',      weight: '5%', color: PILLAR_COLORS.news_score },
          { label: 'Macro',     weight: '25%', color: PILLAR_COLORS.macro_score },
        ].map(p => (
          <div key={p.label} className="rounded-md border border-border py-1.5 px-1">
            <p style={{ color: p.color }} className="font-semibold">{p.weight}</p>
            <p className="text-muted mt-0.5 text-xs">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
