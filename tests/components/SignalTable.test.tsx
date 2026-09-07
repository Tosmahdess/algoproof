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
  it('garde la légende Achat/Vente', () => {
    render(<SignalTable assets={[asset()]} lastAlerts={{}} verdictByTicker={{}} />)
    expect(screen.getByText(/acheter sur repli/i)).toBeInTheDocument()
  })

  // La colonne « À acheter (€) » affichait une fourchette de prix dérivée d'un
  // cours Yahoo. Elle est retirée depuis le 2026-09-08 : la source en interdit
  // la rediffusion, et un prix passé par une base reste le même prix.
  it("n'affiche plus de fourchette de prix", () => {
    render(<SignalTable assets={[asset()]} lastAlerts={{}} verdictByTicker={{}} />)
    expect(screen.queryByText(/À acheter/i)).toBeNull()
  })
})
