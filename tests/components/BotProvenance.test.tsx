import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BotProvenance from '@/components/BotProvenance'

const campaign = {
  base: 'EMAcross', tf: 'H4', state: 'judged' as const, judged_on: '2026-07-22',
  data_dir: 'data_20260710', n_behaviors: 73770, n_rejected: 73744, n_marginal: 20,
  n_candidates: 2, null_bar: 95,
}
const candidate = {
  campaign_id: 1, label: 'A', rank: 1, filter_families: ['tendance'], null_pct: 95.16,
  dd: 19.57, dd_limit: 20, wf_oos: 1.195, wf_bar: 1.15, pf_net: 1.611, trades: 249,
  assets_go: 6, qualified_assets: [], bot_slug: 'x', forward_trades: 0,
}

describe('BotProvenance', () => {
  it("states the origin campaign, its scale and this bot's margin", () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).toMatch(new RegExp(`73\u202f770 configurations jugées`))
    expect(t).toMatch(/2 retenues/)
    expect(t).toMatch(/95,16 pour une barre à 95/)
    expect(t).toMatch(/22\/07\/2026|2026-07-22/)
  })

  it('links back to the dossier', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/strategies/famille/EMAcross')
  })

  it('never claims the bot is validated', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).not.toMatch(/validé|gagnant|prouvé|survivant/i)
  })
})
