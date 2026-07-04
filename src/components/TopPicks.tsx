'use client'

import Link from 'next/link'
import type { GrowthAsset, Verdict } from '@/lib/types'
import { LivePriceLine } from './LivePriceLine'

const SIGNAL_RANK: Record<string, number> = { crash: 3, major: 2, minor: 1 }

const VERDICT_META: Record<Verdict, { label: string; color: string }> = {
  renforcer: { label: 'RENFORCER', color: '#3fb950' },
  maintenir: { label: 'MAINTENIR', color: '#f6c90e' },
  skip:      { label: 'PASSER',    color: '#ff4444' },
}

export type FicheLite = {
  verdict: Verdict
  price_at_generation: number | null
  ticker_yf: string
}

interface Props {
  assets: GrowthAsset[]
  fiches: Record<string, FicheLite>
  loading: boolean
}

// Sélection "du moment" : un nom de qualité (verdict=renforcer) en solde maintenant
// (signal d'achat actif). Classé par force du signal puis profondeur du recul.
// Real dips only: no "watching" backfill (it froze the block all month).
export function selectTopPicks(assets: GrowthAsset[], fiches: Record<string, FicheLite>): GrowthAsset[] {
  const isRenforcer = (a: GrowthAsset) => fiches[a.ticker]?.verdict === 'renforcer'
  const cmp = (a: GrowthAsset, b: GrowthAsset) => {
    const sa = a.signal_level ? SIGNAL_RANK[a.signal_level] : 0
    const sb = b.signal_level ? SIGNAL_RANK[b.signal_level] : 0
    if (sb !== sa) return sb - sa
    return (a.drawdown_pct ?? 0) - (b.drawdown_pct ?? 0)
  }
  return assets.filter(a => isRenforcer(a) && a.signal_level).sort(cmp).slice(0, 5)
}

// LivePriceLine extracted to its own component (reused by LatestAnalyses).

function PickCard({ asset, fiche }: { asset: GrowthAsset; fiche: FicheLite | undefined }) {
  const verdict = fiche?.verdict ?? 'maintenir'
  const v = VERDICT_META[verdict]

  return (
    <Link
      href={`/wealth/${encodeURIComponent(asset.ticker)}`}
      title={`Voir mon analyse de ${asset.asset_name}`}
      className="block rounded-lg border bg-card px-3 py-3 transition-colors hover:bg-zinc-900/60"
      style={{ borderColor: v.color + '55' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-mono font-bold leading-none" style={{ color: asset.tier === 1 ? '#3fb950' : '#e4e4e7' }}>
              {asset.ticker}<span aria-hidden> ↗</span>
            </span>
            {asset.tier === 2 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500">T2</span>
            )}
          </div>
          <div className="text-[11px] text-zinc-400 leading-tight mt-1 truncate">{asset.asset_name}</div>
        </div>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ color: v.color, background: v.color + '1f' }}
        >
          {v.label}
        </span>
      </div>

      <div className="mt-3">
        {fiche?.ticker_yf ? (
          <LivePriceLine tickerYf={fiche.ticker_yf} priceAtGeneration={fiche.price_at_generation} fallback={asset.current_price} />
        ) : (
          <span className="text-[11px] text-zinc-600">—</span>
        )}
      </div>

    </Link>
  )
}

export function TopPicks({ assets, fiches, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border px-6 py-8 text-center text-xs text-muted">
        Chargement…
      </div>
    )
  }

  const picks = selectTopPicks(assets, fiches)

  if (picks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center space-y-2">
        <p className="text-sm font-medium">Aucun nom à renforcer avec un creux d&apos;achat actif aujourd&apos;hui.</p>
        <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
          Le marché ne propose pas de point d&apos;entrée franc sur les sociétés dont je garde la thèse.
          Mon DCA mensuel continue, l&apos;amplification se déclenchera dès qu&apos;un signal apparaîtra.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {picks.map(a => (
        <PickCard key={a.ticker} asset={a} fiche={fiches[a.ticker]} />
      ))}
    </div>
  )
}
