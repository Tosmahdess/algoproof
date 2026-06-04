import Link from 'next/link'
import type { FleetProof } from '@/lib/fleet-proof'

const int = (n: number) => n.toLocaleString('fr-FR')

export default function ProofStrip({ proof }: { proof: FleetProof }) {
  const stats = [
    { testid: 'proof-trades', value: int(proof.totalTrades), label: 'trades partagés' },
    { testid: 'proof-losses', value: int(proof.losingTrades), label: 'pertes montrées publiquement' },
    { testid: 'proof-bots', value: int(proof.nWithData), label: 'bots en labo ouvert' },
  ]
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <div data-testid={s.testid} className="text-2xl font-bold font-mono text-text">{s.value}</div>
            <div className="mt-1 text-xs text-muted leading-tight">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-muted">
        Données paper, mises à jour toutes les heures depuis le VPS.{' '}
        <Link href="/performance" className="text-accent">le détail jour par jour</Link>
        {' · '}
        <Link href="/overview" className="text-accent">tous les bots</Link>
      </p>
    </div>
  )
}
