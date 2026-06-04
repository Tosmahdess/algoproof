import Link from 'next/link'
import type { FleetProof } from '@/lib/fleet-proof'
import { fmtEur } from '@/lib/display'

const int = (n: number) => n.toLocaleString('fr-FR')

export default function ProofStrip({ proof }: { proof: FleetProof }) {
  const stats = [
    { testid: 'proof-trades', value: int(proof.totalTrades), label: 'trades exécutés' },
    { testid: 'proof-losses', value: int(proof.losingTrades), label: 'pertes affichées publiquement' },
    { testid: 'proof-pf', value: proof.fleetPF.toFixed(2), label: 'profit factor de la flotte' },
    { testid: 'proof-pnl', value: fmtEur(proof.fleetPnl), label: 'P&L flotte (paper)' },
  ]
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <div data-testid={s.testid} className="text-2xl font-bold font-mono text-text">{s.value}</div>
            <div className="mt-1 text-xs text-muted leading-tight">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-muted">
        {proof.nBots} bots · données paper, mises à jour toutes les heures depuis le VPS — {' '}
        <Link href="/performance" className="text-accent">le détail jour par jour →</Link>{' · '}
        <Link href="/overview" className="text-accent">tous les bots →</Link>
      </p>
    </div>
  )
}
