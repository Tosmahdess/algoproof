import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopPicks, selectTopPicks } from '@/components/TopPicks'
import type { GrowthAsset } from '@/lib/types'

const asset = (over: Partial<GrowthAsset>): GrowthAsset => ({
  ticker: 'X', asset_name: 'X corp', category: null, tier: 1, tracking_mode: null,
  hold_forever: null, dip_trigger_pct: null, tp1_pct: null, tp2_pct: null,
  tp1_sell_pct: null, tp2_sell_pct: null, residual_pct: null, exit_state: null,
  current_price: 10, ref_price_180j: null, drawdown_pct: -0.1, signal_level: null,
  suggested_min: null, suggested_max: null, ...over,
} as GrowthAsset)

const fiches = {
  AAA: { verdict: 'renforcer' as const, price_at_generation: 10, ticker_yf: 'AAA' },
  BBB: { verdict: 'renforcer' as const, price_at_generation: 10, ticker_yf: 'BBB' },
}

describe('selectTopPicks (real dips only)', () => {
  it('returns only renforcer names with an active dip signal', () => {
    const out = selectTopPicks([
      asset({ ticker: 'AAA', signal_level: 'major' }),
      asset({ ticker: 'BBB', signal_level: null }),   // watching: must NOT backfill
    ], fiches)
    expect(out.map(a => a.ticker)).toEqual(['AAA'])
  })
  it('returns empty when no dip is active', () => {
    expect(selectTopPicks([asset({ ticker: 'BBB' })], fiches)).toEqual([])
  })
})

describe('TopPicks render', () => {
  it('shows the honest empty state when no dip is active', () => {
    render(<TopPicks assets={[asset({ ticker: 'BBB' })]} fiches={fiches} loading={false} />)
    expect(screen.getByText(/aucun nom à renforcer/i)).toBeInTheDocument()
  })
  it('does not render a € buy range on cards', () => {
    render(<TopPicks assets={[asset({ ticker: 'AAA', signal_level: 'major', suggested_min: 45, suggested_max: 60 })]} fiches={fiches} loading={false} />)
    expect(screen.queryByText(/à acheter/i)).toBeNull()
  })
})
