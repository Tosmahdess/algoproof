import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WhatsNew from '@/components/WhatsNew'
import type { BotChangelog, ScopeType } from '@/lib/types'

const e = (o: Partial<BotChangelog>): BotChangelog => ({
  id: 'x', created_at: '', scope_type: 'fleet', bot_slug: null, applies_to: 'all',
  entry_date: '2026-06-02', category: 'deploy', summary: 'Hard-Gate', detail: null,
  session_ref: null, ...o,
})

const latest: Record<ScopeType, BotChangelog | null> = {
  fleet: e({ scope_type: 'fleet', summary: 'Hard-Gate flotte' }),
  mi: e({ scope_type: 'mi', bot_slug: null, category: 'signal', summary: 'Pilier VIX' }),
  wealth: e({ scope_type: 'wealth', category: 'asset', summary: '+8 sociétés' }),
  bot: e({ scope_type: 'bot', bot_slug: 'v1-spot', category: 'strategy', summary: 'Filtre ADX' }),
}

describe('WhatsNew', () => {
  it('renders one card per non-empty scope', () => {
    render(<WhatsNew latest={latest} />)
    expect(screen.getByText('Hard-Gate flotte')).toBeTruthy()
    expect(screen.getByText('Pilier VIX')).toBeTruthy()
    expect(screen.getByText('+8 sociétés')).toBeTruthy()
    expect(screen.getByText('Filtre ADX')).toBeTruthy()
  })
  it('renders a link to the full journal', () => {
    render(<WhatsNew latest={latest} />)
    const link = screen.getByRole('link', { name: /journal/i })
    expect(link.getAttribute('href')).toBe('/journal')
  })
  it('omits a scope with no entry', () => {
    render(<WhatsNew latest={{ ...latest, mi: null }} />)
    expect(screen.queryByText('Pilier VIX')).toBeNull()
  })
})
