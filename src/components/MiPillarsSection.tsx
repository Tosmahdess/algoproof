'use client'

// How each pillar of the weather is computed, inside the folded method of /intelligence.
//
// Refonte « Le registre des décisions », page Météo (2026-10-03): the pillars come from the
// one list (lib/mi-pillars), the selected control is the site's own (surface éclairée, link
// blue contour, aria-pressed) instead of the pillar's status colour, and the two columns
// sit on the page, without a box around a surface (no nested card).
import { useState } from 'react'
import ChangelogTab from './ChangelogTab'
import type { BotChangelog } from '@/lib/types'
import { MI_PILLARS } from '@/lib/mi-pillars'
import { frNumber, NARROW_NBSP } from '@/lib/display'

const CONTROL = (active: boolean) =>
  `min-h-11 rounded border px-4 text-sm font-semibold transition-colors ${
    active ? 'bg-card-2 border-accent text-foreground' : 'border-border-strong text-foreground hover:bg-card-2'
  }`

export default function MiPillarsSection({ changelogs }: { changelogs: BotChangelog[] }) {
  const [active, setActive] = useState<string>(MI_PILLARS[0]?.id ?? 'changelog')
  const pillar = MI_PILLARS.find(p => p.id === active)

  return (
    <div>
      <div role="group" aria-label="Choisir un pilier" className="flex flex-wrap gap-2">
        {MI_PILLARS.map(p => (
          <button
            key={p.id}
            type="button"
            aria-pressed={active === p.id}
            onClick={() => setActive(p.id)}
            className={CONTROL(active === p.id)}
          >
            {p.label}
            <span className="ml-1.5 font-normal text-muted tabular-nums">{`${frNumber(p.weight, 0)}${NARROW_NBSP}%`}</span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={active === 'changelog'}
          onClick={() => setActive('changelog')}
          className={CONTROL(active === 'changelog')}
        >
          Historique des changements
          {changelogs.length > 0 && (
            <span className="ml-1.5 font-normal text-muted tabular-nums">{changelogs.length}</span>
          )}
        </button>
      </div>

      {pillar && (
        <div className="mt-5 grid gap-6 md:grid-cols-2 md:gap-8">
          <div>
            <h4 className="text-sm font-semibold mb-2">En pratique</h4>
            <p className="text-sm leading-relaxed max-w-[68ch]">{pillar.functional}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Technique</h4>
            <p className="text-sm leading-relaxed text-muted max-w-[68ch]">{pillar.technical}</p>
          </div>
        </div>
      )}

      {active === 'changelog' && (
        <div className="mt-5">
          {/* The « Voir tout le journal Intelligence » link died with /journal (2026-08-08).
              The tab keeps the dated changes in place, where the reader already is. */}
          <ChangelogTab changelogs={changelogs} sujet="la météo" />
        </div>
      )}
    </div>
  )
}
