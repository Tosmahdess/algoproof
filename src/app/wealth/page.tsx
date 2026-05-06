'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts'
import ExplainerBox from '@/components/ExplainerBox'
import type { WealthCall, AssetPrice } from '@/lib/types'

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

const GROWTH_ASSETS = [
  { ticker: 'SOL',    name: 'Solana',       trigger: '−30%', venue: 'Binance' },
  { ticker: 'NVDA',   name: 'NVIDIA',       trigger: '−20%', venue: 'TR CTO' },
  { ticker: 'META',   name: 'Meta',         trigger: '−20%', venue: 'TR CTO' },
  { ticker: 'TSLA',   name: 'Tesla',        trigger: '−20%', venue: 'TR CTO' },
  { ticker: 'NVO',    name: 'Novo Nordisk', trigger: '−30%', venue: 'TR CTO' },
  { ticker: 'MC.PA',  name: 'LVMH',         trigger: '−25%', venue: 'TR CTO' },
  { ticker: 'RMS.PA', name: 'Hermès',       trigger: '−25%', venue: 'TR CTO' },
  { ticker: 'PLTR',   name: 'Palantir',     trigger: '−25%', venue: 'TR CTO' },
]

const AMPLIFICATION = [
  { label: 'Marché normal',        multiplier: '1.0×', amount: '250€', condition: 'Score MI > −30',  color: '#3fb950' },
  { label: 'Baisse mineure',       multiplier: '1.5×', amount: '375€', condition: 'Score MI < −30',  color: '#f6c90e' },
  { label: 'Baisse majeure / krach', multiplier: '2.5×', amount: '625€', condition: 'Score MI < −50',  color: '#ff6b35' },
  { label: 'ETF (PEA)',            multiplier: 'never', amount: '174€', condition: 'Toujours stable', color: '#4299e1' },
]

export default function WealthPage() {
  const [calls, setCalls]     = useState<WealthCall[]>([])
  const [prices, setPrices]   = useState<AssetPrice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wealth')
      .then(r => r.json())
      .then(({ calls: c, prices: p }) => {
        setCalls(c)
        setPrices(p)
        setLoading(false)
      })
  }, [])

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
        <ExplainerBox
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
        <div className="mt-8 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={WEALTH_ASSETS}
                dataKey="pct"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
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
      </section>

      {/* Amplification */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Amplification intelligente</h2>
        <ExplainerBox
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

      {/* GROWTH Watchlist */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Watchlist GROWTH</h2>
        <ExplainerBox
          functional={
            <p>
              Une liste d&apos;actifs à forte conviction que l&apos;on achète sur des corrections significatives.
              On ne court pas après les hausses — on attend des baisses de −20% à −30% et on déploie le capital
              par tranches. Les bénéfices sont pris à des niveaux prédéfinis (+40% et +80%).
            </p>
          }
          technical={
            <div className="grid grid-cols-2 gap-1 text-xs font-mono">
              {GROWTH_ASSETS.map(a => (
                <div key={a.ticker} className="flex items-center gap-2 py-1 border-b border-border">
                  <span className="text-positive w-16 font-bold">{a.ticker}</span>
                  <span className="text-muted flex-1">{a.name}</span>
                  <span className="text-[10px] text-muted">{a.trigger}</span>
                </div>
              ))}
            </div>
          }
        />
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
