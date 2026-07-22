import { marginLabel, count, frDate, type ScreeningCampaign, type ScreeningCandidate } from '@/lib/screening'

export default function BotProvenance({ campaign, candidate }: {
  campaign: ScreeningCampaign
  candidate: ScreeningCandidate
}) {
  const margin = candidate.null_pct !== null && campaign.null_bar !== null
    ? marginLabel(candidate.null_pct, campaign.null_bar, 'pct')
    : null

  return (
    <aside data-testid="provenance"
           className="rounded-lg border border-border p-4 text-sm space-y-1 mb-8">
      <div className="text-xs uppercase tracking-widest text-muted">D&apos;où vient ce bot</div>
      <p>
        Issu de la campagne {campaign.base} {campaign.tf}, close le {frDate(campaign.judged_on)} :
        {' '}{count(campaign.n_behaviors)} configurations jugées, {count(campaign.n_candidates)} retenues.
        {margin ? ` Celle-ci tient sa barre de hasard à ${margin.text}${margin.tight ? ' — un souffle' : ''}.` : ''}
        {' '}Elle est en observation — {candidate.forward_trades} trade{candidate.forward_trades > 1 ? 's' : ''} forward à ce jour.
      </p>
      <a
        href={`https://lab.algoproof.fr/moteur-backtest/${campaign.base}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline"
      >
        Voir le dossier complet →
      </a>
    </aside>
  )
}
