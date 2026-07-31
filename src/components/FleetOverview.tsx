// « La flotte » — composes stage 0 (server-rendered, unfilterable) with
// stages 1+2 (client, filterable). Deliberately NOT `'use client'` and NOT
// `async`: it is plain, synchronous JSX so it renders inside the server
// component tree (`src/app/overview/page.tsx`) exactly like any other server
// component, and so it stays trivially testable with a synchronous render()
// call — no data fetching to mock, just props in, markup out.
//
// The Suspense boundary is required for `next build`, not for behaviour: it
// wraps ONLY FleetRegister, the client component that calls useSearchParams().
// A statically-prerendered route (`export const revalidate = 1800` on the
// page) cannot ship with a searchParams-reading client component outside a
// Suspense boundary — Next throws `missing-suspense-with-csr-bailout` at
// build time. Putting the boundary here, below FleetBalance, keeps the
// balance sheet itself fully static and out of any client bailout: it is not
// what CSR-bails, so it is not what the fallback below ever hides.
import { Suspense } from 'react'
import type { BotWithStats } from '@/lib/types'
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import FleetBalance from '@/components/FleetBalance'
import FleetRegister from '@/components/FleetRegister'

export interface FleetOverviewProps {
  bots: BotWithStats[]
  aggregate: FleetAggregate
}

function FleetRegisterFallback() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-40 bg-card rounded animate-pulse" />
      <div className="h-24 bg-card border border-border rounded-lg animate-pulse" />
    </div>
  )
}

export default function FleetOverview({ bots, aggregate }: FleetOverviewProps) {
  return (
    <div className="space-y-12">
      <FleetBalance aggregate={aggregate} />
      <Suspense fallback={<FleetRegisterFallback />}>
        <FleetRegister bots={bots} />
      </Suspense>
    </div>
  )
}
