import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScreeningDossier from '@/components/ScreeningDossier'

const campaign = {
  base: 'EMAcross', tf: 'H4', state: 'judged' as const, judged_on: '2026-07-22',
  data_dir: 'data_20260710', n_behaviors: 73770, n_rejected: 73744, n_marginal: 20,
  n_candidates: 2, null_bar: 95,
}
const candidates = [
  { campaign_id: 1, label: 'A', rank: 1, filter_families: ['tendance', 'pente longue'],
    null_pct: 95.16, dd: 19.57, dd_limit: 20, wf_oos: 1.195, wf_bar: 1.15, pf_net: 1.611,
    trades: 249, assets_go: 6, qualified_assets: ['ETH', 'DOGE', 'ATOM', 'BTC', 'GALA', 'BCH'],
    bot_slug: null, forward_trades: 0 },
  { campaign_id: 1, label: 'B', rank: 2, filter_families: ['tendance', 'volume'],
    null_pct: 98.66, dd: 16.81, dd_limit: 20, wf_oos: 1.466, wf_bar: 1.15, pf_net: 1.466,
    trades: 221, assets_go: 6, qualified_assets: ['SUI', 'ADA', 'NEAR', 'UNI', 'BTC', 'SOL'],
    bot_slug: null, forward_trades: 0 },
]

describe('ScreeningDossier', () => {
  it('shows the funnel breakdown', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    expect(screen.getByText(/73 744/)).toBeTruthy()
    expect(screen.getByText(/20 marginales/i)).toBeTruthy()
  })

  it('marks a candidate that only just clears its bar', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    expect(screen.getByTestId('candidate-A-null').textContent)
      .toMatch(/95,16 pour une barre à 95.*souffle/i)
    expect(screen.getByTestId('candidate-B-null').textContent).not.toMatch(/souffle/i)
  })

  it('labels backtest performance as backtest and shows the forward counter', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    const a = screen.getByTestId('candidate-A-perf')
    expect(a.textContent).toMatch(/backtest/i)
    expect(a.textContent).toMatch(/0 trade forward/i)
  })

  it('never prints a parameter value', () => {
    const { container } = render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    expect(container.innerHTML).not.toMatch(/ema_fast|ema_slow|adx_period|atr_mult/)
  })

  it('shows the assets exhibit by membership only, with the defusing sentence', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    expect(screen.getByTestId('exhibit-intersection').textContent).toMatch(/BTC/)
    expect(screen.getByText(/exactement ce que le hasard prédit/i)).toBeTruthy()
  })

  it('states a zero-candidate campaign as a result', () => {
    render(<ScreeningDossier campaign={{ ...campaign, tf: 'D1', n_behaviors: 374,
      n_rejected: 374, n_marginal: 0, n_candidates: 0 }} candidates={[]} />)
    expect(screen.getByText(/c'est un résultat, pas un échec/i)).toBeTruthy()
  })
})
