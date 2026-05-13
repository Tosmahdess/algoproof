'use client'

import { useState } from 'react'
import type { BotWithStats } from '@/lib/types'
import BotCard from '@/components/BotCard'

type StatusFilter = 'all' | 'live' | 'paper'

const FAMILIES = [
  {
    slug: 'trend', label: 'Suivi de tendance', color: '#ff6b35',
    description: "Les stratégies de suivi de tendance exploitent les mouvements directionnels du marché. Le bot entre quand la tendance est confirmée et sort quand elle s'affaiblit. Peu de trades, mais un excellent ratio gain/risque quand ils se déclenchent.",
  },
  {
    slug: 'breakout', label: 'Cassure', color: '#3fb950',
    description: "Détecte quand le prix franchit un niveau clé ou sort d'une zone de consolidation. Ces bots capturent l'élan naissant au début d'un nouveau mouvement.",
  },
  {
    slug: 'mean-reversion', label: 'Retour à la moyenne', color: '#7c3aed',
    description: "Ces stratégies exploitent les excès de marché : le prix s'est écarté de sa valeur d'équilibre et tend à y revenir. Entrée en contre-tendance, sortie rapide dès la normalisation.",
  },
  {
    slug: 'carry', label: 'Portage', color: '#f6c90e',
    description: "Les stratégies de portage capturent un rendement récurrent sans pari directionnel. Elles encaissent des taux de financement (delta-neutre) ou exploitent la volatilité dans un range fixe (grille). Le rendement est indépendant de la hausse ou baisse du marché.",
  },
]

export default function StrategiesClient({ bots }: { bots: BotWithStats[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [familyFilter, setFamilyFilter] = useState<string | null>(null)

  const liveCount = bots.filter(b => b.status === 'live').length

  const filtered = bots.filter(b => {
    const statusOk = statusFilter === 'all' || b.status === statusFilter
    const familyOk = familyFilter === null || b.family === familyFilter
    return statusOk && familyOk
  })

  const filteredLive  = filtered.filter(b => b.status === 'live')
  const filteredPaper = filtered.filter(b => b.status !== 'live')
  const showLiveSection = statusFilter !== 'paper' && filteredLive.length > 0
  const familiesToShow  = familyFilter ? FAMILIES.filter(f => f.slug === familyFilter) : FAMILIES

  const toggleStatus = (s: 'live' | 'paper') =>
    setStatusFilter(prev => prev === s ? 'all' : s)

  const toggleFamily = (slug: string) =>
    setFamilyFilter(prev => prev === slug ? null : slug)

  const resetFilters = () => { setStatusFilter('all'); setFamilyFilter(null) }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stratégies de trading</h1>
        <p className="mt-2 text-sm text-muted">
          {bots.length} bots
          {liveCount > 0 && (
            <> · <span className="text-positive font-medium">{liveCount} live</span></>
          )}
          {' · '}chaque trade publié
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => toggleStatus('live')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            statusFilter === 'live'
              ? 'bg-positive/10 border-positive/40 text-positive'
              : 'border-border text-muted hover:text-foreground'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'live' ? 'bg-positive animate-pulse' : 'bg-muted'}`} />
          Live
        </button>
        <button
          onClick={() => toggleStatus('paper')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            statusFilter === 'paper'
              ? 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300'
              : 'border-border text-muted hover:text-foreground'
          }`}
        >
          Paper
        </button>

        <div className="w-px h-4 bg-border" />

        <button
          onClick={() => setFamilyFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            familyFilter === null
              ? 'border-muted/60 text-foreground'
              : 'border-border text-muted hover:text-foreground'
          }`}
        >
          Tous
        </button>
        {FAMILIES.map(fam => (
          <button
            key={fam.slug}
            onClick={() => toggleFamily(fam.slug)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            style={familyFilter === fam.slug ? {
              backgroundColor: `${fam.color}18`,
              borderColor: `${fam.color}66`,
              color: fam.color,
            } : { borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            {fam.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded border border-border px-6 py-12 text-center">
          <p className="text-sm text-muted mb-3">Aucun bot ne correspond à ces filtres.</p>
          <button onClick={resetFilters} className="text-xs text-positive hover:underline">
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* Live section — pinned when statusFilter !== paper */}
      {showLiveSection && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            <h2 className="text-sm font-bold text-positive uppercase tracking-widest">
              En direct — Capital réel
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLive.map(bot => (
              <div
                key={bot.slug}
                className="rounded-xl"
                style={{ boxShadow: '0 0 0 1px rgba(63,185,80,0.35)', background: 'rgba(63,185,80,0.025)' }}
              >
                <BotCard bot={bot} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Family sections — paper bots only */}
      {familiesToShow.map(fam => {
        const famBots = filteredPaper
          .filter(b => b.family === fam.slug)
          .sort((a, b) => b.stats.latest_capital - a.stats.latest_capital)

        if (familyFilter !== null && famBots.length === 0) return null

        return (
          <section key={fam.slug} id={fam.slug}>
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: fam.color }}>
                {fam.label}
              </h2>
              <span className="text-xs text-muted">
                {famBots.length} {famBots.length === 1 ? 'bot' : 'bots'}
              </span>
            </div>
            <p className="text-xs text-muted mb-6 max-w-2xl">{fam.description}</p>

            {famBots.length === 0 ? (
              <div className="rounded border border-border px-6 py-8 text-center text-xs text-muted">
                Bientôt disponible — bots en développement ou en phase de backtest.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {famBots.map(bot => (
                  <BotCard key={bot.slug} bot={bot} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
