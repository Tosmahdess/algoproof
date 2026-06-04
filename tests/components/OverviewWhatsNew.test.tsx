import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OverviewWhatsNew from '@/components/OverviewWhatsNew'
import type { BotChangelog } from '@/lib/types'

const mk = (scope: string, n: number): BotChangelog[] =>
  Array.from({ length: n }, (_, i) => ({
    id: scope + i, created_at: '', scope_type: scope as never, bot_slug: scope === 'bot' ? 'v1-spot' : null,
    applies_to: scope === 'fleet' ? 'all' : null, entry_date: '2026-06-0' + ((i % 9) + 1),
    category: 'fix', summary: `${scope}-entry-${i}`, detail: null, session_ref: null,
  }))

describe('OverviewWhatsNew', () => {
  it('groups by flux and caps at 5 per flux with déplier', () => {
    render(<OverviewWhatsNew entries={[...mk('fleet', 7), ...mk('wealth', 2)]} />)
    expect(screen.getByText('Flotte')).toBeTruthy()
    expect(screen.getByText('Patrimoine')).toBeTruthy()
    expect(screen.getAllByText(/^fleet-entry-/).length).toBe(5)
    fireEvent.click(screen.getByRole('button', { name: /déplier/i }))
    expect(screen.getAllByText(/^fleet-entry-/).length).toBe(7)
  })
  it('renders nothing when empty', () => {
    const { container } = render(<OverviewWhatsNew entries={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
