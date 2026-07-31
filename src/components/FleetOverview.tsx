// « La flotte » — composes stage 0 (server-rendered, unfilterable) with
// stages 1+2 (client, filterable, but now seeded server-side — see below).
// Deliberately NOT `'use client'` and NOT `async`: it is plain, synchronous
// JSX so it renders inside the server component tree
// (`src/app/overview/page.tsx`) exactly like any other server component, and
// so it stays trivially testable with a synchronous render() call — no data
// fetching to mock, just props in, markup out.
//
// FIX round 2 (new Important finding): no more `<Suspense>` here, and no
// more fallback component. The Suspense boundary existed only to satisfy
// Next's requirement that a client component calling useSearchParams() sit
// inside one — but that requirement exists BECAUSE useSearchParams() forces
// a client-side-only render (a "CSR bailout") of everything inside the
// boundary, which meant the fallback's two `animate-pulse` placeholder divs
// were literally what got served to crawlers instead of the register's bot
// cards and /strategies links. `FleetRegister` no longer calls
// useSearchParams() at all — filter state is parsed server-side in
// `overview/page.tsx` and passed down as `initialState` — so there is no
// bailout left to contain, and the boundary would only have been decorative.
import type { BotWithStats } from '@/lib/types'
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import type { FleetFilterState } from '@/lib/bot-filters'
import FleetBalance from '@/components/FleetBalance'
import FleetRegister from '@/components/FleetRegister'

export interface FleetOverviewProps {
  bots: BotWithStats[]
  aggregate: FleetAggregate
  initialState: FleetFilterState
}

export default function FleetOverview({ bots, aggregate, initialState }: FleetOverviewProps) {
  return (
    <div className="space-y-12">
      <FleetBalance aggregate={aggregate} />
      <FleetRegister bots={bots} initialState={initialState} />
    </div>
  )
}
