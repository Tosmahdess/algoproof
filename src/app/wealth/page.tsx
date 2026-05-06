'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import ExplainerBox from '@/components/ExplainerBox'

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
  { label: 'Normal market',     multiplier: '1.0×', amount: '250€', condition: 'MI score > −30',  color: '#3fb950' },
  { label: 'Minor dip',         multiplier: '1.5×', amount: '375€', condition: 'MI score < −30',  color: '#f6c90e' },
  { label: 'Major dip / crash', multiplier: '2.5×', amount: '625€', condition: 'MI score < −50',  color: '#ff6b35' },
  { label: 'ETFs (PEA)',         multiplier: 'never', amount: '174€', condition: 'Always stable', color: '#4299e1' },
]

export default function WealthPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-16">

      {/* Hero */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          APEX Wealth
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          We invest every month. We show every purchase.
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">
          APEX Wealth is a systematic accumulation system — not a trading bot. Every month,
          a fixed budget is deployed across crypto, world ETFs, and gold. When the market dips,
          we deploy more. All purchases are logged publicly.
        </p>
      </div>

      {/* Allocation */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Portfolio Allocation</h2>
        <ExplainerBox
          functional={
            <p>
              250€ per month, split between a stable WEALTH core (70%) and a tactical GROWTH
              pocket (30%). The WEALTH core holds forever — crypto, world stocks, gold.
              The GROWTH pocket buys on dips and takes profits at predefined levels.
            </p>
          }
          technical={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
              <div>
                <p className="text-muted mb-2 font-semibold">WEALTH CORE — 175€/month</p>
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
                <p className="text-muted mb-2 font-semibold">GROWTH — 75€/month</p>
                <p className="text-muted text-[10px] leading-relaxed">
                  Event-driven dip buying. Deploys on −20% to −30% corrections per asset.
                  Take-profit at +40% (30%) and +80% (30%). Max 6 open positions.
                  Venue: Trade Republic CTO.
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
        <h2 className="text-base font-bold tracking-tight mb-6">Smart Amplification</h2>
        <ExplainerBox
          functional={
            <p>
              We invest more when prices drop. When the Market Intelligence service detects a
              significant market dip, the monthly budget is automatically multiplied — up to 2.5×.
              ETFs in the PEA are never amplified: their pace stays fixed for tax optimization.
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
        <h2 className="text-base font-bold tracking-tight mb-6">GROWTH Watchlist</h2>
        <ExplainerBox
          functional={
            <p>
              A curated list of high-conviction assets we buy on meaningful corrections.
              We don&apos;t chase pumps — we wait for −20% to −30% drops and deploy capital
              in tranches. Profits are taken at predefined levels (+40% and +80%).
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

      {/* Portfolio live — placeholder */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-4">Portfolio — Live Tracking</h2>
        <div className="rounded border border-dashed border-border px-6 py-10 text-center space-y-2">
          <p className="text-sm font-medium">Real purchase history coming soon.</p>
          <p className="text-xs text-muted">
            Every DCA buy will appear here with date, asset, amount, price at purchase,
            and live P&amp;L. Synced from VPS within 1 hour of execution.
          </p>
        </div>
      </section>

    </main>
  )
}
