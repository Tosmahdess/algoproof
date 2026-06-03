import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import JournalClient from '@/components/JournalClient'
import type { BotChangelog } from '@/lib/types'

const e = (o: Partial<BotChangelog>): BotChangelog => ({
  id: Math.random().toString(), created_at: '', scope_type: 'bot', bot_slug: 'v1-spot',
  applies_to: null, entry_date: '2026-06-02', category: 'strategy',
  summary: 's', detail: null, session_ref: null, ...o,
})

const entries: BotChangelog[] = [
  e({ id: 'a', scope_type: 'fleet', bot_slug: null, applies_to: 'all', category: 'deploy', summary: 'Hard-Gate flotte' }),
  e({ id: 'b', scope_type: 'mi', bot_slug: null, category: 'signal', summary: 'Pilier VIX' }),
  e({ id: 'c', scope_type: 'bot', bot_slug: 'v1-spot', category: 'strategy', summary: 'Filtre ADX' }),
]

describe('JournalClient', () => {
  it('renders all entries by default', () => {
    render(<JournalClient entries={entries} />)
    expect(screen.getByText('Hard-Gate flotte')).toBeTruthy()
    expect(screen.getByText('Pilier VIX')).toBeTruthy()
    expect(screen.getByText('Filtre ADX')).toBeTruthy()
  })
  it('filters by flux when a scope pill is clicked', () => {
    render(<JournalClient entries={entries} />)
    fireEvent.click(screen.getByRole('button', { name: /Intelligence/i }))
    expect(screen.getByText('Pilier VIX')).toBeTruthy()
    expect(screen.queryByText('Hard-Gate flotte')).toBeNull()
    expect(screen.queryByText('Filtre ADX')).toBeNull()
  })
  it('shows empty state when no entries match', () => {
    render(<JournalClient entries={[]} />)
    expect(screen.getByText(/aucun changement/i)).toBeTruthy()
  })
})
