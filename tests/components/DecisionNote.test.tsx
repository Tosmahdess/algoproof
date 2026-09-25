import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DecisionNote from '@/components/DecisionNote'
import type { KillDecision } from '@/lib/bot-expectations'

// Lot 5 of the design audit (2026-09-25, conception §5.6): one component prints a
// dated decision, under its rule on the bot sheet and in the home's transparency
// block. The review line is a guard the site applies to itself: a future date
// reads « Réexamen le … », a past one « Réexamen dépassé depuis N jours » in the
// severe colour, so the site never shows an expired promise as a plan (the ORB
// sheet served « Réexamen le 22/09 » three days after, audit P0-2).
const decision: KillDecision = {
  rule: 'DD > 15 % → gel du bot.',
  date: '2026-09-19',
  status: 'pending',
  scope: 'tout l’historique affiché sur cette fiche',
  text: 'Je n’ai pas gelé le bot, la décision est en suspens.',
  reviewBy: '2026-09-22',
}

describe('DecisionNote', () => {
  it('prints the date in the site format, the scope and the text', () => {
    render(<DecisionNote decision={decision} today="2026-09-20" />)
    const note = screen.getByTestId('decision-note')
    expect(note.textContent).toMatch(/Décision du 19 sept\. 2026 · tout l’historique affiché sur cette fiche/)
    expect(note.textContent).toMatch(/la décision est en suspens/)
    expect(note.textContent).not.toMatch(/2026-09-19/)
  })

  it('announces a future review as a date', () => {
    render(<DecisionNote decision={decision} today="2026-09-20" />)
    const line = screen.getByTestId('decision-review')
    expect(line.textContent).toBe('Réexamen le 22 sept. 2026.')
    expect(line.className).not.toMatch(/text-severe/)
  })

  it('says how many days a review is overdue, in severe, once the date is past', () => {
    render(<DecisionNote decision={decision} today="2026-09-25" />)
    const line = screen.getByTestId('decision-review')
    expect(line.textContent).toBe('Réexamen dépassé depuis 3 jours.')
    expect(line.className).toMatch(/text-severe/)
  })

  it('treats the review day itself as still due, and one day late as « 1 jour »', () => {
    render(<DecisionNote decision={decision} today="2026-09-22" />)
    expect(screen.getByTestId('decision-review').textContent).toBe('Réexamen le 22 sept. 2026.')
  })

  it('prints no review line without a review date', () => {
    render(<DecisionNote decision={{ ...decision, reviewBy: undefined }} today="2026-09-25" />)
    expect(screen.queryByTestId('decision-review')).toBeNull()
  })
})
