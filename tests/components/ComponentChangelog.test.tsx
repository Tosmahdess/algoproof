import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComponentChangelog from '@/components/ComponentChangelog'
import type { BotChangelog } from '@/lib/types'

const e: BotChangelog = {
  id: '1', created_at: '', scope_type: 'wealth', bot_slug: null, applies_to: null,
  entry_date: '2026-05-10', category: 'asset', summary: '+8 sociétés', detail: null, session_ref: null,
}

describe('ComponentChangelog', () => {
  it('renders entries with a link to the cluster page', () => {
    render(<ComponentChangelog title="Derniers changements" entries={[e]} href="/journal/patrimoine" />)
    expect(screen.getByText('+8 sociétés')).toBeTruthy()
    expect(screen.getByRole('link', { name: /voir tout/i }).getAttribute('href')).toBe('/journal/patrimoine')
  })
  it('renders nothing when no entries', () => {
    const { container } = render(<ComponentChangelog title="X" entries={[]} href="/journal/patrimoine" />)
    expect(container.firstChild).toBeNull()
  })
})
