import { linkClass } from '@/lib/link-roles'
import { count, fr, frDate, type ScreeningCampaign, type ScreeningCandidate } from '@/lib/screening'
import { labUrl } from '@/lib/lab-links'

// The random-control line used to read « Celle-ci tient sa barre de hasard à 95,16 pour une
// barre à 95 (un souffle) ». The bar is one of the judge's CLASSIFIED thresholds, and it was
// coming straight out of `screening_campaigns.null_bar`, readable with the site's publishable
// key (measured 2026-09-12; see src/lib/screening.ts and migration 046).
//
// What stays is the MEASURED value, which says what this configuration did. The « un souffle »
// fragility annotation goes with the bar: it cannot be computed without one, and computing it
// server-side then printing it would publish the threshold by inference.
export default function BotProvenance({ campaign, candidate }: {
  campaign: ScreeningCampaign
  candidate: ScreeningCandidate
}) {
  return (
    // Refonte lot 3 (2026-10-02): the page gives this its section and its title
    // (« D'où vient ce bot »); the block itself is plain text, no card.
    <div data-testid="provenance" className="text-sm space-y-2 max-w-[68ch]">
      <p>
        {`Issu de la campagne ${campaign.base} ${campaign.tf}, close le ${frDate(campaign.judged_on)} : ${count(campaign.n_behaviors)} configurations jugées, ${count(campaign.n_candidates)} retenues.${
          candidate.null_pct !== null ? ` Son contrôle contre le hasard est mesuré à ${fr(candidate.null_pct)} sur 100.` : ''
        } Elle est en observation : ${candidate.forward_trades} trade${candidate.forward_trades > 1 ? 's' : ''} forward à ce jour.`}
      </p>
      <a
        href={labUrl('https://lab.algoproof.fr/cockpit/survivants', 'fiche-bot-provenance')}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass('inline')}
      >
        Voir le dossier complet ↗
      </a>
    </div>
  )
}
