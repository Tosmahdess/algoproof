// A thirty-day capital sparkline for the home's real-money cards (conception §3.4):
// one line in the text colour, an area at 8 % in the colour of the bot's sign, a
// dashed baseline at the start capital when it falls inside the window, a dot on
// the last point. Decoration for the eye, the figures on the card carry the facts:
// aria-hidden, like Sparkline.tsx.
export default function HomeSpark({
  values, sign, startCapital, width = 300, height = 44,
}: { values: number[]; sign: 1 | -1; startCapital?: number; width?: number; height?: number }) {
  if (values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = (hi - lo) * 0.12 || 1
  const yOf = (v: number) => height - 4 - ((v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (height - 8)
  const xOf = (i: number) => 2 + i * ((width - 4) / (values.length - 1))
  const pts = values.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const tone = sign < 0 ? 'var(--negative)' : 'var(--positive)'
  const baseline = startCapital !== undefined && startCapital >= lo - pad && startCapital <= hi + pad ? yOf(startCapital) : null
  const lastX = xOf(values.length - 1)
  const lastY = yOf(values[values.length - 1])
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" className="block w-full h-11">
      <polygon points={`${xOf(0).toFixed(1)},${height - 2} ${pts} ${lastX.toFixed(1)},${height - 2}`} fill={tone} fillOpacity="0.08" />
      {baseline !== null && (
        <line x1="2" x2={width - 2} y1={baseline.toFixed(1)} y2={baseline.toFixed(1)} stroke="var(--muted)" strokeDasharray="3 3" strokeWidth="1" />
      )}
      <polyline points={pts} fill="none" stroke="var(--foreground)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3" fill={tone} />
    </svg>
  )
}
