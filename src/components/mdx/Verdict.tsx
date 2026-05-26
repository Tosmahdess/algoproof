// src/components/mdx/Verdict.tsx
//
// Verdict callout — colored decision badge with a one-line conclusion.
// Use at the end of a phase or section to make the decision visible at a glance.
//
// Usage in MDX:
//   <Verdict status="no-go" label="Verdict final">
//     Stratégie archivée. Pas de paper, pas de live.
//   </Verdict>

import type { ReactNode } from 'react'

type VerdictStatus = 'go' | 'go-cond' | 'no-go' | 'overfit' | 'pending'

interface VerdictProps {
  status: VerdictStatus
  label?: string
  children: ReactNode
}

const styles: Record<VerdictStatus, { badge: string; border: string; bg: string }> = {
  'go':       { badge: 'bg-positive/15 text-positive border border-positive/40', border: 'border-l-positive/60', bg: 'bg-positive/[0.03]' },
  'go-cond':  { badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/40', border: 'border-l-amber-500/60', bg: 'bg-amber-500/[0.03]' },
  'no-go':    { badge: 'bg-negative/15 text-negative border border-negative/40', border: 'border-l-negative/60', bg: 'bg-negative/[0.03]' },
  'overfit':  { badge: 'bg-negative/15 text-negative border border-negative/40', border: 'border-l-negative/60', bg: 'bg-negative/[0.03]' },
  'pending':  { badge: 'bg-muted/15 text-muted border border-muted/30', border: 'border-l-muted/40', bg: 'bg-card/40' },
}

const defaultText: Record<VerdictStatus, string> = {
  'go':      'GO',
  'go-cond': 'GO CONDITIONNEL',
  'no-go':   'NO GO',
  'overfit': 'OVERFIT',
  'pending': 'EN ATTENTE',
}

export function Verdict({ status, label, children }: VerdictProps) {
  const s = styles[status]
  return (
    <aside className={`not-prose my-8 border-l-2 ${s.border} ${s.bg} pl-5 pr-5 py-4 rounded-r-md`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider ${s.badge}`}>
          {defaultText[status]}
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold">{label}</span>
        )}
      </div>
      <div className="text-[15px] text-foreground/90 leading-relaxed [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-accent/90 [&_strong]:text-foreground [&_strong]:font-semibold">
        {children}
      </div>
    </aside>
  )
}
