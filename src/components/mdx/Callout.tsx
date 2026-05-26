// src/components/mdx/Callout.tsx
//
// Generic callout box for blog posts. Use to draw attention to context,
// warnings, insights, or notes without breaking the flow of prose.
//
// Usage in MDX:
//   <Callout type="warning" title="Scope">…</Callout>
//   <Callout type="info">…</Callout>
//   <Callout type="insight" title="À retenir">…</Callout>

import type { ReactNode } from 'react'

type CalloutType = 'info' | 'warning' | 'insight' | 'note'

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: ReactNode
}

const styles: Record<CalloutType, {
  border: string
  bg: string
  accent: string
  label: string
}> = {
  info:    { border: 'border-accent/40',   bg: 'bg-accent/[0.04]',   accent: 'text-accent',   label: 'INFO' },
  warning: { border: 'border-amber-500/40', bg: 'bg-amber-500/[0.04]', accent: 'text-amber-400', label: 'ATTENTION' },
  insight: { border: 'border-positive/40', bg: 'bg-positive/[0.04]', accent: 'text-positive', label: 'INSIGHT' },
  note:    { border: 'border-border',      bg: 'bg-card/40',         accent: 'text-muted',    label: 'NOTE' },
}

export function Callout({ type = 'note', title, children }: CalloutProps) {
  const s = styles[type]
  return (
    <aside
      className={`not-prose my-7 border-l-2 ${s.border} ${s.bg} pl-4 pr-4 py-3 rounded-r-md`}
    >
      <div className={`text-[10px] uppercase tracking-[0.18em] ${s.accent} font-semibold mb-1.5`}>
        {title ?? s.label}
      </div>
      <div className="text-sm text-foreground/85 leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-accent/90 [&_strong]:text-foreground [&_strong]:font-semibold">
        {children}
      </div>
    </aside>
  )
}
