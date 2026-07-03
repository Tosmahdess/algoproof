'use client'

import { useMemo, useState } from 'react'
import type { BotWithStats, BotStats } from '@/lib/types'
import BotCard from '@/components/BotCard'
import AssetFilterSelect from '@/components/AssetFilterSelect'
import { assetOptionsFromTrades } from '@/lib/asset'
import { computeBotStats } from '@/lib/stats'
import { splitCohorts } from '@/lib/cohort'

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
  {
    slug: 'market-neutral', label: 'Marché neutre', color: '#14b8a6',
    description: "Stratégies neutres au marché : autant de positions longues que courtes, pour ne pas dépendre de la hausse ou de la baisse générale. Le rendement vient de l'écart entre les actifs sélectionnés — les forts contre les faibles — et non de la direction du marché.",
  },
]

export default function StrategiesClient({ bots }: { bots: BotWithStats[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [familyFilter, setFamilyFilter] = useState<string | null>(null)
  const [asset, setAsset] = useState<string>('all')

  const liveCount = bots.filter(b => b.status === 'live').length

  const assetOptions = useMemo(
    () => assetOptionsFromTrades(bots.flatMap(b => b.all_trades)),
    [bots],
  )
  // Per-bot stats recomputed for the selected asset (null = lifetime stats).
  const assetStats = useMemo<Record<string, BotStats> | null>(() => {
    if (asset === 'all') return null
    const map: Record<string, BotStats> = {}
    for (const b of bots) {
      map[b.slug] = computeBotStats(b.all_trades, b.perf_daily, 'all', b.start_capital, asset)
    }
    return map
  }, [bots, asset])

  const overrideFor = (slug: string): BotStats | undefined => assetStats?.[slug]
  const effStats = (b: BotWithStats): BotStats => overrideFor(b.slug) ?? b.stats

  const filtered = bots.filter(b => {
    const statusOk = statusFilter === 'all' || b.status === statusFilter
    const familyOk = familyFilter === null || b.family === familyFilter
    const assetOk  = asset === 'all' || effStats(b).total_trades > 0
    return statusOk && familyOk && assetOk
  })

  const { live: filteredLive, paper: filteredPaper, archived: filteredArchived } = splitCohorts(filtered)
  const showLiveSection     = statusFilter !== 'paper' && filteredLive.length > 0
  const showPaperHeading    = filteredPaper.length > 0
  const showArchivedSection = filteredArchived.length > 0
  const familiesToShow  = familyFilter ? FAMILIES.filter(f => f.slug === familyFilter) : FAMILIES

  const toggleStatus = (s: 'live' | 'paper') =>
    setStatusFilter(prev => prev === s ? 'all' : s)

  const toggleFamily = (slug: string) =>
    setFamilyFilter(prev => prev === slug ? null : slug)

  const resetFilters = () => { setStatusFilter('all'); setFamilyFilter(null); setAsset('all') }

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

        <div className="w-px h-4 bg-border" />
        <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} label="Actif" />
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
                <BotCard bot={bot} statsOverride={overrideFor(bot.slug)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Paper trading — grouped by family */}
      {showPaperHeading && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
            <h2 className="text-sm font-bold text-yellow-300 uppercase tracking-widest">
              Paper trading
            </h2>
          </div>
        </div>
      )}
      {familiesToShow.map(fam => {
        const famBots = filteredPaper
          .filter(b => b.family === fam.slug)
          .sort((a, b) =>
            (effStats(b).latest_capital - b.start_capital) - (effStats(a).latest_capital - a.start_capital)
          )

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
                  <BotCard key={bot.slug} bot={bot} statsOverride={overrideFor(bot.slug)} />
                ))}
              </div>
            )}
          </section>
        )
      })}

      {/* Archived — badged, excluded from every aggregate, kept visible for transparency */}
      {showArchivedSection && (
        <section>
          <div className="flex items-center gap-2 mb-4 opacity-70">
            <span className="w-2 h-2 rounded-full bg-muted" />
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest">
              Archivés
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
            {filteredArchived.map(bot => (
              <BotCard key={bot.slug} bot={bot} statsOverride={overrideFor(bot.slug)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
