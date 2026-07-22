import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScreeningDossier from '@/components/ScreeningDossier'

const campaign = {
  base: 'EMAcross', tf: 'H4', state: 'judged' as const, judged_on: '2026-07-22',
  data_dir: 'data_20260710', n_behaviors: 73770, n_rejected: 73744, n_marginal: 20,
  n_candidates: 2, n_assets: 30, null_bar: 95,
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

  it('handles an empty intersection without claiming a shared asset', () => {
    const noOverlap = [
      candidates[0],
      { ...candidates[1], qualified_assets: ['SUI', 'ADA', 'NEAR', 'UNI', 'LINK', 'SOL'] },
    ]
    const { container } = render(<ScreeningDossier campaign={campaign} candidates={noOverlap} />)
    expect(screen.getByTestId('exhibit-intersection').textContent).toMatch(/aucun/i)
    expect(container.innerHTML).not.toMatch(/cet actif/)
    // must not assert a one-name intersection when there is none
    expect(container.textContent).not.toMatch(/intersection d'un seul nom/i)
  })

  it('names the shared asset when the intersection is exactly one', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    const exhibit = screen.getByTestId('exhibit-intersection')
    expect(exhibit.textContent).toMatch(/BTC/)
    expect(document.body.textContent).toMatch(/intersection d'un seul nom/i)
  })

  it('names both shared assets when the intersection is two or more', () => {
    const twoOverlap = [
      candidates[0],
      { ...candidates[1], qualified_assets: ['SUI', 'ADA', 'NEAR', 'BTC', 'GALA', 'SOL'] },
    ]
    render(<ScreeningDossier campaign={campaign} candidates={twoOverlap} />)
    const exhibit = screen.getByTestId('exhibit-intersection')
    expect(exhibit.textContent).toMatch(/BTC/)
    expect(exhibit.textContent).toMatch(/GALA/)
    expect(document.body.textContent).toMatch(/intersection de 2 noms/i)
  })

  it('derives the per-asset trade density from trades and the tested universe size, not assets_go', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    // fixture: (249 + 221) trades / (2 * 30 n_assets) = 470 / 60 = 7.8(3) -> 8
    // Using assets_go (6 + 6 = 12) instead would wrongly read ~39 — the exact misreading
    // this sentence exists to prevent (each candidate carries too few trades to mean anything).
    expect(document.body.textContent).toMatch(/environ 8 trades par actif/i)
    expect(document.body.textContent).not.toMatch(/environ 39 trades par actif/i)
  })

  it('omits the density clause entirely when the universe size is unknown', () => {
    render(<ScreeningDossier campaign={{ ...campaign, n_assets: null }} candidates={candidates} />)
    expect(document.body.textContent).not.toMatch(/trades? par actif/i)
  })

  it('does not render the assets exhibit when either candidate has no qualified assets recorded', () => {
    const emptyLists = [
      { ...candidates[0], qualified_assets: [] },
      { ...candidates[1], qualified_assets: [] },
    ]
    render(<ScreeningDossier campaign={campaign} candidates={emptyLists} />)
    expect(screen.queryByTestId('exhibit-intersection')).toBeNull()
    expect(screen.queryByText(/pièce à conviction/i)).toBeNull()
  })

  it('renders a "détail indisponible" state when the campaign reports candidates but none were exported', () => {
    render(<ScreeningDossier campaign={{ ...campaign, n_candidates: 2 }} candidates={[]} />)
    expect(screen.getByText(/détail indisponible/i)).toBeTruthy()
    expect(screen.queryByText(/c'est un résultat, pas un échec/i)).toBeNull()
  })

  it('states a zero-candidate campaign as a result even if a stray candidate row leaked through', () => {
    // campaign.n_candidates is the source of truth, not candidates.length (review finding C3)
    render(<ScreeningDossier campaign={{ ...campaign, n_candidates: 0 }} candidates={candidates} />)
    expect(screen.getByText(/c'est un résultat, pas un échec/i)).toBeTruthy()
  })

  it('renders the funnel residual when the counted buckets do not sum to the judged total', () => {
    // real numbers from the review: 73 744 rejected + 20 marginal + 2 candidates = 73 766,
    // four short of the 73 770 judged.
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    expect(screen.getByText(/4.*comptabilisé.*ailleurs/i)).toBeTruthy()
  })

  it('omits the funnel residual line when the buckets sum exactly', () => {
    render(<ScreeningDossier campaign={{ ...campaign, n_behaviors: 100, n_rejected: 98,
      n_marginal: 0, n_candidates: 2 }} candidates={candidates} />)
    expect(screen.queryByText(/comptabilisé.*ailleurs/i)).toBeNull()
  })

  it('falls back to "la sélection d\'actifs attend les données à venir" when neither candidate has a bot yet', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    expect(screen.getByText(/la sélection d'actifs attend les données à venir/i)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/bots? en observation trade/i)
  })

  it('names the single bot in observation when only one candidate carries a bot_slug', () => {
    const oneBot = [{ ...candidates[0], bot_slug: 'v1-spot' }, candidates[1]]
    render(<ScreeningDossier campaign={campaign} candidates={oneBot} />)
    expect(document.body.textContent).toMatch(/le bot en observation trade tout l'univers testé/i)
  })

  it('does not render a raw data_dir parenthetical when it is null', () => {
    render(<ScreeningDossier campaign={{ ...campaign, data_dir: null }} candidates={candidates} />)
    expect(document.body.textContent).not.toMatch(/\(\)/)
    expect(document.body.textContent).toMatch(/jeu de données figé\./)
  })

  it('renders the date in French format', () => {
    render(<ScreeningDossier campaign={campaign} candidates={candidates} />)
    expect(screen.getByText(/22\/07\/2026/)).toBeTruthy()
  })

  it('pluralises "trade forward" when there is more than one', () => {
    const manyForward = [{ ...candidates[0], forward_trades: 3 }, candidates[1]]
    render(<ScreeningDossier campaign={campaign} candidates={manyForward} />)
    expect(screen.getByTestId('candidate-A-perf').textContent).toMatch(/3 trades forward/)
    expect(screen.getByTestId('candidate-B-perf').textContent).toMatch(/0 trade forward\b/)
  })
})
