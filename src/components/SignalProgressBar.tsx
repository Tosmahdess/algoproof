'use client'

interface Props {
  triggerPct: number | null    // e.g. -25 (percentage, negative)
  drawdownPct: number | null   // e.g. -0.25 (fraction) or null
}

const SIGNAL_COLORS = {
  none:  '#444',
  minor: '#f6c90e',
  major: '#ff6b35',
  crash: '#ff4444',
}

export function SignalProgressBar({ triggerPct, drawdownPct }: Props) {
  if (!triggerPct) return null

  const minor = triggerPct           // e.g. -25
  const major = triggerPct * 1.5    // e.g. -37.5
  const crash = triggerPct * 2.0    // e.g. -50

  // drawdownPct is a fraction (-0.25) — convert to percentage for comparison
  const ddPct = drawdownPct !== null ? drawdownPct * 100 : 0

  // Fill: how far from 0 to crash threshold
  const fillRatio = drawdownPct !== null
    ? Math.min(1, Math.max(0, ddPct / crash))
    : 0

  const fillColor = !drawdownPct ? SIGNAL_COLORS.none
    : ddPct <= crash  ? SIGNAL_COLORS.crash
    : ddPct <= major  ? SIGNAL_COLORS.major
    : ddPct <= minor  ? SIGNAL_COLORS.minor
    : SIGNAL_COLORS.none

  const labels = [
    { pct: 0,     label: '0%' },
    { pct: 33.33, label: `${minor}%` },
    { pct: 66.67, label: `${major.toFixed(1)}%` },
    { pct: 100,   label: `${crash}%` },
  ]

  return (
    <div className="w-full">
      <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          data-testid="bar-fill"
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: drawdownPct !== null ? `${fillRatio * 100}%` : '0%',
            backgroundColor: fillColor,
          }}
        />
        {[33.33, 66.67].map(pos => (
          <div
            key={pos}
            className="absolute top-0 h-full w-px bg-zinc-600"
            style={{ left: `${pos}%` }}
          />
        ))}
      </div>
      <div className="relative mt-0.5">
        {labels.map(({ pct, label }) => (
          <span
            key={pct}
            className="absolute text-[9px] text-zinc-500 transform -translate-x-1/2"
            style={{ left: `${pct}%` }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="h-3" />
    </div>
  )
}
