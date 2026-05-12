'use client'

import type { BotChangelog, ChangelogCategory } from '@/lib/types'

const CATEGORY_CHIP: Record<ChangelogCategory, { style: string; label: string }> = {
  asset:    { style: 'bg-blue-900/40 text-blue-300 border border-blue-700/50',     label: 'actif' },
  fix:      { style: 'bg-red-900/40 text-red-300 border border-red-700/50',       label: 'correctif' },
  strategy: { style: 'bg-purple-900/40 text-purple-300 border border-purple-700/50', label: 'stratégie' },
  perf:     { style: 'bg-green-900/40 text-green-300 border border-green-700/50', label: 'perf' },
  risk:     { style: 'bg-orange-900/40 text-orange-300 border border-orange-700/50', label: 'risque' },
}

interface ChangelogTabProps {
  changelogs: BotChangelog[]
}

export default function ChangelogTab({ changelogs }: ChangelogTabProps) {
  if (changelogs.length === 0) {
    return (
      <p className="text-sm text-muted italic py-4">
        Aucune modification enregistrée pour ce bot.
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
          <p className="text-xs text-muted font-mono mb-2">
            {new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="flex gap-3 items-start">
                <span className={`text-xs px-2 py-0.5 rounded font-mono flex-shrink-0 ${CATEGORY_CHIP[entry.category]?.style}`}>
                  {CATEGORY_CHIP[entry.category]?.label ?? entry.category}
                </span>
                <div>
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
