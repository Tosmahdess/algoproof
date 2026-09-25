import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import BotProvenance from '@/components/BotProvenance'

// 2026-09-12: this block printed « 95,16 pour une barre à 95 » on a public bot fiche. The
// bar is one of the judge's CLASSIFIED gate thresholds, and it came from
// screening_campaigns.null_bar, which the site's publishable key could read directly
// (measured; see src/lib/screening.ts and migration 046). The measured value stays, the bar
// goes, and the « un souffle » annotation goes with it: it cannot be computed without a bar,
// and printing it would publish the threshold by inference.
const campaign = {
  base: 'EMAcross', tf: 'H4', state: 'judged' as const, judged_on: '2026-07-22',
  data_dir: 'data_20260710', n_behaviors: 73770, n_rejected: 73744, n_marginal: 20,
  n_candidates: 2, n_assets: 30,
}
const candidate = {
  campaign_id: 1, label: 'A', rank: 1, filter_families: ['tendance'], null_pct: 95.16,
  dd: 19.57, wf_oos: 1.195, pf_net: 1.611, trades: 249,
  assets_go: 6, qualified_assets: [], bot_slug: 'x', forward_trades: 0,
}

describe('BotProvenance', () => {
  it('states the origin campaign, its scale and the value this bot measured', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).toMatch(new RegExp(`73 770 configurations jugées`))
    expect(t).toMatch(/2 retenues/)
    expect(t).toMatch(/95,16/)
    expect(t).toMatch(/22\/07\/2026|2026-07-22/)
  })

  it('prints no bar, and no fragility annotation derived from one', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).not.toMatch(/barre/i)
    expect(t).not.toMatch(/un souffle/i)
    // the sentence that carried the value is still there, or this passes on an empty block
    expect(t).toMatch(/contrôle contre le hasard/i)
  })

  it('reads no bar column, so a redacted view is enough for it', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/BotProvenance.tsx'), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const bar of ['null_bar', 'wf_bar', 'dd_limit']) {
      expect(code, `${bar} in code`).not.toContain(bar)
    }
  })

  it('says nothing about the random control when the value is missing', () => {
    render(<BotProvenance campaign={campaign} candidate={{ ...candidate, null_pct: null }} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).not.toMatch(/contrôle contre le hasard/i)
    expect(t).toMatch(/configurations jugées/)
  })

  it('links back to the dossier in the lab', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('https://lab.algoproof.fr/cockpit/survivants?ref=fiche-bot-provenance')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('never claims the bot is validated', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).not.toMatch(/validé|gagnant|prouvé|survivant/i)
  })

  it('never uses text-positive on its link (no traffic-light colouring)', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    expect(screen.getByRole('link').className).not.toMatch(/text-positive/)
  })

  it('pluralises "trade forward" when there is more than one', () => {
    render(<BotProvenance campaign={campaign} candidate={{ ...candidate, forward_trades: 3 }} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).toMatch(/3 trades forward/)
  })

  it('keeps the singular for zero or one trade forward', () => {
    render(<BotProvenance campaign={campaign} candidate={{ ...candidate, forward_trades: 0 }} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).toMatch(/0 trade forward\b/)
  })

  it('renders the closing date in French format', () => {
    render(<BotProvenance campaign={campaign} candidate={candidate} />)
    const t = screen.getByTestId('provenance').textContent ?? ''
    expect(t).toMatch(/22\/07\/2026/)
  })
})
