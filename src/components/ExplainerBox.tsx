'use client'

import { useState, ReactNode } from 'react'
import DiscussionTab from './DiscussionTab'

// The « 📋 Historique » tab was removed on 2026-08-08 along with the public /journal page: a
// visitor judging a bot does not read its change log, and this was the last surface feeding it.
// ChangelogTab itself still exists — /intelligence mounts it directly for the MI pillars.
interface ExplainerBoxProps {
  functional:      ReactNode
  technical:       ReactNode
  stacked?:        boolean
  discussionSlug?: string
}

type Tab = 'functional' | 'technical' | 'discussion'

const TAB_STYLE = (active: boolean) =>
  `px-6 py-3 text-xs font-semibold tracking-widest uppercase border-b-2 -mb-px transition-colors ${
    active
      ? 'text-severe border-severe'
      : 'text-muted border-transparent hover:text-foreground'
  }`

export default function ExplainerBox({
  functional,
  technical,
  stacked = false,
  discussionSlug,
}: ExplainerBoxProps) {
  const [active, setActive] = useState<Tab>('functional')

  if (stacked) {
    return (
      <div className="rounded border border-border overflow-hidden">
        <div data-section="functional" className="px-6 py-5">
          <div className="text-sm leading-relaxed">{functional}</div>
        </div>
        <div data-section="technical" className="border-t border-border bg-card px-6 py-5">
          <div className="text-sm">{technical}</div>
        </div>
      </div>
    )
  }

  const showDiscussion = !!discussionSlug

  return (
    <div className="rounded border border-border overflow-hidden">
      <div className="flex border-b border-border bg-card">
        <button data-tab="functional" onClick={() => setActive('functional')} className={TAB_STYLE(active === 'functional')}>
          📖 Fonctionnel
        </button>
        <button data-tab="technical" onClick={() => setActive('technical')} className={TAB_STYLE(active === 'technical')}>
          ⚙️ Technique
        </button>
        {showDiscussion && (
          <button data-tab="discussion" onClick={() => setActive('discussion')} className={TAB_STYLE(active === 'discussion')}>
            💬 Discussion
          </button>
        )}
      </div>

      <div className="px-6 py-5">
        {active === 'functional' && (
          <div data-section="functional" className="text-sm leading-relaxed">{functional}</div>
        )}
        {active === 'technical' && (
          <div data-section="technical" className="text-sm">{technical}</div>
        )}
        {active === 'discussion' && showDiscussion && (
          <div data-section="discussion" className="text-sm">
            <DiscussionTab slug={discussionSlug!} />
          </div>
        )}
      </div>
    </div>
  )
}
