import Link from 'next/link'
import { TF_ORDER, cellLabel, type ScreeningCampaign } from '@/lib/screening'

/**
 * 73770 -> "73 770" with a narrow no-break space (U+202F), the French convention.
 * `toLocaleString('fr-FR')` already groups with U+202F on full-ICU Node builds, but the
 * replace is explicit so the separator is correct regardless of the runtime's ICU data
 * (some builds fall back to a regular space or NBSP for the same locale).
 */
function count(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR').replace(/[   ]/g, ' ')
}

export default function ScreeningGrid({ campaigns }: { campaigns: ScreeningCampaign[] }) {
  const bases = Array.from(new Set(campaigns.map((c) => c.base))).sort()
  const byKey = new Map(campaigns.map((c) => [`${c.base}|${c.tf}`, c]))

  return (
    <section className="space-y-6">
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
                    n_candidates: null, null_bar: null,
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
                        {c.state === 'judged' ? String(c.n_candidates ?? 0) : '—'}
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {cellLabel(c)}
                        {c.judged_on ? ` · ${c.judged_on}` : ''}
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
