import type { FunnelCounts } from '@/lib/funnel'

const nf = new Intl.NumberFormat('fr-FR')

/**
 * Renders nothing when the denominator is missing or zero. Degrading to "0
 * configurations testées" would turn the site's strongest claim into its weakest.
 */
export default function FunnelCounter({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_tested <= 0) return null

  return (
    <section data-testid="funnel-counter" className="bg-card border border-border rounded-lg p-4">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt className="text-xs text-muted">Configurations testées</dt>
          <dd className="text-lg font-mono">{nf.format(counts.n_tested)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Promues en bot</dt>
          <dd className="text-lg font-mono">{nf.format(counts.n_promoted)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">En argent réel</dt>
          <dd className="text-lg font-mono">{nf.format(counts.n_live)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted mt-3">
        Le rapport entre ces trois nombres est le seul qui compte. Les plateformes
        qui vendent des stratégies publient leurs gagnantes, jamais le nombre de
        tentatives.{' '}
        <a href="https://lab.algoproof.fr/cockpit/cimetiere"
           className="text-accent underline" target="_blank" rel="noopener noreferrer">
          Voir le cimetière
        </a>
      </p>
    </section>
  )
}
