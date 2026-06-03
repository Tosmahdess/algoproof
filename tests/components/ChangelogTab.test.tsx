import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChangelogTab from '@/components/ChangelogTab'
import type { BotChangelog } from '@/lib/types'

const makeEntry = (overrides: Partial<BotChangelog> = {}): BotChangelog => ({
  id: '1',
  created_at: '2026-05-09T10:00:00Z',
  scope_type: 'bot',
  bot_slug: 'v1-spot',
  applies_to: null,
  entry_date: '2026-05-09',
  category: 'fix',
  summary: 'Fixed M5 filter',
  detail: null,
  session_ref: null,
  ...overrides,
})

describe('ChangelogTab', () => {
  it('shows empty state when no changelogs', () => {
    render(<ChangelogTab changelogs={[]} />)
    expect(screen.getByText(/aucune modification enregistrée/i)).toBeTruthy()
  })

  it('renders a changelog entry with category chip and summary', () => {
    render(<ChangelogTab changelogs={[makeEntry()]} />)
    expect(screen.getByText('Fixed M5 filter')).toBeTruthy()
    expect(screen.getByText('correctif')).toBeTruthy()
  })

  it('renders optional detail text', () => {
    render(<ChangelogTab changelogs={[makeEntry({ detail: 'PF 1.82 over 730 days' })]} />)
    expect(screen.getByText('PF 1.82 over 730 days')).toBeTruthy()
  })

  it('does not render detail element when detail is null', () => {
    render(<ChangelogTab changelogs={[makeEntry({ detail: null })]} />)
    expect(screen.queryByText('PF')).toBeNull()
  })

  it('tags a fleet entry with the Flotte scope badge', () => {
    render(<ChangelogTab changelogs={[makeEntry({
      scope_type: 'fleet', bot_slug: null, applies_to: 'all',
      category: 'deploy', summary: 'Hard-Gate déployé',
    })]} />)
    expect(screen.getByText('Hard-Gate déployé')).toBeTruthy()
    expect(screen.getByText('Flotte')).toBeTruthy()
  })
})
