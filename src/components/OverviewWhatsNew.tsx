'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { BotChangelog } from '@/lib/types'
import { scopeLabel } from '@/lib/changelog'
import ScopeBadge from './ScopeBadge'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function OverviewWhatsNew({ entries }: { entries: BotChangelog[] }) {
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null

  // entries arrive newest-first (getJournalEntries orders by entry_date desc).
  // Show the 5 most recent across all flux; "Développer" reveals the full changelog.
  const visible = expanded ? entries : entries.slice(0, 5)
  const hidden = entries.length - 5

  return (
    <section className="border border-border rounded-xl p-6 my-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold">Quoi de neuf</h2>
        <Link href="/journal" className="text-sm text-accent">Voir tout le journal →</Link>
      </div>
      <div className="divide-y divide-border">
        {visible.map(e => (
          <div key={e.id} className="grid grid-cols-[52px_104px_1fr] gap-3 items-baseline py-2">
            <span className="text-xs font-mono text-muted">{fmtDate(e.entry_date)}</span>
            <ScopeBadge scope={e.scope_type} label={scopeLabel(e)} />
            <span className="text-sm text-foreground">{e.summary}</span>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-accent hover:underline"
        >
          {expanded ? 'Replier' : `Développer (+${hidden})`}
        </button>
      )}
    </section>
  )
}
