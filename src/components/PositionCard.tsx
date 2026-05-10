'use client'

import type { WealthCall, GrowthAsset } from '@/lib/types'

interface PositionCardProps {
  call: WealthCall
  asset: GrowthAsset | null
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: decimals })
}

const SIGNAL_COLOR: Record<string, string> = {
  minor_dip: '#f6c90e',
  major_dip: '#ff6b35',
  crash:     '#ff4444',
  none:      '#666',
}

export function PositionCard({ call, asset }: PositionCardProps) {
  const entry   = call.price_eur ?? 0
  const current = asset?.current_price ?? null
  const pnlPct  = current && entry ? ((current - entry) / entry) * 100 : null
  const tp1Price = entry && asset?.tp1_pct ? entry * (1 + asset.tp1_pct / 100) : null
  const tp2Price = entry && asset?.tp2_pct ? entry * (1 + asset.tp2_pct / 100) : null
  const tp1Gap   = current && tp1Price ? ((tp1Price - current) / current) * 100 : null
  const tp2Gap   = current && tp2Price ? ((tp2Price - current) / current) * 100 : null

  const dateStr = new Date(call.executed_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short',
  })

  const pnlColor = pnlPct === null ? '#888'
    : pnlPct >= 0 ? '#3fb950' : '#ff4444'

  const sigColor = SIGNAL_COLOR[call.signal_level] ?? '#666'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <div className="text-[10px] font-mono text-zinc-500">{call.asset}</div>
          <div className="text-sm font-semibold text-zinc-200 leading-tight">
            {asset?.asset_name ?? call.asset}
          </div>
        </div>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: sigColor + '22', color: sigColor }}
        >
          {call.signal_level?.replace('_dip', '').toUpperCase() ?? '—'}
        </span>
      </div>

      <div className="text-[10px] text-zinc-600 mb-2">
        {dateStr} · {fmt(call.amount_eur)}€
      </div>

      <div className="flex items-center justify-between text-xs mb-2.5">
        <span className="text-zinc-600 text-[10px]">
          Entrée <span className="text-zinc-400">{fmt(entry, 2)}€</span>
        </span>
        {current !== null ? (
          <span className="text-[10px] font-medium" style={{ color: pnlColor }}>
            {fmt(current, 2)}€{pnlPct !== null ? ` (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)` : ''}
          </span>
        ) : (
          <span className="text-zinc-700 text-[10px]">prix N/D</span>
        )}
      </div>

      <div className="space-y-1 text-[10px]">
        {tp1Price && (
          <div className="flex justify-between">
            <span className="text-zinc-600">
              TP1 +{asset?.tp1_pct}% · 25%
            </span>
            <span className="text-zinc-400 font-mono">
              {fmt(tp1Price, 0)}€
              {tp1Gap !== null && (
                <span className="text-zinc-600 ml-1">
                  ({tp1Gap > 0 ? '+' : ''}{tp1Gap.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}
        {tp2Price && (
          <div className="flex justify-between">
            <span className="text-zinc-600">
              TP2 +{asset?.tp2_pct}% · 25%
            </span>
            <span className="text-zinc-400 font-mono">
              {fmt(tp2Price, 0)}€
              {tp2Gap !== null && (
                <span className="text-zinc-600 ml-1">
                  ({tp2Gap > 0 ? '+' : ''}{tp2Gap.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}
        {asset?.residual_pct !== null && asset?.residual_pct !== undefined && (
          <div className="text-zinc-700 pt-0.5">
            {asset.residual_pct > 0
              ? `Résiduel hold : ${asset.residual_pct}%`
              : 'Sortie complète à TP2'}
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptySlotCard() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-3 flex items-center justify-center min-h-[110px]">
      <span className="text-zinc-700 text-xs">slot libre</span>
    </div>
  )
}
