import { describe, it, expect } from 'vitest'
import { normalizeEmail, VALID_SOURCES, normalizeSource } from '@/lib/subscribe'

describe('normalizeEmail', () => {
  it('accepts a plain valid email and lowercases/trims it', () => {
    expect(normalizeEmail('  Jean.Dupont@Example.COM ')).toBe('jean.dupont@example.com')
  })

  it('accepts plus-addressing and subdomains', () => {
    expect(normalizeEmail('a+tag@mail.example.co')).toBe('a+tag@mail.example.co')
  })

  it('rejects missing @ or empty local/domain parts', () => {
    expect(normalizeEmail('nope')).toBeNull()
    expect(normalizeEmail('@example.com')).toBeNull()
    expect(normalizeEmail('a@')).toBeNull()
    expect(normalizeEmail('')).toBeNull()
  })

  it('rejects domains without a dot or with spaces', () => {
    expect(normalizeEmail('a@localhost')).toBeNull()
    expect(normalizeEmail('a b@example.com')).toBeNull()
  })

  it('rejects overlong emails (> 254 chars)', () => {
    const long = `${'x'.repeat(250)}@ex.com`
    expect(normalizeEmail(long)).toBeNull()
  })

  it('rejects non-string input', () => {
    expect(normalizeEmail(undefined)).toBeNull()
    expect(normalizeEmail(42 as unknown as string)).toBeNull()
  })
})

describe('normalizeSource', () => {
  it('keeps known sources', () => {
    for (const s of VALID_SOURCES) expect(normalizeSource(s)).toBe(s)
  })

  it('falls back to "site" for unknown or missing values', () => {
    expect(normalizeSource('evil<script>')).toBe('site')
    expect(normalizeSource(undefined)).toBe('site')
  })
})
