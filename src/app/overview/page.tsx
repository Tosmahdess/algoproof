import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBotsWithStats, getAllTradesForAggregate, getLiveBotIds, getRecentTrades } from '@/lib/queries'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { parseFleetFilters } from '@/lib/bot-filters'
import FleetOverview from '@/components/FleetOverview'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'

// FIX round 2 (new Important finding): deliberately no `revalidate` export.
// Reading `searchParams` below opts this route into dynamic (per-request)
// rendering on its own — that's the correct trade, not a regression to
// fight: this page shows near-live bot data, and a shared filtered URL
// (e.g. ?family=carry) now renders its real, filtered content on first
// paint instead of a client-side spinner. Leaving a `revalidate` value here
// would be dead code that misstates the caching story to the next reader.
//
// FIX round 3 (Finding B, reviewer ruling): dynamic rendering is NOT free,
// and the paragraph above stopped short of saying what pays for it.
// getAllBotsWithStats() and getAllTradesForAggregate() (below) are wrapped
// in next/cache's unstable_cache (revalidate: 1800, tags 'fleet-bots' /
// 'fleet-trades') in src/lib/queries.ts — the same 30 minutes this route's
// old `revalidate` export used to buy, just moved to the data layer instead
// of the route. Without that, every request would re-run a paginated
// select('*') over trades AND perf_daily for each of ~33 bots, since Next
// 15+ does not cache fetch() by default.

export const metadata: Metadata = {
  title: 'La flotte : ce qui tourne, avec quel argent',
  description:
    'Tous mes bots de trading : ceux en argent réel, ceux en laboratoire, et le bilan brut sans filtre.',
  openGraph: { url: 'https://algoproof.fr/overview' },
}

interface OverviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Next's parsed searchParams gives an array for a repeated key, but this
// app's own URL scheme (serializeFleetFilters) only ever emits ONE
// occurrence of each key with its values comma-joined — so an array here
// (a hand-edited or externally-linked URL) is normalised the same way, by
// joining with a comma, before handing off to parseFleetFilters's own
// comma-split parsing.
function toURLSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    params.set(key, Array.isArray(value) ? value.join(',') : value)
  }
  return params
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const [bots, trades, liveBotIds, recentTrades, resolvedSearchParams] = await Promise.all([
    getAllBotsWithStats(),
    getAllTradesForAggregate(),
    getLiveBotIds(),
    // FIX (final review, I1+I2): the fleet-wide recent-trades feed the retired
    // page carried. Fetched here, in the server component, so it stays inside
    // stage 0 and never reaches the filter pipeline.
    getRecentTrades(20),
    searchParams,
  ])
  const aggregate = computeFleetAggregate(trades, liveBotIds)

  // FIX round 2 (new Important finding): filter state is seeded HERE, server
  // side, instead of via useSearchParams() inside the client component.
  // useSearchParams() forces everything up to its nearest Suspense boundary
  // to render client-only (the CSR bailout Next performs to keep that hook
  // usable at all) — which stripped the entire filterable register out of
  // this page's served HTML: every bot card, every /strategies link, gone,
  // replaced by two animate-pulse placeholders. That directly undercuts the
  // FAQ JSON-LD and metadata below, which exist specifically because this
  // page is meant to be indexed. See FleetRegister for the client side of
  // this fix (no more useSearchParams, no more Suspense boundary needed).
  const initialState = parseFleetFilters(toURLSearchParams(resolvedSearchParams))

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {/* Restored (fix round 1, I7) from the pre-merge /overview page — this
          FAQ schema and the "Comment lire" explainer were dropped when the
          page was rewritten to feed FleetOverview and never replaced. */}
      <JsonLd data={faqJsonLd([
        { question: 'Les résultats sont-ils réels ?', answer: 'Oui. Les bots tournent en continu et chaque trade est enregistré automatiquement, gains comme pertes. Les chiffres sont mis à jour toutes les heures.' },
        { question: 'Qu\'est-ce que le profit factor ?', answer: 'C\'est le rapport entre l\'argent gagné et l\'argent perdu. Un PF de 1,3 signifie 1,30 € gagné pour 1 € perdu.' },
        { question: 'Le trading est-il en argent réel ?', answer: 'La plupart des bots sont en paper trading (simulation fidèle). Les bots en argent réel sont indiqués comme « live ».' },
      ])} />
      <h1 className="text-2xl font-bold tracking-tight mb-2">La flotte</h1>
      <p className="text-sm text-muted max-w-2xl mb-8">
        Ce qui tourne en ce moment, avec quel argent, et ce que ça donne au total.
        Comment lire : le <Link href="/lexique#profit-factor" className="text-accent">profit factor</Link> mesure
        les gains divisés par les pertes (au-dessus de 1, la stratégie gagne), le{' '}
        <Link href="/lexique#win-rate" className="text-accent">win rate</Link> le % de trades gagnants, le{' '}
        <Link href="/lexique#drawdown" className="text-accent">drawdown</Link> la pire baisse. Plus de définitions
        dans le <Link href="/lexique" className="text-accent">lexique</Link>.
      </p>
      <FleetOverview
        bots={bots}
        aggregate={aggregate}
        recentTrades={recentTrades}
        initialState={initialState}
      />
    </main>
  )
}
