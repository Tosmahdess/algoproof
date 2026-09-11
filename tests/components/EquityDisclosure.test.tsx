// tests/components/EquityDisclosure.test.tsx
//
// 2026-09-11 review (P6): both callers pass `as_of`, a date with no time, and
// the block printed « Analyse terminée le 7 septembre 2026 à 02:00, heure de
// Paris » — an hour that is only UTC midnight seen from Paris. The block says
// the day, and nothing that looks like a time.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EquityDisclosure } from '@/components/EquityDisclosure'

describe('EquityDisclosure', () => {
  it('prints the day of a date-only as_of, and no invented time', () => {
    const { container } = render(<EquityDisclosure generatedAt="2026-09-07" />)
    const text = container.textContent ?? ''
    expect(text).toContain('Calcul du 7 septembre 2026.')
    expect(text).not.toMatch(/\d{2}:\d{2}/)
    expect(text).not.toMatch(/heure de Paris/)
  })
})
