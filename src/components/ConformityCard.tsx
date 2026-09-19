// Conformity card: confronts realized stats with the pre-registered backtest envelope
// and publishes the bot's kill criteria. Server-safe (pure props, no client state);
// the fold itself is Repli, a client island.
//
// 2026-09-19 (D056): on a phone the card took 772 px of v1-spot. The table,
// the kill criteria and the source fold there; the title, the status badge,
// the one-line method note and the verdict sentence stay visible (Repli's
// `aside` and `entete`), so a folded card never shows a bare « Dans
// l'enveloppe ». On a computer nothing changes.
import Repli from '@/components/Repli'
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
    classes: 'bg-warning/10 text-warning border-warning/30',
    dot: 'bg-warning',
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
    <Repli
      id="conformite"
      titre="📏 Conformité au backtest"
      className="bg-card border border-border rounded-lg p-6 mb-8"
      titreClassName="text-xl font-semibold"
      // Below sm the badge goes under the title: sharing the row left the
      // title 158 px at 390 px, « 📏 » alone on a line. Computer row unchanged.
      asideClassName="flex flex-col gap-2 mb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:flex-wrap"
      aside={
        <span className={`self-start sm:self-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${classes}`}>
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`} />
          {label}
        </span>
      }
      entete={
        <>
          <p className="text-xs text-muted mb-4">
            L’enveloppe attendue vient du backtest et de critères fixés à l’avance ; le réalisé
            (paper ou live) y est confronté en continu. Si les deux divergent, c’est écrit ici,
            pas caché.
          </p>
          <p className="text-sm max-sm:mb-0 mb-4">{result.narrative}</p>
        </>
      }
      corpsClassName="max-sm:mt-4"
    >

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
                    : check.status === 'watch' ? 'text-warning'
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

      <h3 className="text-base font-semibold mb-2">Quand ce bot sera coupé</h3>
      <ul className="space-y-1.5 mb-3">
        {expectations.killCriteria.map(rule => {
          // The last one written wins: decisions are appended, never edited.
          const decision = expectations.decisions?.filter(d => d.rule === rule).at(-1)
          return (
            <li key={rule} className="text-sm text-muted flex gap-2">
              <span className="text-negative shrink-0">✕</span>
              <span>
                {rule}
                {decision && (
                  <span
                    className={`block mt-1.5 border-l-2 pl-3 ${
                      decision.status === 'pending' ? 'border-warning' : 'border-border'
                    }`}
                  >
                    <span className="block text-xs">
                      Décision du {decision.date} · {decision.scope}
                    </span>
                    <span className="block text-foreground">{decision.text}</span>
                    {decision.reviewBy && (
                      <span className="block text-xs mt-1">Réexamen le {decision.reviewBy}.</span>
                    )}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-muted">
        Critères pré-enregistrés le {expectations.registeredAt} et versionnés publiquement
        (tout changement est daté). Source des chiffres : {expectations.source}
      </p>
    </Repli>
  )
}
