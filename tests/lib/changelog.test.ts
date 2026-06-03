import { describe, it, expect, vi } from 'vitest'
import { BotChangelog } from '@/lib/types'

describe('BotChangelog type', () => {
  it('accepts valid category values', () => {
    const valid: BotChangelog = {
      id: 'abc',
      created_at: '2026-05-09T00:00:00Z',
      scope_type: 'bot',
      bot_slug: 'v1-spot',
      applies_to: null,
      entry_date: '2026-05-09',
      category: 'fix',
      summary: 'Fixed M5 filter USDC symbols',
      detail: null,
      session_ref: null,
    }
    expect(valid.category).toBe('fix')
    expect(valid.bot_slug).toBe('v1-spot')
  })

  it('entry_date is a date string', () => {
    const entry: BotChangelog = {
      id: 'xyz',
      created_at: '2026-05-09T00:00:00Z',
      scope_type: 'bot',
      bot_slug: 'v1-hl',
      applies_to: null,
      entry_date: '2026-05-09',
      category: 'asset',
      summary: 'Added BNB/USDC',
      detail: 'PF 1.82 over 730 days',
      session_ref: 'session-5',
    }
    expect(entry.entry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(entry.detail).toBe('PF 1.82 over 730 days')
  })
})
