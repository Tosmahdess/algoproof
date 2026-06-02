import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignalTable } from '@/components/SignalTable'
import type { GrowthAsset } from '@/lib/types'

function asset(over: Partial<GrowthAsset> = {}): GrowthAsset {
  return {
    ticker: 'RMS.PA', asset_name: 'Hermès', category: 'luxury_eu', tier: 1,
    tracking_mode: '90j_high', hold_forever: true, dip_trigger_pct: -25,
    current_price: 1657, ref_price_180j: 1800, drawdown_pct: -0.08,
    signal_level: null, suggested_min: null, suggested_max: null,
    tp1_pct: 25, tp2_pct: 50, residual_pct: 50,
    tp1_sell_pct: 25, tp2_sell_pct: 25, last_updated: '2026-06-01',
    ...over,
  } as GrowthAsset
}

describe('SignalTable sell plan', () => {
  it('shows gain → sell amount and residual', () => {
    render(<SignalTable assets={[asset()]} lastAlerts={{}} verdictByTicker={{}} />)
    expect(screen.getByText('+25% → vendre 25%')).toBeInTheDocument()
    expect(screen.getByText('garder 50% (long terme)')).toBeInTheDocument()
  })
  it('shows Achat/Vente legend and "À acheter" header', () => {
    render(<SignalTable assets={[asset()]} lastAlerts={{}} verdictByTicker={{}} />)
    expect(screen.getByText(/acheter sur repli/i)).toBeInTheDocument()
    expect(screen.getAllByText(/À acheter/i).length).toBeGreaterThan(0)
  })
})
