// The counts of the library, between two rules: in the grammar of the home's engine
// addition (EngineLedger), a register line per figure on a phone (label left, figure
// right, a short phrase under them), one row from 640 px. No display-size number.
import type { ReactNode } from 'react'

const fr = (n: number) => n.toLocaleString('fr-FR')

export function LibraryFigure({ value, label, phrase }: { value: number; label: string; phrase: string }) {
  return (
    <div data-testid="library-figure"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-border py-3.5 first:border-t-0 sm:flex sm:flex-col sm:border-t-0 sm:py-0">
      <dt className="font-semibold sm:order-2 sm:mt-1">{label}</dt>
      <dd className="whitespace-nowrap text-right text-xl font-medium tabular-nums sm:text-left lg:text-2xl">{fr(value)}</dd>
      <dd className="col-span-2 text-sm text-muted sm:order-3 sm:mt-0.5">{phrase}</dd>
    </div>
  )
}

/** `count` figures in the row: the grid takes as many columns from 1 024 px. */
export function LibraryFigures({ count, children, className = '' }: { count: number; children: ReactNode; className?: string }) {
  const cols = count >= 5 ? 'sm:grid-cols-3 lg:grid-cols-5' : count === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
  return (
    <dl data-testid="library-figures" className={`border-y border-border sm:grid sm:gap-x-8 sm:gap-y-6 sm:py-5 ${cols} ${className}`}>
      {children}
    </dl>
  )
}
