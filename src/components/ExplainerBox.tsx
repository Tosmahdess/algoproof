'use client'

import { useState, ReactNode } from 'react'

// The « 📋 Historique » tab was removed on 2026-08-08 along with the public /journal page: a
// visitor judging a bot does not read its change log, and this was the last surface feeding it.
// ChangelogTab itself still exists — /intelligence mounts it directly for the MI pillars.
// The « Discussion » tab went on 2026-09-26 with the public comments: no caller passed it,
// and bot sheets now carry a private question form (BotQuestionForm).
interface ExplainerBoxProps {
  functional:      ReactNode
  technical:       ReactNode
  stacked?:        boolean
}

type Tab = 'functional' | 'technical'

const BODY_TEXT = 'text-sm leading-relaxed'

const TAB_STYLE = (active: boolean) =>
  `px-6 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${
    active
      ? 'text-foreground border-accent'
      : 'text-muted border-transparent hover:text-foreground'
  }`

export default function ExplainerBox({
  functional,
  technical,
  stacked = false,
}: ExplainerBoxProps) {
  const [active, setActive] = useState<Tab>('functional')

  if (stacked) {
    return (
      <div className="rounded border border-border overflow-hidden">
        <div data-section="functional" className="px-6 py-5">
          <div className={BODY_TEXT}>{functional}</div>
        </div>
        <div data-section="technical" className="border-t border-border bg-card px-6 py-5">
          <div className={BODY_TEXT}>{technical}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded border border-border overflow-hidden">
      <div className="flex border-b border-border bg-card">
        <button data-tab="functional" onClick={() => setActive('functional')} className={TAB_STYLE(active === 'functional')}>
          Comment il fonctionne
        </button>
        <button data-tab="technical" onClick={() => setActive('technical')} className={TAB_STYLE(active === 'technical')}>
          ⚙️ Technique
        </button>
      </div>

      <div className="px-6 py-5">
        {active === 'functional' && (
          <div data-section="functional" className={BODY_TEXT}>{functional}</div>
        )}
        {active === 'technical' && (
          <div data-section="technical" className={BODY_TEXT}>{technical}</div>
        )}
      </div>
    </div>
  )
}
