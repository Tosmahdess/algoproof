'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { BotChangelog, ScopeType } from '@/lib/types'
import { SCOPE_META, scopeLabel } from '@/lib/changelog'
import ScopeBadge from './ScopeBadge'

const ORDER: ScopeType[] = ['fleet', 'mi', 'wealth', 'bot']

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function FluxGroup({ scope, entries }: { scope: ScopeType; entries: BotChangelog[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? entries : entries.slice(0, 5)
  const hidden = entries.length - 5
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: SCOPE_META[scope].color }}>
        {SCOPE_META[scope].label}
      </h3>
      <div className="divide-y divide-border">
        {visible.map(e => (
          <div key={e.id} className="flex gap-3 items-baseline py-1.5">
            <span className="text-xs font-mono text-muted w-12 flex-shrink-0">{fmtDate(e.entry_date)}</span>
            {scope === 'bot' && <ScopeBadge scope={e.scope_type} label={scopeLabel(e)} />}
            <span className="text-sm text-foreground">{e.summary}</span>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded(v => !v)} className="mt-2 text-xs text-accent hover:underline">
          {expanded ? 'Replier' : `Déplier (+${hidden})`}
        </button>
      )}
    </div>
  )
}

export default function OverviewWhatsNew({ entries }: { entries: BotChangelog[] }) {
  if (entries.length === 0) return null
  const groups = ORDER
    .map(s => ({ scope: s, rows: entries.filter(e => e.scope_type === s) }))
    .filter(g => g.rows.length > 0)
  return (
    <section className="border border-border rounded-xl p-6 my-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold">Quoi de neuf</h2>
        <Link href="/journal" className="text-sm text-accent">Voir tout le journal →</Link>
      </div>
      {groups.map(g => <FluxGroup key={g.scope} scope={g.scope} entries={g.rows} />)}
    </section>
  )
}
