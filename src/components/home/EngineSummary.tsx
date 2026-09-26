// The engine's balance sheet, in the hero (counter-audit 2026-09-26, proposal A of
// Codex Astra, chosen by the owner over a unit chart and over a ranking).
//
// It replaces the funnel's four full-width bars, which the owner found said nothing
// the numbers did not, and it fills the 226 px the hero's left column ended above
// the three real-money cards. Typographic on purpose: the ratio first, its
// denominator beside it, the three verdicts as counts, and two plain sentences for
// the words a first visitor does not know (configuration, candidate).
//
// Same rules as the funnel it replaces: configurations only, never a bot (D059,
// the fleet line is FleetLine, outside this block), no cimetière link inside, and
// the swept corpus never called « rejected »: most of it was never judged.
import Link from 'next/link'
import type { FunnelCounts } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { heroRatio } from '@/lib/hero-ratio'
import { linkClass } from '@/lib/link-roles'

const n = (v: number) => frNumber(v, 0)

export default function EngineSummary({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_swept <= 0) return null
  const ratio = heroRatio(counts.n_go, counts.n_judged)

  return (
    <section
      data-testid="home-funnel"
      aria-labelledby="home-engine-title"
      className="bg-card border border-border rounded-lg p-4 sm:p-5"
    >
      <h2 id="home-engine-title" className="text-sm font-semibold">Ce que je retiens après quatre épreuves</h2>
      <p className="text-xs text-muted mt-0.5">
        Sur{' '}<span className="font-mono text-foreground">{n(counts.n_judged)}</span>{' '}configurations jugées
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8">
        {ratio !== null && (
          <div>
            <p className="font-mono text-3xl font-medium leading-none tabular-nums">≈ 1 sur {n(ratio)}</p>
            <p className="text-xs text-muted mt-1.5">configurations jugées devient candidate</p>
          </div>
        )}
        <dl data-testid="funnel-verdicts" className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm sm:max-w-[16rem]">
          <dt className="text-muted">Recalées</dt>
          <dd className="font-mono tabular-nums text-right">{n(counts.n_no_go)}</dd>
          <dt className="text-muted">En sursis</dt>
          <dd className="font-mono tabular-nums text-right">{n(counts.n_marginal)}</dd>
          <dt className="text-foreground">Candidates</dt>
          <dd className="font-mono tabular-nums text-right text-foreground">{n(counts.n_go)}</dd>
        </dl>
      </div>

      <p className="text-xs text-muted mt-3 leading-relaxed">
        Une configuration, c’est une stratégie avec des réglages précis. Une candidate peut être surveillée
        en simulation, sans argent.
      </p>

      <div className="mt-3 pt-2 border-t border-border flex flex-wrap items-start justify-between gap-x-4">
        <details className="text-xs text-muted min-w-0">
          <summary className="cursor-pointer min-h-10 flex items-center">
            <span><span className="font-mono">{n(counts.n_swept)}</span>{' '}balayées · comprendre le périmètre</span>
          </summary>
          <p className="pb-2 max-w-[60ch] leading-relaxed">
            Mon moteur a énuméré ces configurations.{' '}<span className="font-mono">{n(counts.n_judged)}</span>{' '}ont été
            jugées par les quatre épreuves. Les autres n’ont pas de verdict de ces quatre épreuves.
          </p>
        </details>
        <Link href="/strategies#comment-je-decide" className={linkClass('inline', 'text-xs min-h-10 inline-flex items-center')}>
          Comment je décide →
        </Link>
      </div>
    </section>
  )
}
