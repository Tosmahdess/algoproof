'use client'

import { useState } from 'react'
import ChangelogTab from './ChangelogTab'
import type { BotChangelog } from '@/lib/types'

interface Pillar {
  id: string
  label: string
  weight: string
  color: string
  functional: string
  technical: string
}

interface Props {
  pillars: Pillar[]
  changelogs: BotChangelog[]
}

const TAB_STYLE = (active: boolean) =>
  `px-4 py-2 text-xs font-semibold tracking-widest uppercase rounded transition-colors whitespace-nowrap ${
    active
      ? 'bg-card text-foreground'
      : 'text-muted hover:text-foreground'
  }`

export default function MiPillarsSection({ pillars, changelogs }: Props) {
  const tabs = [...pillars.map(p => p.id), 'changelog']
  const [active, setActive] = useState(pillars[0]?.id ?? 'changelog')

  const activePillar = pillars.find(p => p.id === active)

  return (
    <div className="rounded border border-border overflow-hidden">

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto bg-card px-3 py-2 border-b border-border">
        {pillars.map(p => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={TAB_STYLE(active === p.id)}
            style={active === p.id ? { color: p.color } : undefined}
          >
            <span>{p.label}</span>
            <span className="ml-1.5 text-[9px] opacity-60 font-mono">{p.weight}</span>
          </button>
        ))}
        <button
          onClick={() => setActive('changelog')}
          className={TAB_STYLE(active === 'changelog')}
          style={active === 'changelog' ? { color: '#ff6b35' } : undefined}
        >
          Historique
          {changelogs.length > 0 && (
            <span className="ml-1.5 text-[9px] font-mono opacity-60">{changelogs.length}</span>
          )}
        </button>
      </div>

      {/* Pillar content */}
      {activePillar && (
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">
              En pratique
            </p>
            <p className="text-sm leading-relaxed">{activePillar.functional}</p>
          </div>
          <div className="px-6 py-5 bg-card">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">
              Technique
            </p>
            <p className="text-sm leading-relaxed text-muted">{activePillar.technical}</p>
          </div>
        </div>
      )}

      {/* Changelog */}
      {active === 'changelog' && (
        <div className="px-6 py-5">
          <ChangelogTab changelogs={changelogs} />
        </div>
      )}

    </div>
  )
}
