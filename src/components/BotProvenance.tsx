import Link from 'next/link'
import { marginLabel, type ScreeningCampaign, type ScreeningCandidate } from '@/lib/screening'

/**
 * French number grouping. toLocaleString('fr-FR') inserts a narrow no-break space (U+202F,
 * sometimes U+00A0) between groups — invisible in a terminal but not a literal ASCII space,
 * so a raw-textContent regex match (this component's own test) would miss it. Testing-Library's
 * getByText normalizer collapses that for free, but this component is asserted on
 * data-testid + textContent directly, so the replacement must happen here.
 */
function count(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR').replace(/ | /g, ' ')
}

export default function BotProvenance({ campaign, candidate }: {
  campaign: ScreeningCampaign
  candidate: ScreeningCandidate
}) {
  const margin = candidate.null_pct !== null && campaign.null_bar !== null
    ? marginLabel(candidate.null_pct, campaign.null_bar, 'pct').text
    : null

  return (
    <aside data-testid="provenance"
           className="rounded-lg border border-border p-4 text-sm space-y-1 mb-8">
      <div className="text-xs uppercase tracking-widest text-muted">D&apos;où vient ce bot</div>
      <p>
        Issu de la campagne {campaign.base} {campaign.tf}, close le {campaign.judged_on} :
        {' '}{count(campaign.n_behaviors)} configurations jugées, {count(campaign.n_candidates)} retenues.
        {margin ? ` Celle-ci tient sa barre de hasard à ${margin}.` : ''}
        {' '}Elle est en observation — {candidate.forward_trades} trade forward à ce jour.
      </p>
      <Link href={`/strategies/famille/${campaign.base}`} className="text-positive hover:underline">
        Voir le dossier complet →
      </Link>
    </aside>
  )
}
