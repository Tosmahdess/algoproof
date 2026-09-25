// /overview, « La flotte » (lot 4 of the design audit, 2026-09-25, conception
// §5.2): the title, one line with the freshness, then the two totals, the
// real-money cards and the register. The metric definitions that used to open
// the page (64 words before any figure) close it instead.
//
// No `revalidate` export on purpose: reading `searchParams` makes this route
// dynamic, so a shared filtered URL renders its filtered content on first paint.
// The data calls are cached in src/lib/queries.ts (unstable_cache, 30 min).
import TermPopover from '@/components/TermPopover'
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBotsWithStats, getAllTradesForAggregate, getLiveBots, getRecentTrades } from '@/lib/queries'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { parseFleetFilters } from '@/lib/bot-filters'
import { minutesSince } from '@/lib/home-data'
import FleetOverview from '@/components/FleetOverview'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'

export const metadata: Metadata = {
  title: 'La flotte : ce qui tourne, avec quel argent',
  description:
    'Tous mes bots de trading : ceux en argent réel, ceux en simulation, et les deux totaux, jamais fusionnés.',
  openGraph: { url: 'https://algoproof.fr/overview' },
}

interface OverviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// This app's URL scheme emits ONE occurrence of each key, comma-joined; an
// array (a hand-edited URL) is normalised the same way.
function toURLSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    params.set(key, Array.isArray(value) ? value.join(',') : value)
  }
  return params
}

const fresh = (minutes: number | null) => (minutes === null ? null : minutes < 2 ? 'Mis à jour à l’instant.' : `Mis à jour il y a ${minutes} min.`)

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const [bots, trades, liveBots, recentTrades, resolvedSearchParams] = await Promise.all([
    getAllBotsWithStats(),
    getAllTradesForAggregate(),
    getLiveBots(),
    getRecentTrades(20),
    searchParams,
  ])
  const aggregate = computeFleetAggregate(trades, liveBots)
  // Parsed server side (no useSearchParams in the client: it stripped the
  // register out of the served HTML).
  const initialState = parseFleetFilters(toURLSearchParams(resolvedSearchParams))
  const minutes = minutesSince(bots.filter(b => b.status !== 'archived').map(b => b.last_sync_at))
  const f = fresh(minutes)

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <JsonLd data={faqJsonLd([
        { question: 'Les résultats sont-ils réels ?', answer: 'Oui. Les bots tournent en continu et chaque trade est enregistré automatiquement, gains comme pertes. Les chiffres sont mis à jour toutes les heures.' },
        { question: 'Qu\'est-ce que le profit factor ?', answer: 'C\'est le rapport entre l\'argent gagné et l\'argent perdu. Un PF de 1,5 signifie 1,50 € gagné pour 1 € perdu.' },
        { question: 'Le trading est-il en argent réel ?', answer: 'La plupart des bots sont en simulation sur données réelles, frais et slippage compris. Les bots qui tournent avec mon argent sont marqués « Argent réel », et leur total ne se mélange jamais à celui de la simulation.' },
      ])} />
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">La flotte</h1>
        <p className="text-sm sm:text-base text-muted mt-2 max-w-[60ch]">
          Ce qui tourne, avec quel argent, et ce que ça donne.
          {f && <> <span data-testid="fleet-fresh">{f}</span></>}
        </p>
      </header>

      <FleetOverview
        bots={bots}
        aggregate={aggregate}
        recentTrades={recentTrades}
        initialState={initialState}
        minutes={minutes}
      />

      <p className="text-xs text-muted max-w-[70ch] mt-10 leading-relaxed">
        Comment lire : le <TermPopover id="profit-factor">PF</TermPopover> (profit factor) mesure
        les gains divisés par les pertes, au-dessus de 1 la stratégie gagne. Le{' '}
        <TermPopover id="win-rate">WR</TermPopover> (win rate) est la part de trades gagnants, le{' '}
        <TermPopover id="drawdown">DD</TermPopover> (drawdown) la pire baisse depuis un sommet. Plus de définitions
        dans le <Link href="/lexique" className={linkClass('inline')}>lexique</Link>.
      </p>
    </main>
  )
}
