// src/components/SegmentVerdictBadge.tsx
//
// D074: a hand-written bot's standing, shown beside its backtest and its curve. The five
// CME D1 bots were tested, not selected; tresor-fdm-d1 failed its own tests and runs in
// paper as a slow refutation. Engine bots passed the gauntlet: no badge.
export default function SegmentVerdictBadge({ verdict }: { verdict?: 'exploration' | 'rejected' | null }) {
  if (!verdict) return null
  const text = verdict === 'rejected' ? 'Rejeté au backtest' : 'Exploration, pas un GO'
  const tone = verdict === 'rejected'
    ? 'border-negative/40 text-negative'
    : 'border-border text-muted'
  return (
    <span className={`inline-block align-middle ml-2 rounded border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {text}
    </span>
  )
}
