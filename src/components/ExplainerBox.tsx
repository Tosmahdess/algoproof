'use client'

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'

// The « 📋 Historique » tab was removed on 2026-08-08 along with the public /journal page: a
// visitor judging a bot does not read its change log, and this was the last surface feeding it.
// ChangelogTab itself still exists — /intelligence mounts it directly for the MI pillars.
// The « Discussion » tab went on 2026-09-26 with the public comments: no caller passed it,
// and bot sheets now carry a private question form (BotQuestionForm).
//
// Refonte lot 3 (2026-10-02, audit 2026-10 constats 33 and 34): real tabs for assistive
// technology (tablist, tab, aria-selected, tabpanel, arrow keys), no emoji in the label,
// and a panel stays mounted once opened, so the Technique tab does not ask the recipe
// route again at every visit.
interface ExplainerBoxProps {
  functional:      ReactNode
  technical:       ReactNode
  stacked?:        boolean
}

type Tab = 'functional' | 'technical'

const TABS: { key: Tab; label: string }[] = [
  { key: 'functional', label: 'Comment il fonctionne' },
  { key: 'technical', label: 'Technique' },
]

const BODY_TEXT = 'text-sm leading-relaxed'

const TAB_STYLE = (active: boolean) =>
  `min-h-11 px-5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
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
  const [opened, setOpened] = useState<Set<Tab>>(() => new Set<Tab>(['functional']))
  const base = useId()

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

  function open(tab: Tab) {
    setActive(tab)
    setOpened(prev => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const i = TABS.findIndex(t => t.key === active)
    const next = e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
    open(TABS[next].key)
    document.getElementById(`${base}-tab-${TABS[next].key}`)?.focus()
  }

  const content: Record<Tab, ReactNode> = { functional, technical }

  return (
    <div className="border-t border-border">
      <div role="tablist" aria-label="Explications" className="flex border-b border-border">
        {TABS.map(t => (
          <button
            key={t.key}
            id={`${base}-tab-${t.key}`}
            type="button"
            role="tab"
            data-tab={t.key}
            aria-selected={active === t.key}
            aria-controls={`${base}-panel-${t.key}`}
            tabIndex={active === t.key ? 0 : -1}
            onClick={() => open(t.key)}
            onKeyDown={onKeyDown}
            className={TAB_STYLE(active === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map(t => (
        <div
          key={t.key}
          id={`${base}-panel-${t.key}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${t.key}`}
          hidden={active !== t.key}
          tabIndex={0}
          className="py-5"
        >
          {opened.has(t.key) && (
            <div data-section={t.key} className={BODY_TEXT}>{content[t.key]}</div>
          )}
        </div>
      ))}
    </div>
  )
}
