// Conformity card: confronts realized stats with the pre-registered backtest envelope
// and publishes the bot's kill criteria. Server-safe (pure props, no client state).
import type { BotExpectations } from '@/lib/bot-expectations'
import { assessConformity, ConformityStatus, RealizedStats } from '@/lib/conformity'

const STATUS_CONFIG: Record<ConformityStatus, { label: string; classes: string; dot: string }> = {
  ok: {
    label: 'Dans l’enveloppe',
    classes: 'bg-positive/10 text-positive border-positive/30',
    dot: 'bg-positive',
  },
  watch: {
    label: 'À surveiller',
    classes: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    dot: 'bg-yellow-300',
  },
  breach: {
    label: 'Hors enveloppe',
    classes: 'bg-negative/10 text-negative border-negative/30',
    dot: 'bg-negative',
  },
  insufficient: {
    label: 'Échantillon insuffisant',
    classes: 'bg-muted/10 text-muted border-muted/30',
    dot: 'bg-muted',
  },
}

export default function ConformityCard({
  expectations,
  stats,
}: {
  expectations: BotExpectations
  stats: RealizedStats
}) {
  const result = assessConformity(expectations, stats)
  const { label, classes, dot } = STATUS_CONFIG[result.status]

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="font-semibold">📏 Conformité au backtest</h2>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${classes}`}>
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`} />
          {label}
        </span>
      </div>
      <p className="text-xs text-muted mb-4">
        L’enveloppe attendue vient du backtest et de critères fixés à l’avance ; le réalisé
        (paper ou live) y est confronté en continu. Si les deux divergent, c’est écrit ici,
        pas caché.
      </p>

      <p className="text-sm mb-4">{result.narrative}</p>

      {result.checks.length > 0 && (
        <div className="mb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted text-left">
                <th className="py-1.5 pr-4 font-medium"> </th>
                <th className="py-1.5 pr-4 font-medium">Attendu (backtest)</th>
                <th className="py-1.5 font-medium">Réalisé</th>
              </tr>
            </thead>
            <tbody>
              {result.checks.map(check => (
                <tr key={check.label} className="border-t border-border">
                  <td className="py-2 pr-4 text-muted">{check.label}</td>
                  <td className="py-2 pr-4 font-mono">{check.expected}</td>
                  <td className={`py-2 font-mono ${
                    check.status === 'breach' ? 'text-negative'
                    : check.status === 'watch' ? 'text-yellow-300'
                    : 'text-positive'
                  }`}>
                    {check.realized}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.total_trades === 0 && expectations.dormancyNote && (
        <p className="text-sm text-muted mb-5">{expectations.dormancyNote}</p>
      )}

      <h3 className="text-sm font-semibold mb-2">Quand ce bot sera coupé</h3>
      <ul className="space-y-1.5 mb-3">
        {expectations.killCriteria.map(rule => (
          <li key={rule} className="text-sm text-muted flex gap-2">
            <span className="text-negative shrink-0">✕</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted/70">
        Critères pré-enregistrés le {expectations.registeredAt} et versionnés publiquement
        (tout changement est daté). Source des chiffres : {expectations.source}
      </p>
    </section>
  )
}
