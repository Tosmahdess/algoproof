'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { GrowthAsset, Verdict } from '@/lib/types'
import { SignalProgressBar } from './SignalProgressBar'
import { sellPlanLines } from '@/lib/sell-plan'

interface Props {
  assets: GrowthAsset[]
  lastAlerts: Record<string, string>  // ticker → ISO date
  verdictByTicker: Record<string, Verdict>  // ticker → verdict (covered names only)
}

const VERDICT_META: Record<Verdict, { label: string; color: string }> = {
  renforcer: { label: 'RENFORCER', color: '#3fb950' },
  maintenir: { label: 'MAINTENIR', color: '#f6c90e' },
  skip:      { label: 'PASSER',    color: '#ff4444' },
}

const SIGNAL_COLOR: Record<string, string> = {
  minor: '#f6c90e', major: '#ff6b35', crash: '#ff4444',
}
const SIGNAL_LABEL: Record<string, string> = {
  minor: 'MINEUR', major: 'MAJEUR', crash: 'KRACH',
}

const CATEGORY_LABELS: Record<string, string> = {
  crypto_alt:       'Crypto Alternatif',
  btc_proxy:        'BTC Proxy',
  semiconductors:   'Semiconducteurs',
  tech_platform:    'Tech Platform / Cloud AI',
  tech_us_growth:   'Tech US Growth',
  cloud_ai:         'Cloud / IA',
  gaming:           'Gaming',
  auto_ev:          'Auto / EV',
  luxury_eu:        'Luxe EU',
  pharma_growth:    'Pharma Croissance',
  pharma_defensive: 'Pharma Défensif',
  pharma_biotech:   'Pharma / Biotech',
  defense_aerospace:'Défense / Aérospatial',
  energy_oil:       'Énergie Oil & Gas',
  energy_transition:'Énergie Transition',
  commodities_metal:'Métaux & Ressources',
  cybersecurity:    'Cybersécurité',
  fintech_payment:  'Fintech / Paiement',
  consumer_premium: 'Conso Premium',
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function VerdictChip({ verdict }: { verdict: Verdict }) {
  const v = VERDICT_META[verdict]
  return (
    <span
      className="text-[9px] font-bold px-1 py-0.5 rounded"
      style={{ color: v.color, background: v.color + '1f' }}
    >
      {v.label}
    </span>
  )
}

function AssetRow({ asset, lastAlerts, verdict }: { asset: GrowthAsset; lastAlerts: Record<string, string>; verdict?: Verdict }) {
  const sigColor = asset.signal_level ? SIGNAL_COLOR[asset.signal_level] : undefined
  const ddPct = asset.drawdown_pct !== null ? asset.drawdown_pct * 100 : null
  const covered = verdict != null

  const distanceEl = (() => {
    if (!asset.dip_trigger_pct) return <span className="text-zinc-600 text-xs">N/D</span>
    if (asset.signal_level && ddPct !== null) {
      return (
        <span className="text-xs font-mono" style={{ color: sigColor }}>
          {ddPct.toFixed(1)}%
        </span>
      )
    }
    if (ddPct !== null) {
      const remaining = asset.dip_trigger_pct - ddPct
      return (
        <span className="text-zinc-500 text-[11px]">
          encore {remaining.toFixed(1)}%
        </span>
      )
    }
    return <span className="text-zinc-600 text-xs">—</span>
  })()

  return (
    <tr
      className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors"
      style={{ borderLeft: sigColor ? `2px solid ${sigColor}` : '2px solid transparent' }}
    >
      <td className="py-2.5 px-3 min-w-[150px]">
        {covered ? (
          <Link
            href={`/wealth/${encodeURIComponent(asset.ticker)}`}
            title={`Voir mon analyse de ${asset.asset_name}`}
            className="group block -mx-1 px-1 rounded hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-mono font-bold group-hover:underline"
                style={{ color: asset.tier === 1 ? '#3fb950' : '#888' }}
              >
                {asset.ticker} <span aria-hidden>↗</span>
              </span>
              {asset.tier === 2 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500">T2</span>
              )}
              {verdict && <VerdictChip verdict={verdict} />}
            </div>
            <div className="text-xs text-zinc-200 leading-tight mt-0.5 group-hover:underline">{asset.asset_name}</div>
          </Link>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-mono font-bold"
                style={{ color: asset.tier === 1 ? '#3fb950' : '#888' }}
              >
                {asset.ticker}
              </span>
              {asset.tier === 2 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500">T2</span>
              )}
            </div>
            <div className="text-xs text-zinc-400 leading-tight mt-0.5">{asset.asset_name}</div>
          </>
        )}
      </td>

      <td className="py-2.5 px-3">
        {asset.signal_level ? (
          <span
            className="font-bold px-2 py-0.5 rounded text-xs"
            style={{ color: sigColor, background: (sigColor ?? '') + '22' }}
          >
            {SIGNAL_LABEL[asset.signal_level]}
          </span>
        ) : (
          <span className="text-zinc-700 text-xs">—</span>
        )}
      </td>

      <td className="py-2.5 px-3">{distanceEl}</td>

      <td className="py-2.5 px-3 min-w-[150px]">
        <SignalProgressBar
          triggerPct={asset.dip_trigger_pct}
          drawdownPct={asset.drawdown_pct}
        />
      </td>

      <td className="py-2.5 px-3 text-xs">
        {asset.signal_level && asset.suggested_min && asset.suggested_max ? (
          <span className="text-zinc-300 font-mono">
            {asset.suggested_min}–{asset.suggested_max}€
          </span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </td>

      <td
        className="py-2.5 px-3"
        title="+X% = X% de plus-value depuis ton prix d'achat, pas X% de la position"
      >
        {(() => {
          const lines = sellPlanLines(asset)
          if (lines.length === 0) return <span className="text-zinc-700 text-xs">—</span>
          return (
            <div className="flex flex-col gap-0.5 text-[11px] text-zinc-400">
              {lines.map((l, i) => <span key={i}>{l}</span>)}
            </div>
          )
        })()}
      </td>

      <td className="py-2.5 px-3 text-xs text-zinc-500 whitespace-nowrap">
        {formatDate(lastAlerts[asset.ticker])}
      </td>
    </tr>
  )
}

function SignalView({ assets, lastAlerts, verdictByTicker }: Props) {
  const alerted      = assets.filter(a => a.signal_level !== null)
  const surveillance = assets.filter(a => a.signal_level === null)

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-wider">
          <th className="py-2.5 px-3 text-left font-medium">Actif</th>
          <th className="py-2.5 px-3 text-left font-medium">Signal</th>
          <th className="py-2.5 px-3 text-left font-medium">vs pic 180j</th>
          <th className="py-2.5 px-3 text-left font-medium">Distance seuils</th>
          <th className="py-2.5 px-3 text-left font-medium">À acheter (€)</th>
          <th className="py-2.5 px-3 text-left font-medium">Plan de vente</th>
          <th className="py-2.5 px-3 text-left font-medium">Dernière alerte</th>
        </tr>
      </thead>
      <tbody>
        {alerted.length > 0 && (
          <>
            <tr className="bg-zinc-900/60">
              <td colSpan={7} className="py-1.5 px-3 text-xs text-zinc-400">
                🔴 En alerte · {alerted.length} actif{alerted.length > 1 ? 's' : ''}
              </td>
            </tr>
            {alerted.map(a => (
              <AssetRow key={a.ticker} asset={a} lastAlerts={lastAlerts} verdict={verdictByTicker[a.ticker]} />
            ))}
          </>
        )}
        <tr className="bg-zinc-900/30">
          <td colSpan={7} className="py-1.5 px-3 text-xs text-zinc-600">
            En surveillance · {surveillance.length} actifs
          </td>
        </tr>
        {surveillance.map(a => (
          <AssetRow key={a.ticker} asset={a} lastAlerts={lastAlerts} verdict={verdictByTicker[a.ticker]} />
        ))}
      </tbody>
    </table>
  )
}

