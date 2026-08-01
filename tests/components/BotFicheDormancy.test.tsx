// Integration test for the fix in fix round 1 (Finding 2): SampleNote and
// ConformityCard are both mounted on the bot fiche
// (src/app/strategies/bot/[slug]/page.tsx). Before the fix, the page passed
// `expectations?.dormancyNote` to BOTH components, and funding-rev-long — a
// real bot with a real dormancyNote (bot-expectations.ts) — would print the
// identical sentence twice at zero trades. This renders the two components
// together the way the page does post-fix (dormancyNote NOT passed to
// SampleNote) and asserts the sentence appears exactly once.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SampleNote from '@/components/SampleNote'
import ConformityCard from '@/components/ConformityCard'
import type { BotExpectations } from '@/lib/bot-expectations'

describe('bot fiche: SampleNote + ConformityCard dormancy note', () => {
  it('renders the dormancy sentence exactly once for a zero-trade bot with a documented envelope', () => {
    const expectations: BotExpectations = {
      source: 'Critères de mort pré-enregistrés (test fixture)',
      registeredAt: '2026-06-30',
      killCriteria: ['PF net < 1.30 → mort du bot.'],
      dormancyNote: 'Signal extrême par construction : de longues pauses sont attendues.',
    }
    const stats = { profit_factor: 0, max_drawdown: 0, total_trades: 0 }

    render(
      <>
        {/* Mirrors the page: dormancyNote is not passed to SampleNote when
            `expectations` exists, since ConformityCard renders unconditionally
            a few lines below it and would otherwise show the same note too. */}
        <SampleNote totalTrades={stats.total_trades} />
        <ConformityCard expectations={expectations} stats={stats} />
      </>,
    )

    expect(screen.getAllByText(/Signal extrême par construction/)).toHaveLength(1)
    // SampleNote's own honesty line still renders on its own — only the
    // duplicated dormancyNote clause was the problem.
    expect(screen.getByTestId('sample-note').textContent).toMatch(/attend/i)
  })
})
