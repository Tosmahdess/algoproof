import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OverviewWhatsNew from '@/components/OverviewWhatsNew'
import type { BotChangelog } from '@/lib/types'

const entries = (n: number): BotChangelog[] =>
  Array.from({ length: n }, (_, i) => ({
    id: 'e' + i, created_at: '',
    scope_type: (['fleet', 'mi', 'wealth', 'bot'][i % 4]) as never,
    bot_slug: i % 4 === 3 ? 'v1-spot' : null,
    applies_to: i % 4 === 0 ? 'all' : null,
    entry_date: '2026-06-0' + ((i % 9) + 1),
    category: 'fix', summary: 'entry-' + i, detail: null, session_ref: null,
  }))

describe('OverviewWhatsNew', () => {
  it('shows only the 5 latest entries (flat) with a Développer button when more', () => {
    render(<OverviewWhatsNew entries={entries(8)} />)
    expect(screen.getAllByText(/^entry-/).length).toBe(5)
    fireEvent.click(screen.getByRole('button', { name: /développer/i }))
    expect(screen.getAllByText(/^entry-/).length).toBe(8)
    fireEvent.click(screen.getByRole('button', { name: /replier/i }))
    expect(screen.getAllByText(/^entry-/).length).toBe(5)
  })

  it('has no Développer button when 5 or fewer', () => {
    render(<OverviewWhatsNew entries={entries(4)} />)
    expect(screen.queryByRole('button', { name: /développer/i })).toBeNull()
    expect(screen.getAllByText(/^entry-/).length).toBe(4)
  })

  it('keeps the "Voir tout le journal" link in the header', () => {
    render(<OverviewWhatsNew entries={entries(3)} />)
    const link = screen.getByRole('link', { name: /voir tout le journal/i })
    expect(link.getAttribute('href')).toBe('/journal')
  })

  it('renders nothing when empty', () => {
    const { container } = render(<OverviewWhatsNew entries={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
