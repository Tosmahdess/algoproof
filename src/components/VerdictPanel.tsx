// The verdict and « Ma décision et ses limites », the panel under the title of a bot fiche
// (refonte « Le registre des décisions », lot 3, 2026-10-02; audit 2026-10, constats 3
// and 6). Never folded: it sits in the first screen on a phone. The state comes from
// botVerdict (lib/bot-verdict.ts); the decision is quoted from the published text and
// its review date from the decision itself. « Je le garde » does not neutralise « règle
// franchie »: the panel keeps the loss contour while the decision is shown beside it.
// Refonte finition (2026-10-02): the verdict's title speaks alone, no « Mon constat »
// above it; « Ma décision et ses limites » is the right column's own h3.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import type { BotVerdict } from '@/lib/bot-verdict'

// The reserve ink (#e9c17c) on « Données insuffisantes »: always with its words, never
// the colour alone (refonte finition, 2026-10-02).
const TITLE_TONE = { loss: 'text-negative', warn: 'text-warning', reserve: 'text-warning', neutral: 'text-foreground' } as const

export interface DecisionColumn {
  /** The quoted decision, or the limits, or what replaces them. */
  text: string | null
  link: { href: string; label: string } | null
}

/** What the right-hand column says, from the verdict and what the fiche has. */
export function decisionColumn(v: BotVerdict, opts: { status: string; criteriaCount: number }): DecisionColumn {
  const rules = { href: '#regles', label: 'Lire la règle et ma décision ↓' }
  if (v.state === 'breach') {
    return { text: v.decisionLead ?? 'Je n’ai publié aucune décision à ce jour.', link: rules }
  }
  if (v.limits) return { text: v.limits, link: { href: '#regles', label: 'Lire les règles publiées ↓' } }
  if (v.state === 'stopped') return { text: null, link: null }
  if (opts.status === 'paper') {
    return {
      text: `Avant tout passage en argent réel, je lui demande ${opts.criteriaCount} critères publics.`,
      link: { href: '#regles', label: 'Voir ces critères ↓' },
    }
  }
  return {
    text: 'Je n’ai publié ni limite ni règle d’arrêt pour ce bot. Chaque trade reste publié.',
    link: { href: '#trades', label: 'Voir les trades ↓' },
  }
}

export default function VerdictPanel({ verdict, column }: { verdict: BotVerdict; column: DecisionColumn }) {
  const loss = verdict.tone === 'loss'
  const hasColumn = column.text !== null || verdict.review !== null
  return (
    <section
      data-testid="verdict-panel"
      data-state={verdict.state}
      aria-labelledby="verdict-title"
      className={`rounded-lg border bg-card p-4 sm:px-6 sm:py-5 grid gap-4 ${hasColumn ? 'md:grid-cols-[1.1fr_1fr] md:gap-8' : ''} ${loss ? 'border-negative' : 'border-border'}`}
    >
      <div>
        <h2 id="verdict-title" className={`text-2xl font-semibold leading-tight mb-1.5 ${TITLE_TONE[verdict.tone]}`}>
          {verdict.title}
        </h2>
        <p className="text-sm sm:text-base">{verdict.finding}</p>
      </div>
      {hasColumn && (
        <div>
          <h3 className="text-base font-semibold mb-1">Ma décision et ses limites</h3>
          {column.text && <p data-testid="verdict-decision" className="text-sm sm:text-base">{column.text}</p>}
          {verdict.review && (
            <p data-testid="verdict-review" className={`text-sm mt-1 ${verdict.review.overdue ? 'text-severe' : 'text-muted'}`}>
              {verdict.review.text}
            </p>
          )}
          {column.link && (
            <Link href={column.link.href} className={linkClass('inline', 'inline-flex min-h-11 items-center text-sm')}>
              {column.link.label}
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
