// src/components/ScreeningDossier.tsx
import { marginLabel, type ScreeningCampaign, type ScreeningCandidate } from '@/lib/screening'

/** French number grouping — see ScreeningGrid.tsx for the narrow no-break space rationale. */
function count(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR').replace(/[   ]/g, ' ')
}

function fr(n: number): string {
  return String(n).replace('.', ',')
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

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">
          Dossier {campaign.tf} — campagne close le {campaign.judged_on}
        </h2>
        <p className="text-sm text-muted">
          Mesuré sur un jeu de données figé ({campaign.data_dir}). Rien ici ne réagit au marché
          d&apos;aujourd&apos;hui.
        </p>
      </header>

      <div className="rounded-lg border border-border p-4 font-mono text-sm space-y-1">
        <div>{count(campaign.n_behaviors)} configurations jugées</div>
        <div className="pl-4">├─ {count(campaign.n_rejected)} rejetées</div>
        <div className="pl-4">├─ {count(campaign.n_marginal)} marginales — échouent sur exactement un critère</div>
        <div className="pl-4">└─ {count(campaign.n_candidates)} encore debout</div>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm">
          Aucune configuration ne tient. <strong>C&apos;est un résultat, pas un échec</strong> :
          la machine sait dire non, et elle le dit {count(campaign.n_behaviors)} fois sur
          {' '}{count(campaign.n_behaviors)} ici.
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
                {' '}{c.assets_go} actifs qualifiés — {c.forward_trades} trade forward
              </div>
            </article>
          ))}
        </div>
      )}

      {candidates.length === 2 && (
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
          <p>
            Et non, cela ne fait pas de {shared[0] ?? 'cet actif'} une valeur sûre validée deux
            fois : une intersection d&apos;un seul nom entre deux listes de six tirées parmi trente,
            c&apos;est <strong>exactement ce que le hasard prédit</strong>. La cause est
            arithmétique — environ huit trades par actif sur trois ans et demi. C&apos;est pourquoi
            les deux bots en observation tradent les trente actifs : la sélection se fera sur les
            données à venir, pas sur ce tableau.
          </p>
        </aside>
      )}
    </section>
  )
}
