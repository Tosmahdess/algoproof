// src/components/ScreeningDossier.tsx
import { marginLabel, count, fr, frDate, type ScreeningCampaign, type ScreeningCandidate } from '@/lib/screening'

/** Oxford-style French join: "a", "a et b", "a, b et c". */
function joinFr(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

/**
 * The two-candidate assets exhibit's defusing paragraph. Every quantity is derived from the
 * candidates actually rendered — no history span, no hardcoded overlap or trade count (those
 * varied per dossier and were wrongly baked into prose, see review finding).
 */
function assetsExhibitParagraph(
  shared: string[], a: ScreeningCandidate, b: ScreeningCandidate, nAssets: number | null,
): string {
  const sizeA = a.qualified_assets.length
  const sizeB = b.qualified_assets.length
  const listSizePhrase = sizeA === sizeB
    ? `deux listes de ${sizeA}`
    : `une liste de ${sizeA} et une liste de ${sizeB}`

  let opening: string
  if (shared.length === 0) {
    opening = `Et ce n'est pas non plus un signal : une intersection vide entre ${listSizePhrase}, ` +
      `c'est exactement ce que produit un tirage aléatoire — la preuve, s'il en fallait une, ` +
      `qu'aucune des deux configurations ne « sait » quels actifs choisir.`
  } else if (shared.length === 1) {
    opening = `Et non, cela ne fait pas de ${shared[0]} une valeur sûre validée deux fois : une ` +
      `intersection d'un seul nom entre ${listSizePhrase}, c'est exactement ce que le hasard prédit.`
  } else {
    opening = `Et non, cela ne fait pas de ${joinFr(shared)} des valeurs sûres validées deux fois : ` +
      `une intersection de ${shared.length} noms entre ${listSizePhrase}, c'est exactement ce ` +
      `que le hasard prédit.`
  }

  // Denominator is the whole tested universe (n_assets), not assets_go (the qualified subset):
  // the point of this sentence is that each asset carries too few trades for the overlap above
  // to mean anything, and assets_go undercounts the universe ~5x, inflating the density into
  // looking meaningful — the exact misreading this sentence exists to prevent.
  let densityClause = ''
  if (a.trades !== null && b.trades !== null && nAssets) {
    const density = Math.round((a.trades + b.trades) / (2 * nAssets))
    densityClause = ` La cause est arithmétique — environ ${density} trade${density === 1 ? '' : 's'}` +
      ` par actif sur la période mesurée.`
  }

  // Bot count is derived from which candidates actually have a bot_slug — never hardcoded to
  // "the two", which asserts bots that may not exist yet (review finding I2).
  const bots = [a, b].filter((c) => c.bot_slug !== null)
  const closing = bots.length === 0
    ? ` C'est pourquoi la sélection d'actifs attend les données à venir.`
    : bots.length === 1
      ? ` C'est pourquoi le bot en observation trade tout l'univers testé : la sélection se fera` +
        ` sur les données à venir, pas sur ce tableau.`
      : ` C'est pourquoi les deux bots en observation tradent tout l'univers testé : la sélection` +
        ` se fera sur les données à venir, pas sur ce tableau.`

  return opening + densityClause + closing
}

function Margin({ id, value, bar, unit, suffix }: {
  id: string; value: number | null; bar: number | null
  unit: 'pct' | 'ratio'; suffix?: string
}) {
  if (value === null || bar === null) return null
  const m = marginLabel(value, bar, unit)
  return (
    <div data-testid={id} className="text-sm">
      {m.text}{suffix ? ` ${suffix}` : ''}
      {m.tight ? <span className="text-muted"> — un souffle</span> : null}
    </div>
  )
}

export default function ScreeningDossier({ campaign, candidates }: {
  campaign: ScreeningCampaign
  candidates: ScreeningCandidate[]
}) {
  const shared = candidates.length === 2
    ? candidates[0].qualified_assets.filter((a) => candidates[1].qualified_assets.includes(a))
    : []
  const showAssetsExhibit = candidates.length === 2
    && candidates[0].qualified_assets.length > 0
    && candidates[1].qualified_assets.length > 0

  // The three funnel buckets don't always sum to the judged total — some configurations are
  // counted elsewhere in the pipeline (review finding I3). Only computed when every count is
  // known, so a partially-null campaign never renders a bogus residual.
  const residual = campaign.n_behaviors !== null && campaign.n_rejected !== null
    && campaign.n_marginal !== null && campaign.n_candidates !== null
    ? campaign.n_behaviors - (campaign.n_rejected + campaign.n_marginal + campaign.n_candidates)
    : null

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">
          Dossier {campaign.tf} — campagne close le {frDate(campaign.judged_on)}
        </h2>
        <p className="text-sm text-muted">
          Mesuré sur un jeu de données figé{campaign.data_dir ? ` (${campaign.data_dir})` : ''}.
          {' '}Rien ici ne réagit au marché d&apos;aujourd&apos;hui.
        </p>
      </header>

      <div className="rounded-lg border border-border p-4 font-mono text-sm space-y-1">
        <div>{count(campaign.n_behaviors)} configurations jugées</div>
        <div className="pl-4">├─ {count(campaign.n_rejected)} rejetées</div>
        <div className="pl-4">├─ {count(campaign.n_marginal)} marginales — échouent sur exactement un critère</div>
        {residual !== null && residual !== 0 && (
          <div className="pl-4">├─ {count(residual)} configurations comptabilisées ailleurs</div>
        )}
        <div className="pl-4">└─ {count(campaign.n_candidates)} encore debout</div>
      </div>

      {campaign.n_candidates === 0 ? (
        <p className="text-sm">
          Aucune configuration ne tient. <strong>C&apos;est un résultat, pas un échec</strong> :
          la machine sait dire non, et elle le dit {count(campaign.n_behaviors)} fois sur
          {' '}{count(campaign.n_behaviors)} ici.
        </p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted">
          Détail indisponible : le funnel annonce {count(campaign.n_candidates)} configuration(s)
          {' '}retenue(s), mais le détail par candidate n&apos;a pas pu être chargé pour cette campagne.
        </p>
      ) : (
        <div className="space-y-4">
          {candidates.map((c) => (
            <article key={c.label} className="rounded-lg border border-border p-4 space-y-2">
              <h3 className="font-semibold">
                Candidat {c.label}
                <span className="ml-2 text-sm font-normal text-muted">
                  {c.filter_families.join(' + ')}
                </span>
              </h3>
              <Margin id={`candidate-${c.label}-null`} value={c.null_pct}
                      bar={campaign.null_bar} unit="pct" />
              <Margin id={`candidate-${c.label}-dd`} value={c.dd} bar={c.dd_limit} unit="pct"
                      suffix="de repli maximum" />
              <Margin id={`candidate-${c.label}-wf`} value={c.wf_oos} bar={c.wf_bar}
                      unit="ratio" suffix="hors échantillon" />
              <div data-testid={`candidate-${c.label}-perf`} className="text-sm text-muted">
                backtest : PF {c.pf_net !== null ? fr(c.pf_net) : '—'} sur {c.trades} trades,
                {' '}{c.assets_go} actifs qualifiés — {c.forward_trades} trade{c.forward_trades > 1 ? 's' : ''} forward
              </div>
            </article>
          ))}
        </div>
      )}

      {showAssetsExhibit && (
        <aside className="rounded-lg border border-border p-4 space-y-3 text-sm">
          <h3 className="font-semibold">
            Pièce à conviction — pourquoi je ne dirai pas quels actifs trader
          </h3>
          <p>
            Les deux candidates sont des configurations voisines de la même stratégie. Si l&apos;une
            « savait » quels actifs marchent, l&apos;autre devrait à peu près être d&apos;accord.
          </p>
          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <div className="text-muted">candidat A</div>
              {candidates[0].qualified_assets.join(' · ')}
            </div>
            <div>
              <div className="text-muted">candidat B</div>
              {candidates[1].qualified_assets.join(' · ')}
            </div>
          </div>
          <p data-testid="exhibit-intersection">
            En commun : {shared.join(', ') || 'aucun'}.
          </p>
          <p>{assetsExhibitParagraph(shared, candidates[0], candidates[1], campaign.n_assets)}</p>
        </aside>
      )}
    </section>
  )
}
