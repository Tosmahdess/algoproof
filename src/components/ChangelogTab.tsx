'use client'

import type { BotChangelog, ChangelogCategory } from '@/lib/types'
import ScopeBadge from './ScopeBadge'

// Finitions (2026-10-03): the seven categories wore seven Tailwind colours (blue, red,
// purple, green, orange, cyan, indigo), none of them the site's, and « perf » was green.
// A category is a word, not a judgement: one chip in the note ink with a control
// contour, the word carries the category.
const CHIP = 'border border-border-strong text-muted'
const CATEGORY_LABEL: Record<ChangelogCategory, string> = {
  asset: 'actif',
  fix: 'correctif',
  strategy: 'stratégie',
  perf: 'perf',
  risk: 'risque',
  signal: 'signal',
  deploy: 'déploiement',
}

interface ChangelogTabProps {
  changelogs: BotChangelog[]
  /** What the log is about, for its empty state: « ce bot », « la météo ». */
  sujet?: string
}

export default function ChangelogTab({ changelogs, sujet = 'ce bot' }: ChangelogTabProps) {
  if (changelogs.length === 0) {
    return (
      <p className="text-sm text-muted py-4">
        Aucune modification enregistrée pour {sujet}.
      </p>
    )
  }

  const byDate = changelogs.reduce<Record<string, BotChangelog[]>>((acc, entry) => {
    if (!acc[entry.entry_date]) acc[entry.entry_date] = []
    acc[entry.entry_date].push(entry)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, entries]) => (
        <div key={date}>
          <p className="text-xs text-muted tabular-nums mb-2">
            {new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="flex gap-3 items-start">
                <span className={`text-xs px-2 py-0.5 rounded tabular-nums flex-shrink-0 ${CHIP}`}>
                  {CATEGORY_LABEL[entry.category] ?? entry.category}
                </span>
                <div>
                  {entry.scope_type !== 'bot' && (
                    <div className="mb-0.5"><ScopeBadge scope={entry.scope_type} /></div>
                  )}
                  <p className="text-sm text-foreground">{entry.summary}</p>
                  {entry.detail && (
                    <p className="text-xs text-muted mt-0.5">{entry.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
