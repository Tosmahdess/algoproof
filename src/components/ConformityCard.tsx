// « Ce que j'avais fixé. Ce qui s'est passé. » (refonte « Le registre des décisions »,
// lot 3, 2026-10-02). Confronts the realized figures with the limits registered before
// the observation period (bot-expectations.ts) and publishes the bot's kill criteria,
// with the dated decision under the rule it answers. Server-safe, pure props.
//
// Before the redesign this was a card folded on a phone (D057). The state it argued now
// sits in the verdict panel under the title (VerdictPanel, never folded), so this body
// shows the evidence: each value against its threshold (« Pire baisse 29,1 %, limite
// publiée 20 % »), coloured by that threshold only (audit 2026-10, constat 30), and
// « — », « pas encore mesurable », when there is nothing to measure (constat 6).
import DecisionNote from '@/components/DecisionNote'
import { mediumDate } from '@/lib/format-date'
import { LOW_SAMPLE_TRADES, NARROW_NBSP, fmtDrawdown, fmtPfDisplay, frNumber } from '@/lib/display'
import type { BotExpectations } from '@/lib/bot-expectations'
import { assessConformity, type CheckStatus, type RealizedStats } from '@/lib/conformity'

/** A threshold's colour: a crossed limit in the loss colour, a near one in the reserve,
 *  anything else in ordinary ink. Never the sign of the figure. */
export function checkTone(status: CheckStatus | null): string {
  return status === 'breach' ? 'text-negative' : status === 'watch' ? 'text-warning' : 'text-foreground'
}

const pct = (x: number) => `${frNumber(x * 100, 1).replace(/,0$/, '')}${NARROW_NBSP}%`

interface Row { label: string; limit: string; value: string; status: CheckStatus | null; note: string | null }

export default function ConformityCard({
  expectations,
  stats,
  today,
}: {
  expectations: BotExpectations
  stats: RealizedStats
  /** YYYY-MM-DD for the review-date guard; defaults to the render date. */
  today?: string
}) {
  const result = assessConformity(expectations, stats)
  const statusOf = (label: string) => result.checks.find(c => c.label === label)?.status ?? null
  const traded = stats.total_trades > 0

  const rows: Row[] = []
  if (expectations.maxDrawdown !== undefined) {
    rows.push({
      label: 'Pire baisse',
      limit: `Limite publiée : ${pct(expectations.maxDrawdown)}`,
      value: traded ? fmtDrawdown(stats.max_drawdown) : '—',
      status: traded ? statusOf('Drawdown max') : null,
      note: traded ? null : 'pas encore mesurable',
    })
  }
  if (expectations.pfFloor !== undefined) {
    const measured = stats.total_trades >= LOW_SAMPLE_TRADES
    rows.push({
      label: 'Facteur de profit',
      limit: `Attendu : au moins ${String(expectations.pfFloor).replace('.', ',')}`,
      value: measured ? fmtPfDisplay(null, stats.total_trades, stats.profit_factor) : '—',
      status: measured ? statusOf('Rentabilité (facteur de profit)') : null,
      note: measured ? null : `pas encore mesurable, moins de ${LOW_SAMPLE_TRADES} trades`,
    })
  }

  const decided = expectations.decisions?.some(d => expectations.killCriteria.includes(d.rule)) ?? false

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        {rows.length > 0 && (
          <dl className="border-t border-border">
            {rows.map(r => (
              <div key={r.label} data-testid="rule-row" className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                <dt>
                  {r.label}
                  <span className="block text-xs text-muted">{r.note ? `${r.limit} · ${r.note}` : r.limit}</span>
                </dt>
                <dd className={`text-xl sm:text-2xl tabular-nums ${checkTone(r.status)}`}>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-xs text-muted mt-4">
          {`Critères publiés le ${mediumDate(expectations.registeredAt)} et versionnés publiquement (tout changement est daté). Source des chiffres : ${expectations.source}`}
        </p>
      </div>

      <div className="bg-card rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-3">Quand ce bot sera coupé</h3>
        <ul className="space-y-3">
          {expectations.killCriteria.map(rule => {
            // The last one written wins: decisions are appended, never edited.
            const decision = expectations.decisions?.filter(d => d.rule === rule).at(-1)
            return (
              <li key={rule} className="text-sm leading-relaxed flex gap-2">
                {/* A stated rule is not a failed rule: the cross only marks the rule a
                    decision was published under, i.e. the one that was crossed (O-D2). */}
                {decision
                  ? <span className="text-negative shrink-0" aria-label="règle franchie">✕</span>
                  : <span className="text-muted shrink-0" aria-hidden="true">•</span>}
                <div className="min-w-0">
                  <p>{rule}</p>
                  {decision && <DecisionNote decision={decision} today={today} className="mt-2" />}
                </div>
              </li>
            )
          })}
        </ul>
        {/* C2.1 (audit 2026-09-15): a crossed rule is never shown alone. Without a
            published decision, the card says so instead of implying one. */}
        {result.status === 'breach' && !decided && (
          <p className="text-sm mt-4">Je n’ai publié aucune décision à ce jour.</p>
        )}
      </div>
    </div>
  )
}
