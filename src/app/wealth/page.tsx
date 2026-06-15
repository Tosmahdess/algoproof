'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'
import ExplainerBox from '@/components/ExplainerBox'
import { TopPicks, type FicheLite } from '@/components/TopPicks'
import type { BotChangelog, GrowthAsset, Verdict } from '@/lib/types'
import ComponentChangelog from '@/components/ComponentChangelog'
import AnalysesClient from '@/components/AnalysesClient'
import type { FicheIndexRow } from '@/lib/equity'

// Latest fiche per ticker, as returned by /api/equity-fiche (lib/equity CoveredFiche).
type CoveredFiche = { ticker: string; verdict: Verdict; generated_at: string; price_at_generation: number | null; ticker_yf: string }

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
  const [growthUniverse, setUniverse]   = useState<GrowthAsset[]>([])
  const [fiches, setFiches]             = useState<CoveredFiche[]>([])
  const [fichesIndex, setFichesIndex]   = useState<FicheIndexRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [wealthChanges, setWealthChanges] = useState<BotChangelog[]>([])

  useEffect(() => {
    fetch('/api/growth-universe')
      .then(r => r.json())
      .then((universe) => {
        setUniverse(Array.isArray(universe) ? universe : [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetch('/api/fiches-index')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: FicheIndexRow[]) => setFichesIndex(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/equity-fiche')
      .then((r) => r.json())
      .then((list: CoveredFiche[]) => setFiches(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/changelog?scope=wealth')
      .then(r => r.ok ? r.json() : [])
      .then((d: BotChangelog[]) => setWealthChanges(Array.isArray(d) ? d : []))
      .catch(() => setWealthChanges([]))
  }, [])

  // Derived: fiche-lite map (Top 5: verdict + live price)
  const ficheByTicker = fiches.reduce((acc, f) => {
    acc[f.ticker] = { verdict: f.verdict, price_at_generation: f.price_at_generation, ticker_yf: f.ticker_yf }
    return acc
  }, {} as Record<string, FicheLite>)

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-16">
      <JsonLd data={faqJsonLd([
        { question: 'C\'est quoi le DCA ?', answer: 'Acheter une somme fixe à intervalle régulier, peu importe le prix, pour lisser le point d\'entrée dans le temps.' },
        { question: 'Comment sont choisis les points d\'entrée ?', answer: 'À partir du repli depuis les plus hauts (drawdown) sur 180 jours et des plus hauts historiques, pour renforcer dans les creux sans attraper un couteau qui tombe.' },
        { question: 'Est-ce un conseil d\'achat ?', answer: 'Non. C\'est mon journal d\'investissement personnel, partagé en transparence. Ce n\'est pas un conseil financier.' },
      ])} />

      {/* Hero */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          APEX Wealth
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          J&apos;investis chaque mois. Je montre chaque achat.
        </h1>
        <p className="text-sm text-muted max-w-2xl mb-6">
          Je suis une liste d&apos;actions et de cryptos sur le long terme. Le <strong>DCA</strong> (Dollar Cost Averaging) consiste à acheter régulièrement par petites tranches. Ici, je note à quel prix je renforce chaque position.
        </p>
        <p className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">
          APEX Wealth est mon système d&apos;accumulation systématique, pas un bot de trading. Chaque mois,
          je déploie un budget fixe sur la crypto, les ETF monde et l&apos;or. Quand le marché baisse,
          j&apos;investis davantage. Chaque achat est enregistré publiquement.
        </p>
      </div>

      <ComponentChangelog title="Dernier changement" entries={wealthChanges.slice(0, 1)} href="/journal/patrimoine" initialCount={1} />

      {/* Top 5 du moment — qualité en solde maintenant */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold tracking-tight">5 à renforcer maintenant</h2>
          <span className="text-xs text-muted">signal d&apos;achat · thèse intacte</span>
        </div>
        <p className="text-xs text-muted mb-5 max-w-2xl leading-relaxed">
          Les 5 sociétés du moment : une thèse que je garde en « renforcer » <em>et</em> un creux d&apos;achat actif.
          Je les classe par force du signal puis profondeur du repli. Rien de choisi à la main, tout sort des données.
          Clique pour mon analyse complète.
        </p>
        <TopPicks
          assets={growthUniverse}
          fiches={ficheByTicker}
          loading={loading}
        />
        <div className="mt-3 text-right">
          <Link href="/wealth/analyses" className="text-sm text-accent">Toutes mes analyses →</Link>
        </div>
      </section>

      {/* Allocation */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Allocation du portefeuille</h2>
        <ExplainerBox stacked
          functional={
            <p>
              250€ par mois, répartis entre un socle WEALTH stable (70%) et une poche GROWTH
              tactique (30%). Je conserve le socle WEALTH indéfiniment : crypto, actions monde, or.
              La poche GROWTH achète sur les baisses et prend des bénéfices à des niveaux prédéfinis.
            </p>
          }
          technical={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
              <div>
                <p className="text-muted mb-2 font-semibold">SOCLE WEALTH · 175€/mois</p>
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
                <p className="text-muted mb-2 font-semibold">GROWTH · 75€/mois</p>
                <p className="text-muted text-[10px] leading-relaxed">
                  Achats opportunistes sur baisses. Déploiement sur corrections −20% à −30% par actif.
                  Prise de bénéfices à +40% (30%) et +80% (30%). Max 6 positions ouvertes.
                  Venue : Trade Republic CTO.
                </p>
              </div>
            </div>
          }
        />
      </section>

      {/* Amplification */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Amplification intelligente</h2>
        <ExplainerBox stacked
          functional={
            <p>
              J&apos;investis davantage quand les prix baissent. Quand mon service d&apos;Intelligence de Marché détecte une
              baisse significative, le budget mensuel est automatiquement multiplié, jusqu&apos;à 2,5×.
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

      {/* GROWTH — analyses par secteur (rendu identique à /wealth/analyses) */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-2">GROWTH · mes analyses par secteur</h2>
        <p className="text-xs text-muted mb-6 max-w-2xl leading-relaxed">
          Tout mon univers d&apos;investissement, classé par secteur, avec mon verdict par société
          (renforcer / maintenir / passer). Clique une société pour mon analyse complète.
        </p>
        <AnalysesClient fiches={fichesIndex} />
      </section>

    </main>
  )
}