function SecteurView({ assets, lastAlerts, verdictByTicker }: Props) {
  const byCategory = assets.reduce((acc, a) => {
    const cat = a.category ?? 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(a)
    return acc
  }, {} as Record<string, GrowthAsset[]>)

  const ORDER = [
    'crypto_alt', 'btc_proxy', 'semiconductors', 'tech_platform', 'tech_us_growth',
    'cloud_ai', 'gaming', 'auto_ev', 'luxury_eu', 'pharma_growth', 'pharma_defensive',
    'pharma_biotech', 'defense_aerospace', 'energy_oil', 'energy_transition',
    'commodities_metal', 'cybersecurity', 'fintech_payment', 'consumer_premium',
  ]

  const entries = [
    ...ORDER.filter(c => byCategory[c]).map(c => [c, byCategory[c]] as [string, GrowthAsset[]]),
    ...Object.entries(byCategory).filter(([c]) => !ORDER.includes(c)),
  ]

  return (
    <div className="space-y-6">
      {entries.map(([cat, catAssets]) => (
        <div key={cat}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
            <span className="text-zinc-600 text-[10px] font-normal">
              {catAssets.filter(a => a.tier === 1).length}T1 · {catAssets.filter(a => a.tier === 2).length}T2
            </span>
            {catAssets.some(a => a.signal_level) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-red-400">
                {catAssets.filter(a => a.signal_level).length} en alerte
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-600 text-[9px] uppercase tracking-wider">
                <th className="py-1.5 px-3 text-left font-medium">Actif</th>
                <th className="py-1.5 px-3 text-left font-medium">Signal</th>
                <th className="py-1.5 px-3 text-left font-medium">vs pic 180j</th>
                <th className="py-1.5 px-3 text-left font-medium">Distance seuils</th>
                <th className="py-1.5 px-3 text-left font-medium">À acheter (€)</th>
                <th className="py-1.5 px-3 text-left font-medium">Vente</th>
                <th className="py-1.5 px-3 text-left font-medium">Dernière alerte</th>
              </tr>
            </thead>
            <tbody>
              {catAssets.map(a => (
                <AssetRow key={a.ticker} asset={a} lastAlerts={lastAlerts} verdict={verdictByTicker[a.ticker]} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export function SignalTable({ assets, lastAlerts, verdictByTicker }: Props) {
  const [tab, setTab] = useState<'signal' | 'secteur'>('signal')

  return (
    <div>
      <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
        🟢 <span className="text-zinc-300">MINEUR / MAJEUR / KRACH</span> = quand &amp; combien <span className="font-bold text-zinc-300">acheter sur repli</span> ·{' '}
        🎯 <span className="text-zinc-300">Plan de vente</span> = quand &amp; combien <span className="font-bold text-zinc-300">vendre en plus-value</span>
      </p>
      <div className="flex gap-2 mb-4">
        {([['signal', '⚡ Par signal'], ['secteur', '📂 Par secteur']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === key
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-900">
        {tab === 'signal'
          ? <SignalView assets={assets} lastAlerts={lastAlerts} verdictByTicker={verdictByTicker} />
          : <SecteurView assets={assets} lastAlerts={lastAlerts} verdictByTicker={verdictByTicker} />
        }
      </div>
    </div>
  )
}
