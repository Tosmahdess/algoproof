// The four pillars of the weather as a register (refonte « Le registre des décisions »,
// page Météo, 2026-10-03). One row per pillar: its name and weight, what it follows, and
// its score at the last reading of the history, aligned right like a result column.
//
// Audit 2026-10, n° 9 (P1): the pillar scores wore the gain and loss tokens the wrong way
// round (Sentiment +48 in red, Actualités −6,1 in green). A pillar score is neither a gain
// nor a loss: it is written in ink, with its sign in the text, and « — » without colour
// when absent.
//
// Server-rendered from the last row of the seven-day history the page already reads, so
// the register and the chart above it speak of the same reading.
import type { MiSnapshot } from '@/lib/types'
import { frNumber, NARROW_NBSP } from '@/lib/display'
import { longDateTime } from '@/lib/format-date'
import { MI_PILLARS, scaleText, scoreText } from '@/lib/mi-pillars'

export default function PillarsLedger({ snapshot }: { snapshot: MiSnapshot | null }) {
  return (
    <section aria-labelledby="piliers" className="border-t border-border pt-8 sm:pt-10">
      <h2 id="piliers" className="text-2xl font-semibold tracking-tight">Les quatre piliers</h2>
      <p className="mt-2 max-w-[68ch] text-muted">
        {`Chaque pilier est noté ${scaleText()}, et le score global les pondère.`}
        {snapshot && <>{' '}{`Relevé le ${longDateTime(snapshot.snapshot_at)}.`}</>}
      </p>

      <div aria-hidden="true" className="mt-6 hidden border-b border-border pb-2 text-xs text-muted md:grid md:grid-cols-[13rem_minmax(0,1fr)_8rem] md:gap-x-6">
        <span>Pilier et poids</span>
        <span>Ce qu’il suit</span>
        <span className="text-right">Score</span>
      </div>
      <ul className="mt-4 border-t border-border md:mt-0 md:border-t-0">
        {MI_PILLARS.map(p => {
          const value = snapshot ? (snapshot[p.key] as number | null) : null
          return (
            <li
              key={p.id}
              data-testid="pillar-row"
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-border py-4 md:grid-cols-[13rem_minmax(0,1fr)_8rem] md:items-baseline md:gap-x-6"
            >
              <p>
                <span data-testid="pillar-name" className="font-semibold">{p.label}</span>
                <span className="ml-2 text-xs text-muted tabular-nums">{`poids ${frNumber(p.weight, 0)}${NARROW_NBSP}%`}</span>
              </p>
              <p className="col-start-1 text-sm text-muted md:col-start-2 md:row-start-1">{p.follows}</p>
              <p
                data-testid="pillar-score"
                className="col-start-2 row-start-1 text-right text-xl font-medium tabular-nums md:col-start-3"
              >
                {scoreText(value)}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
