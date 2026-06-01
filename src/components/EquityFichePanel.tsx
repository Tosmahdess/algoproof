import type { EquityFiche, EquityMarketRow } from '@/lib/types'
import { VerdictBadge } from './VerdictBadge'
import { LivePerf } from './LivePerf'

const SIGNAL_LABEL: Record<string, string> = { minor: 'MINEUR', major: 'MAJEUR', crash: 'KRACH' }

export function EquityFichePanel({ fiche, market }: { fiche: EquityFiche; market: EquityMarketRow | null }) {
  const dd = market?.drawdown_pct != null ? `${(market.drawdown_pct * 100).toFixed(1)}%` : '—'
  const signal = market?.signal_level ? SIGNAL_LABEL[market.signal_level] : '—'
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <VerdictBadge verdict={fiche.verdict} />
        <LivePerf
          tickerYf={fiche.ticker_yf}
          priceAtGeneration={fiche.price_at_generation}
          fallbackPrice={market?.current_price ?? null}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><div className="text-muted text-xs">Signal</div><div className="font-semibold">{signal}</div></div>
        <div><div className="text-muted text-xs">Recul 180j</div><div className="font-semibold">{dd}</div></div>
        <div><div className="text-muted text-xs">TP1</div><div className="font-semibold text-positive">+{market?.tp1_pct ?? '—'}%</div></div>
        <div><div className="text-muted text-xs">TP2</div><div className="font-semibold text-positive">+{market?.tp2_pct ?? '—'}%</div></div>
      </div>
      <p className="mt-4 border-l-2 border-accent pl-3 text-foreground/80 italic">{fiche.verdict_reason}</p>
    </section>
  )
}
