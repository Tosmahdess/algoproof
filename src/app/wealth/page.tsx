'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'
import ExplainerBox from '@/components/ExplainerBox'
import { TopPicks, type FicheLite } from '@/components/TopPicks'
import { LatestAnalyses } from '@/components/LatestAnalyses'
import type { BotChangelog, GrowthAsset, Verdict } from '@/lib/types'
import ComponentChangelog from '@/components/ComponentChangelog'
import AnalysesClient from '@/components/AnalysesClient'
import type { FicheIndexRow } from '@/lib/equity'

// Latest fiche per ticker, as returned by /api/equity-fiche (lib/equity CoveredFiche).
type CoveredFiche = { ticker: string; verdict: Verdict; generated_at: string; price_at_generation: number | null; ticker_yf: string }

// Source: apex-wealth/portfolios.py WEALTH_ALLOCATION.
// Target allocation, percentages only (2026-07-04: the monthly DCA is a published
// framework, not an executed journal — no € amounts, no venues).
const WEALTH_ASSETS = [
  { name: 'Bitcoin (BTC)',    pct: 21,   color: '#f7931a', assetClass: 'Crypto' },
  { name: 'Ethereum (ETH)',   pct: 14,   color: '#627eea', assetClass: 'Crypto' },
  { name: 'MSCI World (CW8)', pct: 17.5, color: '#4299e1', assetClass: 'ETF' },
  { name: 'Nasdaq-100 (CL2)', pct: 11.9, color: '#667eea', assetClass: 'ETF' },
  { name: 'Gold (XAU)',       pct: 5.6,  color: '#f6c90e', assetClass: 'Commodity' },
  { name: 'GROWTH tactical',  pct: 30,   color: '#3fb950', assetClass: 'Tactical' },
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
  { label: 'Marché normal',          multiplier: '1.0×',            condition: 'Score MI > −30',  color: '#3fb950' },
  { label: 'Baisse mineure',         multiplier: '1.5×',            condition: 'Score MI < −30',  color: '#f6c90e' },
  { label: 'Baisse majeure / krach', multiplier: '2.5×',            condition: 'Score MI < −50',  color: '#ff6b35' },
  { label: 'ETF',                    multiplier: 'jamais amplifié', condition: 'Cadence fixe',    color: '#4299e1' },
]

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
        { question: 'C\'est quoi cette page ?', answer: 'Mon cadre d\'investissement long terme : une allocation cible en pourcentages et mes analyses par société (verdict, thèse, creux d\'achat). Un modèle publié en transparence, pas un journal d\'achats.' },
        { question: 'Comment sont choisis les points d\'entrée ?', answer: 'À partir du repli depuis les plus hauts (drawdown) sur 180 jours et des plus hauts historiques, pour renforcer dans les creux sans attraper un couteau qui tombe.' },
        { question: 'Est-ce un conseil d\'achat ?', answer: 'Non. C\'est mon journal d\'investissement personnel, partagé en transparence. Ce n\'est pas un conseil financier.' },
      ])} />

      {/* Hero */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          APEX Wealth
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Mon allocation cible et mes analyses long terme.
        </h1>
        <p className="text-sm text-muted max-w-2xl mt-3 leading-relaxed">
          Je maintiens une allocation cible (crypto, ETF monde, or, poche tactique) et
          j&apos;analyse en continu un univers de 80+ sociétés : verdict par société, phrase de
          thèse, creux d&apos;achat détectés automatiquement. Ce n&apos;est pas un conseil :
          c&apos;est mon travail d&apos;analyse, publié.
        </p>
      </div>

      <ComponentChangelog title="Dernier changement" entries={wealthChanges.slice(0, 1)} href="/journal/patrimoine" initialCount={1} />

      {/* Latest analyses — the hero: freshness from the real analysis rhythm */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold tracking-tight">Dernières analyses</h2>
          <span className="text-xs text-muted">verdict + thèse, les plus récentes d&apos;abord</span>
        </div>
        <LatestAnalyses fiches={fichesIndex} />
        <div className="mt-3 text-right">
          <Link href="#analyses" className="text-sm text-accent">Tout l&apos;univers par secteur ↓</Link>
        </div>
      </section>

      {/* Active dip signals only (0..5) — honest empty state otherwise */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold tracking-tight">Creux d&apos;achat actifs</h2>
          <span className="text-xs text-muted">mis à jour toutes les 4h (= mes alertes Telegram)</span>
        </div>
        <p className="text-xs text-muted mb-5 max-w-2xl leading-relaxed">
          Les sociétés dont je garde la thèse en « renforcer » et qui présentent un creux
          d&apos;achat actif en ce moment. Rien de choisi à la main, tout sort des données.
          S&apos;il n&apos;y en a pas, le bloc le dit.
        </p>
        <TopPicks
          assets={growthUniverse}
          fiches={ficheByTicker}
          loading={loading}
        />
      </section>

      {/* GROWTH — analyses par secteur (moved up: the fiches are the product) */}
      <section id="analyses">
        <h2 className="text-base font-bold tracking-tight mb-2">GROWTH · mes analyses par secteur</h2>
        <p className="text-xs text-muted mb-6 max-w-2xl leading-relaxed">
          Tout mon univers d&apos;investissement, classé par secteur, avec mon verdict par société
          (renforcer / maintenir / passer). Clique une société pour mon analyse complète.
          <br />
          <span className="text-muted/70">Ces verdicts sont révisés une fois par mois (le 1ᵉʳ) : une décision de fond, pas une réaction au prix. Pour les creux d&apos;achat du moment, mis à jour toutes les 4h, vois « Creux d&apos;achat actifs » plus haut.</span>
        </p>
        <AnalysesClient fiches={fichesIndex} />
        <p className="text-xs text-muted/70 mt-4 italic">
          Mon journal d&apos;investissement personnel, partagé en transparence. Ce n&apos;est pas un conseil financier.
        </p>
      </section>

      {/* Allocation */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Allocation du portefeuille</h2>
        <ExplainerBox stacked
          functional={
            <p>
              Une allocation cible en deux poches : un socle stable (70 %) fait de crypto,
              d&apos;actions monde et d&apos;or, que je conserve indéfiniment, et une poche
              tactique GROWTH (30 %) qui cible les baisses et prend des bénéfices à des
              niveaux prédéfinis.
            </p>
          }
          technical={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
              <div>
                <p className="text-muted mb-2 font-semibold">SOCLE · 70 %</p>
                {WEALTH_ASSETS.filter(a => a.assetClass !== 'Tactical').map(a => (
                  <div key={a.name} className="flex items-center gap-2 py-0.5">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                    <span className="text-muted flex-1">{a.name}</span>
                    <span className="font-semibold">{a.pct}%</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-muted mb-2 font-semibold">GROWTH · 30 %</p>
                <p className="text-muted text-[10px] leading-relaxed">
                  Achats opportunistes sur corrections −20% à −30% par actif.
                  Prises de bénéfices à +40% (30%) et +80% (30%). Max 6 positions ouvertes.
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
              Le cadre amplifie quand les prix baissent : si mon service d&apos;Intelligence
              de Marché détecte une baisse significative, le multiplicateur d&apos;achat
              passe de 1× à 1,5×, jusqu&apos;à 2,5× en krach. Les ETF ne sont jamais
              amplifiés : leur cadence reste fixe.
            </p>
          }
          technical={
            <div className="space-y-1 text-xs font-mono">
              {AMPLIFICATION.map(a => (
                <div key={a.label} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                  <span className="text-muted w-36 flex-shrink-0">{a.label}</span>
                  <span className="font-bold w-28">{a.multiplier}</span>
                  <span className="text-muted text-[10px]">{a.condition}</span>
                </div>
              ))}
            </div>
          }
        />
      </section>

      {/* Bridge to the trading side — no bot cards here on purpose: long-term
          investing and algo trading are two different products/risk levels. */}
      <section className="rounded-xl border border-border bg-card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Le trading algo, c&apos;est de l&apos;autre côté : mes 30+ bots publient chaque
          trade, gains comme pertes.
        </p>
        <Link href="/strategies" className="text-sm text-positive hover:underline flex-shrink-0">
          Voir mes bots →
        </Link>
      </section>

    </main>
  )
}

