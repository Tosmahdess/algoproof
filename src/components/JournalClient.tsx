'use client'

import { useState, useMemo, useEffect } from 'react'
import type { BotChangelog, ScopeType } from '@/lib/types'
import { scopeLabel } from '@/lib/changelog'
import ScopeBadge from './ScopeBadge'

const CATEGORY_CHIP: Record<string, string> = {
  asset: 'text-blue-300 border-blue-700/50', fix: 'text-red-300 border-red-700/50',
  strategy: 'text-purple-300 border-purple-700/50', perf: 'text-green-300 border-green-700/50',
  risk: 'text-orange-300 border-orange-700/50', signal: 'text-cyan-300 border-cyan-700/50',
  deploy: 'text-indigo-300 border-indigo-700/50',
}
const CATEGORY_LABEL: Record<string, string> = {
  asset: 'actif', fix: 'correctif', strategy: 'stratégie', perf: 'perf',
  risk: 'risque', signal: 'signal', deploy: 'déploiement',
}
const FLUX: { key: ScopeType | 'all'; label: string }[] = [
  { key: 'all', label: 'Tout' }, { key: 'fleet', label: 'Flotte' },
  { key: 'mi', label: 'Intelligence' }, { key: 'wealth', label: 'Patrimoine' },
  { key: 'bot', label: 'Bots' },
]

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function JournalClient({ entries }: { entries: BotChangelog[] }) {
  const [flux, setFlux] = useState<ScopeType | 'all'>('all')
  const filtered = useMemo(
    () => flux === 'all' ? entries : entries.filter(e => e.scope_type === flux),
    [entries, flux],
  )
  const [expanded, setExpanded] = useState(false)
  useEffect(() => { setExpanded(false) }, [flux]) // reset on flux change
  const visible = expanded ? filtered : filtered.slice(0, 5)
  const hidden = filtered.length - 5

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-6">
        {FLUX.map(f => (
          <button
            key={f.key}
            onClick={() => setFlux(f.key)}
            className={`text-sm px-3 py-1 rounded-full border ${
              flux === f.key ? 'border-accent text-accent' : 'border-border text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted italic py-8">Aucun changement pour ce filtre.</p>
      ) : (
        <div className="divide-y divide-border">
          {visible.map(entry => (
            <div key={entry.id} className="grid grid-cols-[64px_120px_1fr] gap-3 items-baseline py-2.5">
              <span className="text-xs font-mono text-muted">{fmtDate(entry.entry_date)}</span>
              <ScopeBadge scope={entry.scope_type} label={scopeLabel(entry)} />
              <div className="flex gap-2 items-baseline flex-wrap">
                <span className="text-sm text-foreground">{entry.summary}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${CATEGORY_CHIP[entry.category] ?? ''}`}>
                  {CATEGORY_LABEL[entry.category] ?? entry.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
          {hidden > 0 && (
            <button type="button" onClick={() => setExpanded(v => !v)} className="mt-4 text-xs text-accent hover:underline">
              {expanded ? 'Replier' : `Déplier (+${hidden})`}
            </button>
          )}
    </div>
  )
}
