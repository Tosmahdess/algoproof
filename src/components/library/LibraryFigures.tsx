// The counts of the library, between two rules, in the grammar of the home's engine
// addition (EngineLedger): the figure, its word, a short phrase. Two columns on a
// phone so the register still starts near the first screen, one row from 640 px. No
// display-size number.
import type { ReactNode } from 'react'

const fr = (n: number) => n.toLocaleString('fr-FR')

export function LibraryFigure({ value, label, phrase }: { value: number; label: string; phrase: string }) {
  return (
    <div data-testid="library-figure" className="flex min-w-0 flex-col">
      <dt className="order-2 mt-1 font-semibold">{label}</dt>
      <dd className="order-1 whitespace-nowrap text-xl font-medium tabular-nums lg:text-2xl">{fr(value)}</dd>
      <dd className="order-3 mt-0.5 text-sm text-muted">{phrase}</dd>
    </div>
  )
}

/** `count` figures in the row: the grid takes as many columns from 1 024 px.
 *  `closed` false leaves the bottom rule to the section that follows. */
export function LibraryFigures({ count, children, className = '', closed = true }: {
  count: number; children: ReactNode; className?: string; closed?: boolean
}) {
  const cols = count >= 5 ? 'sm:grid-cols-3 lg:grid-cols-5' : count === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
  return (
    <dl data-testid="library-figures" className={`grid grid-cols-2 gap-x-6 gap-y-5 border-t ${closed ? 'border-b' : ''} border-border py-5 sm:gap-x-8 ${cols} ${className}`}>
      {children}
    </dl>
  )
}
