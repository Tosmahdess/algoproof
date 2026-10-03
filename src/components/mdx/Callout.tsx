// src/components/mdx/Callout.tsx
//
// Generic callout box for blog posts. Use to draw attention to context,
// warnings, insights, or notes without breaking the flow of prose.
//
// Usage in MDX:
//   <Callout type="warning" title="Périmètre">…</Callout>
//   <Callout type="info">…</Callout>
//   <Callout type="insight" title="À retenir">…</Callout>
//
// Finitions of the « registre des décisions » redesign (2026-10-03): no label in
// tracked capitals above the text and no coloured border on one side. The box is a
// surface with a full 1 px rule; its label is the bold start of the first paragraph
// (« À retenir : … »), in French and sentence case. The type only picks the default
// label: the colour of a box never carries its meaning.
// Pinned by tests/components/mdx/encadres.test.tsx.

import type { ReactNode } from 'react'
import { BOX, BOX_TEXT, RunIn } from './box'

type CalloutType = 'info' | 'warning' | 'insight' | 'note'

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: ReactNode
}

const DEFAULT_LABEL: Record<CalloutType, string> = {
  info: 'À noter',
  warning: 'Attention',
  insight: 'À retenir',
  note: 'Note',
}

export function Callout({ type = 'note', title, children }: CalloutProps) {
  return (
    <aside role="note" className={`${BOX} my-7`}>
      <div className={BOX_TEXT}>
        <RunIn>{title ?? DEFAULT_LABEL[type]}</RunIn>{' '}
        {children}
      </div>
    </aside>
  )
}
