// A dated decision on a published rule (lot 5 of the design audit, 2026-09-25,
// conception §5.6). One component, two places: under its rule on the bot sheet
// (ConformityCard) and in the home's transparency block. Decisions are appended,
// never edited; the caller hands the last one written.
//
// The review line is a guard the site applies to itself. A future date reads
// « Réexamen le … »; a past one reads « Réexamen dépassé depuis N jours » in the
// severe colour. The ORB sheet served « Réexamen le 22/09 » three days after
// that date (audit P0-2): an expired promise shown as a plan.
import { mediumDate } from '@/lib/format-date'
import type { KillDecision } from '@/lib/bot-expectations'

const DAY = 86_400_000

/** Whole days the review date is behind `today` (YYYY-MM-DD); 0 on the day itself. */
export function reviewOverdueDays(reviewBy: string, today: string): number {
  return Math.max(0, Math.floor((Date.parse(today) - Date.parse(reviewBy)) / DAY))
}

export default function DecisionNote({
  decision,
  today = new Date().toISOString().slice(0, 10),
  className = '',
}: {
  decision: KillDecision
  /** YYYY-MM-DD; defaults to the render date. Tests pin it. */
  today?: string
  className?: string
}) {
  const overdue = decision.reviewBy ? reviewOverdueDays(decision.reviewBy, today) : 0
  return (
    <span
      data-testid="decision-note"
      className={`block border-l-2 pl-3 ${decision.status === 'pending' ? 'border-warning' : 'border-border-strong'} ${className}`}
    >
      <span className="block text-xs text-muted">
        Décision du {mediumDate(decision.date)} · {decision.scope}
      </span>
      <span className="block text-foreground">{decision.text}</span>
      {decision.reviewBy && (
        overdue > 0 ? (
          <span data-testid="decision-review" className="block text-xs mt-1 text-severe">
            {`Réexamen dépassé depuis ${overdue} jour${overdue > 1 ? 's' : ''}.`}
          </span>
        ) : (
          <span data-testid="decision-review" className="block text-xs mt-1 text-muted">
            {`Réexamen le ${mediumDate(decision.reviewBy)}.`}
          </span>
        )
      )}
    </span>
  )
}
