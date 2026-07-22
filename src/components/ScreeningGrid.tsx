import Link from 'next/link'
import { TF_ORDER, cellLabel, corpusTotals, count, frDate, type ScreeningCampaign } from '@/lib/screening'

/** Shared className so the three corpus counters carry identical visual weight — the rejected
 * count is the point of the site and must never read smaller than the standing count. */
const CORPUS_NUMBER_CLASS = 'text-3xl font-mono font-semibold tabular-nums'

export default function ScreeningGrid({ campaigns }: { campaigns: ScreeningCampaign[] }) {
  const bases = Array.from(new Set(campaigns.map((c) => c.base))).sort()
  const byKey = new Map(campaigns.map((c) => [`${c.base}|${c.tf}`, c]))
  const totals = corpusTotals(campaigns)

  return (
    <section className="space-y-6">
      {/* The only place the whole-corpus scale appears (spec section 2). */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border border-border p-4 text-center">
        <div className="space-y-1">
          <div data-testid="corpus-judged" className={CORPUS_NUMBER_CLASS}>{count(totals.judged)}</div>
          <div data-testid="corpus-strategies-label" className="text-xs text-muted uppercase tracking-widest">
            configurations jugées ({count(totals.strategies)} stratégie{totals.strategies > 1 ? 's' : ''})
          </div>
        </div>
        <div className="space-y-1">
          <div data-testid="corpus-rejected" className={CORPUS_NUMBER_CLASS}>{count(totals.rejected)}</div>
          <div className="text-xs text-muted uppercase tracking-widest">rejetées</div>
        </div>
        <div className="space-y-1">
          <div data-testid="corpus-standing" className={CORPUS_NUMBER_CLASS}>{count(totals.standing)}</div>
          <div className="text-xs text-muted uppercase tracking-widest">en observation</div>
        </div>
      </div>
      <p data-testid="corpus-framing" className="text-sm">
        J&apos;ai jugé {count(totals.judged)} configurations sur {count(totals.strategies)}
        {' '}stratégie{totals.strategies > 1 ? 's' : ''}. J&apos;en ai rejeté {count(totals.rejected)}.
        {' '}Il en reste {count(totals.standing)} en observation.
      </p>
      <p className="text-sm text-muted">
        Chaque ligne est une stratégie, chaque colonne un horizon de temps. Rien ici ne réagit
        au marché d&apos;aujourd&apos;hui : ce qui bouge, c&apos;est la mesure, pas le marché.
      </p>

      {bases.map((base) => (
        <div key={base} className="rounded-lg border border-border">
          <h3 className="px-4 py-3 text-sm font-semibold">
            <Link href={`/strategies/famille/${base}`} className="hover:underline">{base}</Link>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted">
                  <th className="px-4 py-2 font-medium">Horizon</th>
                  <th className="px-4 py-2 font-medium">Configurations jugées</th>
                  <th className="px-4 py-2 font-medium">Encore debout</th>
                  <th className="px-4 py-2 font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {TF_ORDER.map((tf) => {
                  const c: ScreeningCampaign = byKey.get(`${base}|${tf}`) ?? {
                    base, tf, state: 'never', judged_on: null, data_dir: null,
                    n_behaviors: null, n_rejected: null, n_marginal: null,
                    n_candidates: null, n_assets: null, null_bar: null,
                  }
                  return (
                    <tr key={tf} className="border-t border-border">
                      <td className="px-4 py-2 font-mono">{tf}</td>
                      <td className="px-4 py-2 tabular-nums"
                          data-testid={`cell-${base}-${tf}-judged`}>
                        {count(c.n_behaviors)}
                      </td>
                      <td className="px-4 py-2 tabular-nums"
                          data-testid={`cell-${base}-${tf}-count`}>
                        {/* A null count (export failed) must read as unknown, never as a false
                            zero (review finding I4) — only an actual number renders bare. */}
                        {c.state === 'judged' && c.n_candidates !== null ? String(c.n_candidates) : '—'}
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {cellLabel(c)}
                        {c.judged_on ? ` · ${frDate(c.judged_on)}` : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
