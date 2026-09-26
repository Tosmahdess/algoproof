// The engine in the hero, as a unit chart (counter-audit 2026-09-26).
//
// It replaces the funnel's four full-width bars: the owner found they said nothing
// the numbers did not, and the hero's left column ended 226 px above the three
// real-money cards beside it. One dot per judged configuration of the ratio, one
// lit: « 1 sur 500 » that can be counted, no axis to read. The ratio is the one
// the funnel always printed (heroRatio), not a new number.
//
// Same rules as the funnel it replaces: configurations only, never a bot (D059,
// the fleet line lives in EngineSurvival), and no cimetière link inside.
import type { FunnelCounts } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { heroRatio } from '@/lib/hero-ratio'
import { floorSharePct } from '@/lib/cockpit-share'

const n = (v: number) => frNumber(v, 0)

// Past this many dots the grid stops being countable (and taller than the column);
// the figures still say the ratio.
const MAX_DOTS = 1000
const COLUMNS = 25

function UnitChart({ total }: { total: number }) {
  return (
    <div
      data-testid="engine-unit-chart"
      role="img"
      aria-label={`1 sur ${n(total)} : un point par configuration jugée, un seul retenu`}
      className="grid gap-[3px] w-max shrink-0"
      style={{ gridTemplateColumns: `repeat(${COLUMNS}, 5px)` }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-dot={i === total - 1 ? 'lit' : 'off'}
          className={`block h-[5px] w-[5px] rounded-full ${i === total - 1 ? 'bg-foreground scale-[1.8] ring-2 ring-foreground/25' : 'bg-border-strong'}`}
        />
      ))}
    </div>
  )
}

export default function EngineSummary({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_swept <= 0) return null
  const ratio = heroRatio(counts.n_go, counts.n_judged)
  const judgedShare = floorSharePct(counts.n_judged, counts.n_swept)
  const noGoShare = floorSharePct(counts.n_no_go, counts.n_judged)
  const marginalShare = floorSharePct(counts.n_marginal, counts.n_judged)

  return (
    <section
      data-testid="home-funnel"
      aria-labelledby="home-engine-title"
      className="bg-card border border-border rounded-lg p-4 sm:p-5"
    >
      <h2 id="home-engine-title" className="text-sm font-semibold mb-3">Ce que mon moteur a jugé</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {ratio !== null && ratio <= MAX_DOTS && <UnitChart total={ratio} />}
        <dl className="grid gap-2 text-xs text-muted">
          <div>
            <dt className="sr-only">Configurations balayées</dt>
            <dd><span className="font-mono text-base text-foreground tabular-nums">{n(counts.n_swept)}</span>{' '}configurations balayées</dd>
          </div>
          <div>
            <dt className="sr-only">Jugées</dt>
            <dd>
              <span className="font-mono text-base text-foreground tabular-nums">{n(counts.n_judged)}</span>{' '}jugées par mes quatre contrôles
              {judgedShare !== null && ` (${judgedShare} % des balayées)`}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Candidates</dt>
            <dd>
              <span className="font-mono text-base text-foreground tabular-nums">{n(counts.n_go)}</span>{' '}candidates
              {ratio !== null && <>, soit{' '}<b className="text-foreground font-medium">1 sur {n(ratio)}{' '}jugées</b></>}
            </dd>
          </div>
        </dl>
      </div>
      <p data-testid="funnel-verdicts" className="text-xs text-muted mt-3 leading-relaxed">
        {n(counts.n_no_go)}{' '}recalées{noGoShare !== null && ` · ${noGoShare} %`}, {n(counts.n_marginal)}{' '}en sursis
        {marginalShare !== null && ` · ${marginalShare} %`}. Une candidate n’est pas une gagnante : elle a gagné le droit
        d’être surveillée en simulation.
      </p>
    </section>
  )
}
