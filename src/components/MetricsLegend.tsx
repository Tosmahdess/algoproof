// What PF, WR and DD mean, placed right under the first cards that print them.
// The fleet page explained them in its last paragraph, 3 500 px below the first
// PF on a phone (counter-audit 2026-09-26, F-M4). The sigles stay in the cards
// (closed vocabulary, conception §4); the prose names them in full, and each
// term opens its lexicon definition in place.
import Link from 'next/link'
import TermPopover from '@/components/TermPopover'
import { linkClass } from '@/lib/link-roles'

export default function MetricsLegend({ className = '' }: { className?: string }) {
  return (
    <p data-testid="metrics-legend" className={`text-xs text-muted leading-relaxed ${className}`}>
      Comment lire : le <TermPopover id="profit-factor">PF</TermPopover> (profit factor) mesure
      les gains divisés par les pertes, au-dessus de 1 la stratégie gagne. Le{' '}
      <TermPopover id="win-rate">WR</TermPopover> (win rate) est la part de trades gagnants, le{' '}
      <TermPopover id="drawdown">DD</TermPopover> (drawdown) la pire baisse depuis un sommet. Plus de définitions
      dans le <Link href="/lexique" className={linkClass('inline')}>lexique</Link>.
    </p>
  )
}
