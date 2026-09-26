// The one line of the home that counts bots (lot 3; D059). It sits beside the
// engine's balance sheet and never inside it: the engine counts configurations,
// the fleet counts bots, some of them deployed by hand before the engine existed.
// Extracted from the funnel when its bars were retired (counter-audit 2026-09-26).
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import { labUrl } from '@/lib/lab-links'

export default function FleetLine({ live, paper }: { live: number; paper: number }) {
  return (
    <p data-testid="home-fleet-line" className="text-xs text-muted leading-relaxed">
      À part, la flotte : <strong className="text-foreground font-mono">{live + paper}</strong>{' '}bots en service, dont ceux
      déployés à la main avant le moteur, et <strong className="text-foreground font-mono">{live}</strong>{' '}avec mon argent.
      Les plateformes qui vendent des stratégies publient leurs gagnantes, jamais le nombre de tentatives.{' '}
      <a href={labUrl('https://lab.algoproof.fr/cockpit/cimetiere', 'funnel')} target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>Voir le cimetière</a>
      {' · '}
      <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>Comment je décide</Link>
    </p>
  )
}
