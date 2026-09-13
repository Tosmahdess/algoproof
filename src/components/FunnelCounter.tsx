import type { FunnelCounts } from '@/lib/funnel'
import EngineRejudgeNotice from '@/components/EngineRejudgeNotice'

const nf = new Intl.NumberFormat('fr-FR')

/**
 * Renders nothing when the denominator is missing or zero. Degrading to "0
 * configurations balayées" would turn the site's strongest claim into its
 * weakest.
 *
 * « balayées » and « jugées » are the same pair, under the same names, as the
 * cockpit hero on lab.algoproof.fr — that is deliberate: the two sites must
 * never again disagree about what the engine has done.
 */
export default function FunnelCounter({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_swept <= 0) return null

  return (
    <section data-testid="funnel-counter" className="bg-card border border-border rounded-lg p-4">
      <EngineRejudgeNotice className="mb-3" />
      <dl data-testid="funnel-engine" className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt className="text-xs text-muted">Configurations balayées</dt>
          <dd className="text-lg font-mono">{nf.format(counts.n_swept)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Jugées au gantelet</dt>
          <dd className="text-lg font-mono">{nf.format(counts.n_judged)}</dd>
        </div>
      </dl>
      {/* The swept -> judged drop is the only step a visitor cannot infer, and it
          is an order of magnitude. Said plainly, and said as what it is: the
          gauntlet costs compute, so it runs on part of the corpus. NOT "the best
          ones" -- the cap is a budget, and it was measured in the vault to
          anti-select survivors rather than keep them. The test pins both. */}
      <p className="text-xs text-muted mt-3">
        Tout ce qui est balayé n&apos;est pas jugé : le gantelet complet coûte du
        calcul, alors il ne passe qu&apos;une partie du corpus. Le rapport entre ces
        nombres est le seul qui compte. Les plateformes
        qui vendent des stratégies publient leurs gagnantes, jamais le nombre de
        tentatives.{' '}
        <a href="https://lab.algoproof.fr/cockpit/cimetiere"
           className="text-accent underline" target="_blank" rel="noopener noreferrer">
          Voir le cimetière
        </a>
      </p>
      {/* Outside the funnel, visually and in words (audit 2026-09-10). The two fleet
          counts sat under « Jugées au gantelet », labelled as its next steps, while
          funnel_counts counts EVERY bot in paper or live, the ones deployed by hand
          before the engine included (migration 020, lines 16-17). */}
      <div data-testid="funnel-fleet" className="mt-4 pt-3 border-t border-border">
        <p className="text-xs text-muted mb-2">
          Hors de cet entonnoir : toute ma flotte, y compris les bots que j&apos;ai
          déployés à la main avant le moteur.
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-xs text-muted">Bots en service (simulation ou argent réel)</dt>
            <dd className="text-lg font-mono">{nf.format(counts.n_promoted)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Dont en argent réel</dt>
            <dd className="text-lg font-mono">{nf.format(counts.n_live)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
