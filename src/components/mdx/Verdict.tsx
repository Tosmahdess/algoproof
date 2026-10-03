// src/components/mdx/Verdict.tsx
//
// Verdict box: the decision in words, then its one-line conclusion. Use at the end
// of a phase or section to make the decision visible at a glance.
//
// Usage in MDX:
//   <Verdict status="no-go" label="Décision finale">
//     Stratégie archivée. Pas de paper, pas de live.
//   </Verdict>
//
// Finitions of the « registre des décisions » redesign (2026-10-03): the badge in
// tracked capitals (« NO GO ») and the coloured left border are gone. The box is a
// surface with a full 1 px rule, like every article box; the verdict opens the text
// in bold (« Décision finale : rejet. »), and only its state word keeps the state
// colour. A positive verdict is ink: green is the wordmark's.
// Pinned by tests/components/mdx/encadres.test.tsx.

import type { ReactNode } from 'react'
import { BOX, BOX_TEXT } from './box'

type VerdictStatus = 'go' | 'go-cond' | 'no-go' | 'overfit' | 'pending'

interface VerdictProps {
  status: VerdictStatus
  label?: string
  children: ReactNode
}

const STATE: Record<VerdictStatus, { word: string; tone: string }> = {
  'go':      { word: 'feu vert', tone: 'text-foreground' },
  'go-cond': { word: 'feu vert sous conditions', tone: 'text-warning' },
  'no-go':   { word: 'rejet', tone: 'text-negative' },
  'overfit': { word: 'surajustement', tone: 'text-negative' },
  'pending': { word: 'en attente', tone: 'text-muted' },
}

export function Verdict({ status, label, children }: VerdictProps) {
  const s = STATE[status]
  return (
    <aside role="note" className={`${BOX} my-8`}>
      <div className={BOX_TEXT}>
        <strong className="font-semibold text-foreground">
          {label ?? 'Verdict'}{' : '}
          <span data-verdict-state className={s.tone}>{s.word}</span>.
        </strong>{' '}
        {children}
      </div>
    </aside>
  )
}
