import type { BotStats } from '@/lib/types'
import { evaluatePathToReal, DEFAULT_LIVE_GATE, type LiveGate, type PathCriterion } from '@/lib/path-to-real'

interface Props {
  status: string
  stats: BotStats
  liveGate?: Partial<LiveGate>
  liveSince?: string
}

function fmt(c: PathCriterion): string {
  if (c.format === 'pct') return `${(c.value * 100).toFixed(1)} %`
  if (c.format === 'count') return `${c.value} / ${c.target}`
  return c.value.toFixed(2)
}

function width(c: PathCriterion): number {
  if (c.direction === 'lte') return c.met ? 100 : Math.max(0, Math.min(100, (c.target / Math.max(c.value, 1e-9)) * 100))
  return Math.max(0, Math.min(100, (c.value / c.target) * 100))
}

// The paper→real gate, public. Live bots show their real-money start date instead.
export default function PathToRealCard({ status, stats, liveGate, liveSince }: Props) {
  if (status === 'live') {
    if (!liveSince) return null
    const d = new Date(liveSince).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-8 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-negative animate-pulse" />
          En argent réel depuis le {d}.
        </span>
      </div>
    )
  }
  if (status !== 'paper') return null

  const gate = { ...DEFAULT_LIVE_GATE, ...liveGate }
  const { criteria, met, allMet } = evaluatePathToReal(stats, gate)

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">{allMet ? '🔓' : '🔒'}</span>
        <div>
          <p className="font-semibold text-sm">Avant le moindre euro réel</p>
          <p className="text-xs text-muted">Le même gate que tous mes bots : 4 critères, publics, non négociables.</p>
        </div>
      </div>
      <div className="space-y-4">
        {criteria.map(c => (
          <div key={c.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted">{c.label}</span>
              <span className={`font-mono font-semibold ${c.met ? 'text-positive' : ''}`}>
                {fmt(c)}{c.met ? ' ✓' : ''}
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div data-testid="ptr-bar" className={`h-full rounded-full ${c.met ? 'bg-positive' : 'bg-[#ff6b35]'}`} style={{ width: `${width(c)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted mt-4">
        {met}/4 critères atteints : rien ne passe en réel avant les 4.
      </p>
    </div>
  )
}
