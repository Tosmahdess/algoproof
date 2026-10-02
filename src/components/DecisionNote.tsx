// A dated decision on a published rule (lot 5 of the design audit, 2026-09-25,
// conception §5.6), printed under the rule it answers on the bot sheet (ConformityCard).
// Decisions are appended, never edited; the caller hands the last one written.
//
// Refonte « Le registre des décisions », lot 3 (2026-10-02): the decision reads as the
// maquette's author note. Its first sentence, cut from the published text and not
// rewritten, stays in view with the review line; the whole text sits in « Lire ma
// décision complète ». No coloured side stripe any more (one-sided borders are out).
//
// The review line is a guard the site applies to itself. A future date reads
// « Réexamen le … »; a past one reads « Réexamen dépassé depuis N jours » in the
// severe colour. The ORB sheet served « Réexamen le 22/09 » three days after
// that date (audit P0-2): an expired promise shown as a plan.
import { mediumDate } from '@/lib/format-date'
import { firstSentence, reviewLine } from '@/lib/bot-verdict'
import type { KillDecision } from '@/lib/bot-expectations'

export { reviewOverdueDays } from '@/lib/bot-verdict'

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
  const review = decision.reviewBy ? reviewLine(decision.reviewBy, today) : null
  const lead = firstSentence(decision.text)
  const more = lead !== decision.text.trim()
  return (
    <div data-testid="decision-note" className={`block ${className}`}>
      <p className="text-xs text-muted">
        {`Décision du ${mediumDate(decision.date)} · ${decision.scope}`}
      </p>
      <p className="mt-1 text-foreground">{lead}</p>
      {review && (
        <p data-testid="decision-review" className={`text-xs mt-1 ${review.overdue ? 'text-severe' : 'text-muted'}`}>
          {review.text}
        </p>
      )}
      {more && (
        <details className="mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
            Lire ma décision complète
          </summary>
          <p className="mt-1 text-foreground leading-relaxed">{decision.text}</p>
        </details>
      )}
    </div>
  )
}
