import { describe, it, expect } from 'vitest'
import { normalize, matchesQuery } from '@/lib/search'

describe('normalize', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalize('Hermès')).toBe('hermes')
    expect(normalize('  ÉLI ')).toBe('eli')
  })
})

describe('matchesQuery', () => {
  it('empty query matches everything', () => {
    expect(matchesQuery(['NVDA', 'NVIDIA'], '')).toBe(true)
  })
  it('matches ticker case-insensitively', () => {
    expect(matchesQuery(['NVDA', 'NVIDIA'], 'nvda')).toBe(true)
  })
  it('matches company name with accents folded', () => {
    expect(matchesQuery(['RMS.PA', 'Hermès'], 'hermes')).toBe(true)
  })
  it('requires every token to be present somewhere', () => {
    expect(matchesQuery(['MC.PA', 'LVMH Moet'], 'lvmh moet')).toBe(true)
    expect(matchesQuery(['MC.PA', 'LVMH Moet'], 'lvmh tesla')).toBe(false)
  })
  it('no match returns false', () => {
    expect(matchesQuery(['AAPL', 'Apple'], 'tesla')).toBe(false)
  })
})
