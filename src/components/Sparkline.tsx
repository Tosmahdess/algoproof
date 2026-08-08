// A row-sized equity thumbnail: one polyline, no axes, no labels. Decoration
// for scanning a long register — the numbers on the row carry the facts, so
// the SVG is aria-hidden and inherits `currentColor` from its wrapper (which
// is what colors it positive/negative without this component knowing why).
export interface SparklineProps {
  values: number[]
  width?: number
  height?: number
}

export default function Sparkline({ values, width = 88, height = 20 }: SparklineProps) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1 // flat series draws a flat line, not NaN
  const step = width / (values.length - 1)
  const pad = 1.5 // keep the stroke inside the viewBox at the extremes
  const usable = height - pad * 2
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(pad + usable - ((v - min) / span) * usable).toFixed(1)}`)
    .join(' ')
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
