'use client'

// The seven days of the market weather (/intelligence), refonte « Le registre des
// décisions », page Météo (2026-10-03).
//
// Audit 2026-10:
// - n° 9: five lines, four of them in status tokens (sentiment in `severe`, news in the
//   gain token, macro in a neon cyan the detector flagged). No four-hue palette outside
//   green and red holds apart under colour-blind vision on this surface (checked with the
//   dataviz validator), so the chart draws the global score in ink and ONE pillar at a
//   time beside it, in the link blue and dashed: two lines, told apart by colour AND
//   stroke, and named in the legend.
// - n° 45: the clickable legend was out of reach of the keyboard. The pillar is picked
//   with real buttons carrying aria-pressed.
// - n° 44: the X dates overlapped on a phone. One date per day, at its first reading,
//   and recharts drops a date that would touch its neighbour.
// - n° 46: « News », « Global », « EMA 24h »: the French of the page instead.
import { useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { MiSnapshot } from '@/lib/types'
import { formatDate } from '@/lib/format-date'
import { ENTRY_FLOOR, MI_PILLARS, scaleText, scoreText, signedInt, type MiPillar } from '@/lib/mi-pillars'

interface Props {
  data: MiSnapshot[]
}

type Row = MiSnapshot & { t: number }

const dayKey = (t: number) => formatDate(t, { year: 'numeric', month: '2-digit', day: '2-digit' })
const dayLabel = (t: number) => formatDate(t, { day: '2-digit', month: '2-digit' })
const instantLabel = (t: number) => formatDate(t, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** One tick per Paris day, at that day's first reading; the partial first day is skipped. */
export function dayTicks(times: readonly number[]): number[] {
  const ticks: number[] = []
  let previous: string | null = null
  for (const t of times) {
    const key = dayKey(t)
    if (key === previous) continue
    if (previous !== null) ticks.push(t)
    previous = key
  }
  return ticks
}

/** Half-height of the Y frame: ±50 when everything stays inside it, else the next ten
 *  strictly above, so a line never runs along the frame's edge. */
export function yDomain(values: readonly (number | null | undefined)[]): number {
  let max = 0
  for (const v of values) if (v != null && Number.isFinite(v)) max = Math.max(max, Math.abs(v))
  return max < 50 ? 50 : Math.min(100, Math.floor(max / 10) * 10 + 10)
}

function ChartTooltip({ active, payload, label, pillar }: {
  active?: boolean
  payload?: { payload: Row }[]
  label?: number
  pillar: MiPillar | null
}) {
  if (!active || !payload?.length || label == null) return null
  const row = payload[0].payload
  return (
    <div className="rounded border border-border-strong bg-card px-3 py-2 text-xs tabular-nums">
      <p className="text-muted mb-1">{instantLabel(label)}</p>
      <p>{`Score global ${scoreText(row.composite_score)}`}</p>
      {pillar && <p>{`${pillar.label} ${scoreText(row[pillar.key] as number | null)}`}</p>}
    </div>
  )
}

function Swatch({ dashed }: { dashed?: boolean }) {
  return (
    <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true" className="shrink-0">
      <line
        x1="1" x2="23" y1="4" y2="4"
        stroke={dashed ? 'var(--accent)' : 'var(--foreground)'}
        strokeWidth={dashed ? 1.5 : 2}
        strokeDasharray={dashed ? '5 3' : undefined}
      />
    </svg>
  )
}

const AXIS_TICK = { fontSize: 13, fill: 'var(--muted)' }

export default function MiHistoryChart({ data }: Props) {
  const [pillarId, setPillarId] = useState<string | null>(null)
  const pillar = MI_PILLARS.find(p => p.id === pillarId) ?? null

  if (!data.length) {
    return <p className="py-8 text-sm text-muted">Pas encore de données historiques.</p>
  }

  const rows: Row[] = data.map(snap => ({ ...snap, t: Date.parse(snap.snapshot_at) }))
  const ticks = dayTicks(rows.map(r => r.t))
  const half = yDomain(rows.flatMap(r => [r.composite_score, pillar ? (r[pillar.key] as number | null) : null]))
  const yTicks = [-half, ENTRY_FLOOR, 0, -ENTRY_FLOOR, half]
  const last = rows[rows.length - 1]

  return (
    <div>
      <div role="group" aria-label="Comparer le score global avec un pilier" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted" aria-hidden="true">Comparer avec</span>
        {MI_PILLARS.map(p => {
          const on = p.id === pillarId
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPillarId(on ? null : p.id)}
              className={`min-h-11 rounded px-4 text-sm font-semibold transition-colors border ${
                on ? 'bg-card-2 border-accent text-foreground' : 'border-border-strong text-foreground hover:bg-card-2'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <div
        className="mt-4"
        role="img"
        aria-label={`Score global sur sept jours, ${scaleText()}. Dernier relevé : ${scoreText(last.composite_score)}.`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              ticks={ticks}
              tickFormatter={dayLabel}
              interval="preserveStartEnd"
              minTickGap={16}
              tick={AXIS_TICK}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              domain={[-half, half]}
              ticks={yTicks}
              tickFormatter={signedInt}
              width={44}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip pillar={pillar} />}
              cursor={{ stroke: 'var(--border-strong)' }}
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <ReferenceLine y={ENTRY_FLOOR} stroke="var(--border-strong)" strokeDasharray="2 3" />
            <ReferenceLine y={-ENTRY_FLOOR} stroke="var(--border-strong)" strokeDasharray="2 3" />
            {pillar && (
              <Line
                dataKey={pillar.key}
                name={pillar.label}
                stroke="var(--accent)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              dataKey="composite_score"
              name="Score global"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul data-testid="meteo-legend" className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <li className="flex items-center gap-2"><Swatch />Score global</li>
        {pillar && <li className="flex items-center gap-2"><Swatch dashed />{pillar.label}</li>}
      </ul>
    </div>
  )
}
