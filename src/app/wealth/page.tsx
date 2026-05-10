'use client'

import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts'
import ExplainerBox from '@/components/ExplainerBox'
import { ExplainerSignal } from '@/components/ExplainerSignal'
import { SignalTable } from '@/components/SignalTable'
import { PositionCard, EmptySlotCard } from '@/components/PositionCard'
import type { WealthCall, AssetPrice, GrowthAlert, GrowthAsset } from '@/lib/types'

// Source: apex-wealth/portfolios.py WEALTH_ALLOCATION + BUDGET_CONFIG
// Total budget: 250€/month (WEALTH 70% = 175€, GROWTH 30% = 75€)
// WEALTH asset weights are % of the 175€ WEALTH bucket → converted to % of total 250€
const WEALTH_ASSETS = [
  { name: 'Bitcoin (BTC)',    pct: 21,   color: '#f7931a', venue: 'Binance (auto)',  assetClass: 'Crypto' },
  { name: 'Ethereum (ETH)',   pct: 14,   color: '#627eea', venue: 'Binance (auto)',  assetClass: 'Crypto' },
  { name: 'MSCI World (CW8)', pct: 17.5, color: '#4299e1', venue: 'PEA Boursobank', assetClass: 'ETF' },
  { name: 'Nasdaq-100 (CL2)', pct: 11.9, color: '#667eea', venue: 'PEA Boursobank', assetClass: 'ETF' },
  { name: 'Gold (XAU)',       pct: 5.6,  color: '#f6c90e', venue: 'Binance (auto)',  assetClass: 'Commodity' },
  { name: 'GROWTH tactical',  pct: 30,   color: '#3fb950', venue: 'Trade Republic', assetClass: 'Tactical' },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for reference only
const _SECTORS_REF = [
  { label: 'Crypto', color: '#f7931a', assets: [
    { ticker: 'SOL',  name: 'Solana',         tier: 1, trigger: 30 },
    { ticker: 'MSTR', name: 'MicroStrategy',  tier: 1, trigger: 45 },
    { ticker: 'COIN', name: 'Coinbase',       tier: 1, trigger: 35 },
  ]},
  { label: 'Semiconducteurs', color: '#40c4ff', assets: [
    { ticker: 'NVDA',  name: 'NVIDIA',    tier: 1, trigger: 25 },
    { ticker: 'ASML',  name: 'ASML',     tier: 1, trigger: 30 },
    { ticker: 'TSM',   name: 'TSMC',     tier: 1, trigger: 30 },
    { ticker: 'KLAC',  name: 'KLA Corp', tier: 1, trigger: 25 },
    { ticker: 'AVGO',  name: 'Broadcom', tier: 1, trigger: 25 },
    { ticker: 'AMD',   name: 'AMD',      tier: 2 },
    { ticker: 'MU',    name: 'Micron',   tier: 2 },
    { ticker: 'ARM',   name: 'ARM',      tier: 2 },
  ]},
  { label: 'Tech Platform / Cloud', color: '#667eea', assets: [
    { ticker: 'META',  name: 'Meta Platforms', tier: 1, trigger: 20 },
    { ticker: 'PLTR',  name: 'Palantir',       tier: 1, trigger: 25 },
    { ticker: 'GOOGL', name: 'Alphabet',       tier: 1, trigger: 25 },
    { ticker: 'SNOW',  name: 'Snowflake',      tier: 2 },
    { ticker: 'CRWD',  name: 'CrowdStrike',    tier: 2 },
    { ticker: 'DDOG',  name: 'Datadog',        tier: 2 },
    { ticker: 'MDB',   name: 'MongoDB',        tier: 2 },
    { ticker: 'NET',   name: 'Cloudflare',     tier: 2 },
  ]},
  { label: 'Auto / EV', color: '#3fb950', assets: [
    { ticker: 'TSLA',    name: 'Tesla',      tier: 1, trigger: 25 },
    { ticker: '1810.HK', name: 'Xiaomi EV', tier: 2 },
    { ticker: 'BYDDY',   name: 'BYD',       tier: 2 },
    { ticker: 'STLA',    name: 'Stellantis', tier: 2 },
    { ticker: 'RIVN',    name: 'Rivian',    tier: 2 },
    { ticker: 'LCID',    name: 'Lucid',     tier: 2 },
    { ticker: 'RACE',    name: 'Ferrari',   tier: 2 },
  ]},
  { label: 'Luxe EU', color: '#ff6b35', assets: [
    { ticker: 'MC.PA',  name: 'LVMH',   tier: 1, trigger: 25 },
    { ticker: 'RMS.PA', name: 'Hermès', tier: 1, trigger: 25 },
    { ticker: 'KER.PA', name: 'Kering', tier: 2 },
  ]},
  { label: 'Pharma Growth', color: '#ff4444', assets: [
    { ticker: 'LLY',  name: 'Eli Lilly',    tier: 1, trigger: 30 },
    { ticker: 'NVO',  name: 'Novo Nordisk', tier: 1, trigger: 30 },
    { ticker: 'VRTX', name: 'Vertex',       tier: 2 },
    { ticker: 'REGN', name: 'Regeneron',    tier: 2 },
    { ticker: 'MRNA', name: 'Moderna',      tier: 2 },
    { ticker: 'BNTX', name: 'BioNTech',     tier: 2 },
  ]},
  { label: 'Pharma Défensif', color: '#4299e1', assets: [
    { ticker: 'SAN.PA', name: 'Sanofi', tier: 1, trigger: 25 },
    { ticker: 'MRK',    name: 'Merck',  tier: 1, trigger: 25 },
  ]},
  { label: 'Défense', color: '#8b5cf6', assets: [
    { ticker: 'RHM.DE', name: 'Rheinmetall',    tier: 1, trigger: 25 },
    { ticker: 'HO.PA',  name: 'Thales',         tier: 1, trigger: 25 },
    { ticker: 'BA.L',   name: 'BAE Systems',    tier: 1, trigger: 25 },
    { ticker: 'LMT',    name: 'Lockheed Martin', tier: 2 },
    { ticker: 'RTX',    name: 'RTX',            tier: 2 },
    { ticker: 'AM.PA',  name: 'Airbus',         tier: 2 },
  ]},
  { label: 'Énergie Oil & Gas', color: '#d29922', assets: [
    { ticker: 'XOM', name: 'ExxonMobil',     tier: 1, trigger: 20 },
    { ticker: 'CVX', name: 'Chevron',        tier: 1, trigger: 20 },
    { ticker: 'LNG', name: 'Cheniere',       tier: 1, trigger: 25 },
    { ticker: 'GEV', name: 'GE Vernova',     tier: 1, trigger: 25 },
  ]},
  { label: 'Énergie Transition', color: '#3fb950', assets: [
    { ticker: 'FSLR',   name: 'First Solar', tier: 2 },
    { ticker: 'ENPH',   name: 'Enphase',     tier: 2 },
    { ticker: 'NEE',    name: 'NextEra',     tier: 2 },
    { ticker: 'VWS.CO', name: 'Vestas',      tier: 2 },
    { ticker: 'SU.PA',  name: 'Schneider',   tier: 2 },
  ]},
  { label: 'Métaux & Ressources', color: '#f7931a', assets: [
    { ticker: 'FCX', name: 'Freeport-McMoRan', tier: 1, trigger: 30 },
    { ticker: 'MP',  name: 'MP Materials',     tier: 1, trigger: 35 },
  ]},
  { label: 'Cybersécurité', color: '#ff4444', assets: [
    { ticker: 'PANW', name: 'Palo Alto', tier: 2 },
    { ticker: 'FTNT', name: 'Fortinet',  tier: 2 },
    { ticker: 'ZS',   name: 'Zscaler',  tier: 2 },
    { ticker: 'S',    name: 'SentinelOne', tier: 2 },
    { ticker: 'OKTA', name: 'Okta',     tier: 2 },
  ]},
  { label: 'Fintech / Paiement', color: '#627eea', assets: [
    { ticker: 'V',         name: 'Visa',       tier: 2 },
    { ticker: 'MA',        name: 'Mastercard', tier: 2 },
    { ticker: 'SQ',        name: 'Block',      tier: 2 },
    { ticker: 'ADYEN.AS',  name: 'Adyen',      tier: 2 },
    { ticker: 'HOOD',      name: 'Robinhood',  tier: 2 },
  ]},
  { label: 'Gaming', color: '#d29922', assets: [
    { ticker: 'TTWO',   name: 'Take-Two',  tier: 2 },
    { ticker: 'EA',     name: 'EA',        tier: 2 },
    { ticker: 'UBI.PA', name: 'Ubisoft',   tier: 2 },
    { ticker: 'CDR.WA', name: 'CD Projekt', tier: 2 },
    { ticker: 'NTDOY',  name: 'Nintendo',  tier: 2 },
  ]},
  { label: 'Conso Premium', color: '#ff6b35', assets: [
    { ticker: 'LULU',    name: 'Lululemon',      tier: 2 },
    { ticker: 'EL',      name: 'Estée Lauder',   tier: 2 },
    { ticker: 'MCD',     name: "McDonald's",     tier: 2 },
    { ticker: 'PHIA.AS', name: 'Philips',        tier: 2 },
    { ticker: 'RI.PA',   name: 'Rémy Cointreau', tier: 2 },
  ]},
]

const AMPLIFICATION = [
  { label: 'Marché normal',        multiplier: '1.0×', amount: '250€', condition: 'Score MI > −30',  color: '#3fb950' },
  { label: 'Baisse mineure',       multiplier: '1.5×', amount: '375€', condition: 'Score MI < −30',  color: '#f6c90e' },
  { label: 'Baisse majeure / krach', multiplier: '2.5×', amount: '625€', condition: 'Score MI < −50',  color: '#ff6b35' },
  { label: 'ETF (PEA)',            multiplier: 'never', amount: '174€', condition: 'Toujours stable', color: '#4299e1' },
]

// Signal colors — used in legacy portfolio tracking section only
const SIGNAL_COLOR_LEGACY: Record<string, string> = {
  minor: '#f6c90e',
  major: '#ff6b35',
  crash: '#ff4444',
}

export default function WealthPage() {
  const [calls, setCalls]               = useState<WealthCall[]>([])
  const [prices, setPrices]             = useState<AssetPrice[]>([])
  const [growthAlerts, setAlerts]       = useState<GrowthAlert[]>([])
  const [growthUniverse, setUniverse]   = useState<GrowthAsset[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/wealth').then(r => r.json()),
      fetch('/api/growth-alerts').then(r => r.json()),
      fetch('/api/growth-universe').then(r => r.json()),
    ]).then(([wealth, alerts, universe]) => {
      setCalls(wealth.calls ?? [])
      setPrices(wealth.prices ?? [])
      setAlerts(Array.isArray(alerts) ? alerts : [])
      setUniverse(Array.isArray(universe) ? universe : [])
      setLoading(false)
    })
  }, [])

  // Derived: last alert date per ticker (for SignalTable "Dernière alerte" column)
  const lastAlertByTicker = growthAlerts.reduce((acc, alert) => {
    if (!acc[alert.ticker] || alert.alerted_at > acc[alert.ticker]) {
      acc[alert.ticker] = alert.alerted_at
    }
    return acc
  }, {} as Record<string, string>)

  // Derived: growth calls sorted by date (for 20-slot positions grid)
  const growthCalls = calls
    .filter(c => c.portfolio === 'growth')
    .sort((a, b) => b.executed_at.localeCompare(a.executed_at))
    .slice(0, 20)

  // Derived: universe by ticker for PositionCard lookup
  const universeByTicker = growthUniverse.reduce((acc, a) => {
    acc[a.ticker] = a; return acc
  }, {} as Record<string, GrowthAsset>)

  function getPriceEur(asset: string): number | null {
    return prices.find(p => p.asset === asset)?.price_eur ?? null
  }

  function computePnl(call: WealthCall): number | null {
    if (!call.quantity || !call.price_eur) return null
    const current = getPriceEur(call.asset)
    if (!current) return null
    return (current - call.price_eur) * call.quantity
  }

  const totalInvested = calls.reduce((s, c) => s + c.amount_eur, 0)
  const totalPnl      = calls.reduce((s, c) => s + (computePnl(c) ?? 0), 0)
  const totalCurrent  = totalInvested + totalPnl

  const equityCurve = calls.reduce<{ date: string; invested: number; current: number }[]>(
    (acc, call) => {
      const prev = acc[acc.length - 1] ?? { invested: 0, current: 0 }
      const pnl  = computePnl(call) ?? 0
      return [...acc, {
        date:     call.executed_at.slice(0, 10),
        invested: Math.round((prev.invested + call.amount_eur) * 100) / 100,
        current:  Math.round((prev.current  + call.amount_eur + pnl) * 100) / 100,
      }]
    },
    []
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-16">

      {/* Hero */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          APEX Wealth
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          On investit chaque mois. On montre chaque achat.
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">
          APEX Wealth est un système d&apos;accumulation systématique — pas un bot de trading. Chaque mois,
          un budget fixe est déployé sur la crypto, les ETF monde et l&apos;or. Quand le marché baisse,
          on investit davantage. Chaque achat est enregistré publiquement.
        </p>
      </div>

      {/* Allocation */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Allocation du portefeuille</h2>
        <ExplainerBox stacked
          functional={
            <p>
              250€ par mois, répartis entre un socle WEALTH stable (70%) et une poche GROWTH
              tactique (30%). Le socle WEALTH est conservé indéfiniment — crypto, actions monde, or.
              La poche GROWTH achète sur les baisses et prend des bénéfices à des niveaux prédéfinis.
            </p>
          }
          technical={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
              <div>
                <p className="text-muted mb-2 font-semibold">SOCLE WEALTH — 175€/mois</p>
                {WEALTH_ASSETS.filter(a => a.assetClass !== 'Tactical').map(a => (
                  <div key={a.name} className="flex items-center gap-2 py-0.5">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                    <span className="text-muted flex-1">{a.name}</span>
                    <span className="font-semibold">{a.pct}%</span>
                    <span className="text-muted text-[10px] w-28 text-right">{a.venue}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-muted mb-2 font-semibold">GROWTH — 75€/mois</p>
                <p className="text-muted text-[10px] leading-relaxed">
                  Achats opportunistes sur baisses. Déploiement sur corrections −20% à −30% par actif.
                  Prise de bénéfices à +40% (30%) et +80% (30%). Max 6 positions ouvertes.
                  Venue : Trade Republic CTO.
                </p>
              </div>
            </div>
          }
        />
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-8">
          <div className="h-56 w-56 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={WEALTH_ASSETS}
                  dataKey="pct"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {WEALTH_ASSETS.map(a => (
                    <Cell key={a.name} fill={a.color} />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                  contentStyle={{
                    background: '#111111',
                    border: '1px solid #1e1e1e',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5 text-xs font-mono min-w-0">
            {WEALTH_ASSETS.map(a => (
              <div key={a.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: a.color }} />
                <span className="flex-1 text-zinc-300 truncate">{a.name}</span>
                <span className="font-bold w-10 text-right tabular-nums">{a.pct}%</span>
                <span className="text-zinc-600 text-[10px] w-28 text-right hidden sm:block">{a.venue}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Amplification */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Amplification intelligente</h2>
        <ExplainerBox stacked
          functional={
            <p>
              On investit davantage quand les prix baissent. Quand le service d&apos;Intelligence de Marché détecte une
              baisse significative, le budget mensuel est automatiquement multiplié — jusqu&apos;à 2,5×.
              Les ETF en PEA ne sont jamais amplifiés : leur cadence reste fixe pour l&apos;optimisation fiscale.
            </p>
          }
          technical={
            <div className="space-y-1 text-xs font-mono">
              {AMPLIFICATION.map(a => (
                <div key={a.label} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                  <span className="text-muted w-36 flex-shrink-0">{a.label}</span>
                  <span className="font-bold w-14">{a.multiplier}</span>
                  <span className="text-positive w-14">{a.amount}</span>
                  <span className="text-muted text-[10px]">{a.condition}</span>
                </div>
              ))}
            </div>
          }
        />
      </section>

      {/* GROWTH — Univers complet */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold tracking-tight">GROWTH — Univers complet</h2>
          <span className="text-xs text-muted">
            {growthUniverse.length} actifs · surveillance 4h
          </span>
        </div>

        <ExplainerSignal />

        {loading ? (
          <div className="rounded border border-border px-6 py-8 text-center text-xs text-muted">
            Chargement...
          </div>
        ) : growthUniverse.length === 0 ? (
          <div className="rounded border border-dashed border-border px-6 py-8 text-center text-xs text-muted">
            Données en cours de synchronisation (cron toutes les 4h)
          </div>
        ) : (
          <SignalTable assets={growthUniverse} lastAlerts={lastAlertByTicker} />
        )}
      </section>

      {/* Positions GROWTH ouvertes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold tracking-tight">Positions GROWTH ouvertes</h2>
          <span className="text-xs text-muted">
            {growthCalls.length} / 20 slots
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 20 }).map((_, i) => {
            const call = growthCalls[i]
            if (!call) return <EmptySlotCard key={i} />
            return (
              <PositionCard
                key={call.id}
                call={call}
                asset={universeByTicker[call.asset] ?? null}
              />
            )
          })}
        </div>
      </section>

      {/* Portfolio — Live Tracking */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-4">Portefeuille — Suivi en temps réel</h2>

        {loading ? (
          <div className="rounded border border-border px-6 py-8 text-center text-xs text-muted">
            Chargement...
          </div>
        ) : calls.length === 0 ? (
          <div className="rounded border border-dashed border-border px-6 py-10 text-center space-y-2">
            <p className="text-sm font-medium">Pas encore d&apos;achats.</p>
            <p className="text-xs text-muted">
              Le premier DCA s&apos;exécute le 1er du mois prochain. Chaque achat apparaîtra ici
              avec son P&amp;L en temps réel, synchronisé depuis le VPS en moins d&apos;une heure.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {([
                { label: 'Total investi',  value: `${totalInvested.toFixed(2)}€`,  color: undefined },
                { label: 'Valeur actuelle', value: `${totalCurrent.toFixed(2)}€`,   color: undefined },
                { label: 'P&L total',      value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€`, color: totalPnl >= 0 ? '#3fb950' : '#ff4444' },
              ] as const).map(s => (
                <div key={s.label} className="rounded border border-border px-4 py-4">
                  <p className="text-[10px] text-muted uppercase tracking-widest">{s.label}</p>
                  <p className="text-lg font-bold mt-1 font-mono" style={s.color ? { color: s.color } : {}}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Equity curve */}
            {equityCurve.length > 1 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ChartTooltip
                      contentStyle={{ background: '#111111', border: '1px solid #1e1e1e', fontSize: 12 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [typeof v === 'number' ? `${v.toFixed(2)}€` : String(v ?? '')]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="invested" stroke="#888" strokeDasharray="4 2" dot={false} name="Investi" />
                    <Line type="monotone" dataKey="current" stroke="#3fb950" dot={false} name="Valeur actuelle" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Purchase history */}
            <div className="rounded border border-border overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-card">
                  <tr className="text-muted text-[10px] uppercase tracking-widest">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Actif</th>
                    <th className="px-4 py-2 text-right">Montant</th>
                    <th className="px-4 py-2 text-right">Prix</th>
                    <th className="px-4 py-2 text-right">Qté</th>
                    <th className="px-4 py-2 text-right">P&L</th>
                    <th className="px-4 py-2 text-center">Mult.</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map(c => {
                    const pnl = computePnl(c)
                    return (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted">{c.executed_at.slice(0, 10)}</td>
                        <td className="px-4 py-2 text-positive font-bold">{c.asset}</td>
                        <td className="px-4 py-2 text-right">{c.amount_eur.toFixed(2)}€</td>
                        <td className="px-4 py-2 text-right text-muted">
                          {c.price_eur ? `${c.price_eur.toFixed(2)}€` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-muted">
                          {c.quantity ? c.quantity.toFixed(6) : '—'}
                        </td>
                        <td
                          className="px-4 py-2 text-right font-semibold"
                          style={{ color: pnl == null ? '#888' : pnl >= 0 ? '#3fb950' : '#ff4444' }}
                        >
                          {pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}€`}
                        </td>
                        <td className="px-4 py-2 text-center text-muted">
                          {c.multiplier > 1 ? `×${c.multiplier.toFixed(1)} ⚡` : '×1'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

    </main>
  )
}

