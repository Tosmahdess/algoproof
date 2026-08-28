import { describe, it, expect } from 'vitest'
import { safeNext } from '@/lib/safe-redirect'

describe('safeNext', () => {
  it('keeps a relative path', () => {
    expect(safeNext('/wealth/NVDA')).toBe('/wealth/NVDA')
  })
  it('falls back when absent', () => {
    expect(safeNext(null)).toBe('/compte')
    expect(safeNext(undefined)).toBe('/compte')
    expect(safeNext('')).toBe('/compte')
  })
  it('refuses an absolute URL', () => {
    expect(safeNext('https://evil.example/steal')).toBe('/compte')
  })
  it('refuses a protocol-relative URL', () => {
    expect(safeNext('//evil.example/steal')).toBe('/compte')
  })
  it('honours an explicit fallback', () => {
    expect(safeNext(null, '/wealth')).toBe('/wealth')
  })
})
