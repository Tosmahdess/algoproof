'use client'

import Link from 'next/link'
import type { FicheIndexRow } from '@/lib/equity'
import { VerdictBadge } from '@/components/VerdictBadge'
import { LivePriceLine } from '@/components/LivePriceLine'
import { relativeDaysFr } from '@/lib/relative-date'

// Hero of /wealth: the freshest fiches. Freshness comes from the real analysis
// rhythm (generated_at), never from manual curation.
export function LatestAnalyses({ fiches }: { fiches: FicheIndexRow[] }) {
  const latest = [...fiches]
    .filter(f => f.generated_at)
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
    .slice(0, 6)

  if (latest.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {latest.map(f => (
        <Link
          key={f.ticker}
          href={`/wealth/${encodeURIComponent(f.ticker)}`}
          title={`Voir mon analyse de ${f.asset_name}`}
          className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-zinc-900/60"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-sm font-mono font-bold">{f.ticker}</span>
              <div className="text-[11px] text-zinc-400 truncate">{f.asset_name}</div>
            </div>
            <VerdictBadge verdict={f.verdict} />
          </div>
          <p className="mt-2 text-xs text-muted leading-snug line-clamp-2 min-h-[2rem]">
            {f.verdict_reason ?? ''}
          </p>
          <div className="mt-2 flex items-center justify-between">
            {f.ticker_yf
              ? <LivePriceLine tickerYf={f.ticker_yf} priceAtGeneration={f.price_at_generation} fallback={f.price_at_generation} />
              : <span />}
            <span className="text-[10px] text-zinc-500">{relativeDaysFr(f.generated_at)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
