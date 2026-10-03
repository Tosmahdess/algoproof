// Refonte lot 3 (2026-10-02): « Mon constat / Ma décision et ses limites ». The right
// column quotes the decision, or the published limits, or says honestly what replaces
// them; it never invents a decision.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import VerdictPanel, { decisionColumn } from '@/components/VerdictPanel'
import { botVerdict } from '@/lib/bot-verdict'
import type { BotExpectations } from '@/lib/bot-expectations'

const exp: BotExpectations = {
  source: 's', registeredAt: '2026-05-08', pfFloor: 1.2, maxDrawdown: 0.15,
  killCriteria: ['Hors enveloppe → bot gelé.'],
}
const s = (n: number, dd: number, pf: number) => ({ total_trades: n, max_drawdown: dd, profit_factor: pf })

describe('decisionColumn', () => {
  it('rule crossed without a decision: says none is published', () => {
    const v = botVerdict({ status: 'live', stats: s(40, 0.3, 0.9), expectations: exp })
    expect(decisionColumn(v, { status: 'live', criteriaCount: 4 }).text).toBe('Je n’ai publié aucune décision à ce jour.')
  })

  it('in the limits: the published limits, a link to the rules', () => {
    const v = botVerdict({ status: 'live', stats: s(40, 0.02, 2), expectations: exp })
    const c = decisionColumn(v, { status: 'live', criteriaCount: 4 })
    expect(c.text).toMatch(/^Limites publiées le 8 mai 2026/)
    expect(c.link?.href).toBe('#regles')
  })

  it('no limits, paper: the criteria before real money; live: says there is no rule', () => {
    const paper = botVerdict({ status: 'paper', stats: s(5, 0.02, 2), expectations: null })
    expect(decisionColumn(paper, { status: 'paper', criteriaCount: 4 }).text).toMatch(/4 critères publics/)
    const live = botVerdict({ status: 'live', stats: s(69, 0.08, 1.6), expectations: null })
    const c = decisionColumn(live, { status: 'live', criteriaCount: 4 })
    expect(c.text).toMatch(/ni limite ni règle d’arrêt/)
    expect(c.link?.href).toBe('#trades')
  })
})

describe('VerdictPanel', () => {
  it('keeps the loss contour when a decision sits beside a crossed rule', () => {
    const v = botVerdict({ status: 'live', stats: s(284, 0.291, 0.99), expectations: {
      ...exp, decisions: [{ rule: exp.killCriteria[0], date: '2026-09-25', status: 'kept', scope: 'x',
        text: 'Le 25 septembre, je le garde. Suite.', reviewBy: '2026-10-22' }] }, today: '2026-10-02' })
    render(<VerdictPanel verdict={v} column={decisionColumn(v, { status: 'live', criteriaCount: 4 })} />)
    const panel = screen.getByTestId('verdict-panel')
    expect(panel.className).toContain('border-negative')
    expect(screen.getByRole('heading', { level: 2 }).className).toContain('text-negative')
    expect(screen.getByTestId('verdict-decision').textContent).toBe('Le 25 septembre, je le garde.')
    expect(screen.getByTestId('verdict-review').textContent).toBe('Réexamen le 22 oct. 2026.')
  })

  // Refonte finition (2026-10-02): « Données insuffisantes » takes the reserve ink, with
  // its words (was: nothing coloured). No loss colour, no loss contour.
  it('zero trade: the title in the reserve ink, with its words, nothing in loss', () => {
    const v = botVerdict({ status: 'paper', stats: s(0, 0, 0), expectations: null })
    const { container } = render(<VerdictPanel verdict={v} column={decisionColumn(v, { status: 'paper', criteriaCount: 4 })} />)
    const title = screen.getByRole('heading', { level: 2 })
    expect(title.textContent).toBe('Données insuffisantes')
    expect(title.className).toContain('text-warning')
    expect(container.innerHTML).not.toMatch(/text-negative|border-negative/)
  })

  it('the verdict title speaks alone; the decision column has its own h3', () => {
    const v = botVerdict({ status: 'live', stats: s(40, 0.02, 2), expectations: exp })
    const { container } = render(<VerdictPanel verdict={v} column={decisionColumn(v, { status: 'live', criteriaCount: 4 })} />)
    expect(container.textContent).not.toMatch(/Mon constat/)
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Ma décision et ses limites')
  })
})
