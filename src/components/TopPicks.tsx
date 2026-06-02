'use client'

import Link from 'next/link'
import type { GrowthAsset, Verdict } from '@/lib/types'

const SIGNAL_COLOR: Record<string, string> = {
  minor: '#f6c90e', major: '#ff6b35', crash: '#ff4444',
}
const SIGNAL_LABEL: Record<string, string> = {
  minor: 'MINEUR', major: 'MAJEUR', crash: 'KRACH',
}
const SIGNAL_RANK: Record<string, number> = { crash: 3, major: 2, minor: 1 }

interface Props {
  assets: GrowthAsset[]
  verdictByTicker: Record<string, Verdict>
  coveredTickers: Set<string>
  loading: boolean
}

// Selection "du moment" : un nom de qualité (verdict=renforcer) en solde maintenant
// (signal d'achat actif). Classé par force du signal puis profondeur du recul.
// 100% dérivé des données publiques — aucun pick manuel.
function selectTopPicks(assets: GrowthAsset[], verdictByTicker: Record<string, Verdict>): GrowthAsset[] {
  const isRenforcer = (a: GrowthAsset) => verdictByTicker[a.ticker] === 'renforcer'

  const rank = (a: GrowthAsset) => {
    const sig = a.signal_level ? SIGNAL_RANK[a.signal_level] : 0
    const dd = a.drawdown_pct ?? 0   // fraction négative : plus c'est bas, plus le recul est fort
    return { sig, dd }
  }
  const cmp = (a: GrowthAsset, b: GrowthAsset) => {
    const ra = rank(a), rb = rank(b)
    if (rb.sig !== ra.sig) return rb.sig - ra.sig
    return ra.dd - rb.dd
  }

  // Coeur : verdict=renforcer ET signal d'achat actif.
  const active = assets.filter(a => isRenforcer(a) && a.signal_level).sort(cmp)
  if (active.length >= 5) return active.slice(0, 5)

  // Fallback marché haut : compléter par les "renforcer" les plus proches d'un creux.
  const watching = assets
    .filter(a => isRenforcer(a) && !a.signal_level)
    .sort((a, b) => (a.drawdown_pct ?? 0) - (b.drawdown_pct ?? 0))

  return [...active, ...watching].slice(0, 5)
}

function PickCard({ asset, covered }: { asset: GrowthAsset; covered: boolean }) {
  const sig = asset.signal_level
  const sigColor = sig ? SIGNAL_COLOR[sig] : undefined
  const ddPct = asset.drawdown_pct !== null ? asset.drawdown_pct * 100 : null

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-sm font-mono font-bold leading-none"
              style={{ color: asset.tier === 1 ? '#3fb950' : '#e4e4e7' }}
            >
              {asset.ticker}{covered && <span aria-hidden> ↗</span>}
            </span>
            {asset.tier === 2 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500">T2</span>
            )}
          </div>
          <div className="text-[11px] text-zinc-400 leading-tight mt-1 truncate">{asset.asset_name}</div>
        </div>
        {sig && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ color: sigColor, background: (sigColor ?? '') + '22' }}
          >
            {SIGNAL_LABEL[sig]}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Recul 180j</div>
          <div
            className="text-base font-mono font-bold leading-none mt-0.5"
            style={{ color: sigColor ?? '#a1a1aa' }}
          >
            {ddPct !== null ? `${ddPct.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest">À acheter</div>
          <div className="text-xs font-mono text-zinc-300 mt-0.5">
            {asset.suggested_min && asset.suggested_max
              ? `${asset.suggested_min}–${asset.suggested_max}€`
              : '—'}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-zinc-900">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-positive bg-positive/10">
          RENFORCER
        </span>
      </div>
    </>
  )

  const base = 'block rounded-lg border bg-card px-3 py-3 transition-colors'
  const style = { borderColor: sigColor ? (sigColor + '55') : '#1e1e1e' }

  return covered ? (
    <Link
      href={`/wealth/${encodeURIComponent(asset.ticker)}`}
      title={`Voir ma thèse sur ${asset.asset_name}`}
      className={`${base} hover:bg-zinc-900/60`}
      style={style}
    >
      {inner}
    </Link>
  ) : (
    <div className={base} style={style}>{inner}</div>
  )
}

export function TopPicks({ assets, verdictByTicker, coveredTickers, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border px-6 py-8 text-center text-xs text-muted">
        Chargement…
      </div>
    )
  }

  const picks = selectTopPicks(assets, verdictByTicker)

  if (picks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center space-y-2">
        <p className="text-sm font-medium">Aucun signal d&apos;achat marqué à renforcer aujourd&apos;hui.</p>
        <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
          Le marché ne propose pas de creux franc sur les noms dont la thèse est intacte.
          Le DCA mensuel continue normalement — l&apos;amplification se déclenchera quand un signal apparaîtra.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {picks.map(a => (
        <PickCard key={a.ticker} asset={a} covered={coveredTickers.has(a.ticker)} />
      ))}
    </div>
  )
}
