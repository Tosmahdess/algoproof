import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ComponentChangelog from '@/components/ComponentChangelog'
import type { BotChangelog } from '@/lib/types'

const e: BotChangelog = {
  id: '1', created_at: '', scope_type: 'wealth', bot_slug: null, applies_to: null,
  entry_date: '2026-05-10', category: 'asset', summary: '+8 sociétés', detail: null, session_ref: null,
}

describe('ComponentChangelog', () => {
  it('renders entries with a link to the cluster page when given a destination', () => {
    render(<ComponentChangelog title="Derniers changements" entries={[e]} href="/wealth" />)
    expect(screen.getByText('+8 sociétés')).toBeTruthy()
    expect(screen.getByRole('link', { name: /voir tout/i }).getAttribute('href')).toBe('/wealth')
  })
  // Every call site dropped its href when /journal was removed (2026-08-08). The block must
  // still render its entries — only the dangling « Voir tout » link disappears.
  it('renders the entries but no link when href is omitted', () => {
    render(<ComponentChangelog title="Dernier changement" entries={[e]} />)
    expect(screen.getByText('+8 sociétés')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /voir tout/i })).toBeNull()
  })
  it('renders nothing when no entries', () => {
    const { container } = render(<ComponentChangelog title="X" entries={[]} />)
    expect(container.firstChild).toBeNull()
  })
  it('shows only 5 entries then a déplier button when more', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      id: String(i), created_at: '', scope_type: 'wealth', bot_slug: null, applies_to: null,
      entry_date: '2026-06-0' + (i + 1), category: 'asset', summary: 'Entry ' + i, detail: null, session_ref: null,
    }))
    render(<ComponentChangelog title="T" entries={entries as never} />)
    expect(screen.getAllByText(/^Entry /).length).toBe(5)
    fireEvent.click(screen.getByRole('button', { name: /déplier/i }))
    expect(screen.getAllByText(/^Entry /).length).toBe(8)
  })
  it('no button when 5 or fewer', () => {
    const entries = Array.from({ length: 4 }, (_, i) => ({
      id: String(i), created_at: '', scope_type: 'wealth', bot_slug: null, applies_to: null,
      entry_date: '2026-06-0' + (i + 1), category: 'asset', summary: 'E' + i, detail: null, session_ref: null,
    }))
    render(<ComponentChangelog title="T" entries={entries as never} />)
    expect(screen.queryByRole('button', { name: /déplier/i })).toBeNull()
  })
})
