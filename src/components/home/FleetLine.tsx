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
      Les <strong className="text-foreground tabular-nums">{live + paper}</strong>{' '}bots en service comptent aussi ceux que
      j’ai déployés à la main avant le moteur ; <strong className="text-foreground tabular-nums">{live}</strong>{' '}tournent avec mon argent.
      Je publie aussi les tentatives rejetées pour que tu puisses voir comment je les ai choisies.{' '}
      <a href={labUrl('https://lab.algoproof.fr/cockpit/cimetiere', 'funnel')} target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>Voir le cimetière</a>
      {' · '}
      <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>Comment je décide</Link>
    </p>
  )
}
