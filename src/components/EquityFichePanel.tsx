import type { EquityMarketRow, Verdict } from '@/lib/types'
import type { FicheSummary } from '@/lib/equity'
import { VerdictBadge } from './VerdictBadge'
import { LivePerf } from './LivePerf'
import { sellPlanLines } from '@/lib/sell-plan'
import { sanitizeProse } from '@/lib/prose'

// fiche is FicheSummary, not the full EquityFiche: this panel renders only
// the verdict and the price, never the prose, so it never needs the four
// paid columns.
//
// verdict/verdict_reason are widened to `| null` here: the page passes a
// copy with both fields nulled out when the visitor has no access to the
// verdict (locked ticker, not a member). VerdictBadge already renders a
// neutral chip for a null verdict.
type GatableFicheSummary = Omit<FicheSummary, 'verdict' | 'verdict_reason'> & {
  verdict: Verdict | null
  verdict_reason: string | null
}

export function EquityFichePanel({ fiche, market }: { fiche: GatableFicheSummary; market: EquityMarketRow | null }) {
  const refPrice = fiche.price_at_generation
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <VerdictBadge verdict={fiche.verdict} />
        <LivePerf
          tickerYf={fiche.ticker_yf}
          priceAtGeneration={fiche.price_at_generation}
          fallbackPrice={market?.current_price ?? null}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div
          className="col-span-1"
          title="Prix au jour de mon analyse. Il ne bouge pas : il sert de point de référence à la variation live ci-dessus."
        >
          <div className="text-muted text-xs">Prix d&apos;analyse (figé)</div>
          <div className="font-semibold font-mono">{refPrice != null ? refPrice.toFixed(2) : '—'}</div>
        </div>
        <div
          className="col-span-1 sm:col-span-3"
          title="+X% = X% de plus-value depuis le prix d'achat, pas X% de la position"
        >
          <div className="text-muted text-xs">Plan de vente</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm font-medium text-positive">
            {sellPlanLines({ tp1_pct: market?.tp1_pct ?? null, tp1_sell_pct: market?.tp1_sell_pct ?? null, tp2_pct: market?.tp2_pct ?? null, tp2_sell_pct: market?.tp2_sell_pct ?? null, residual_pct: market?.residual_pct ?? null, exit_state: market?.exit_state ?? null })
              .map((l, i) => <span key={i}>{l}</span>)}
          </div>
        </div>
      </div>
      {fiche.verdict_reason && (
        <p className="mt-4 border-l-2 border-accent pl-3 text-foreground/80 italic">{sanitizeProse(fiche.verdict_reason)}</p>
      )}
    </section>
  )
}
