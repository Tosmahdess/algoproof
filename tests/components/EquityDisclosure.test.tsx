// tests/components/EquityDisclosure.test.tsx
//
// 2026-09-11 review (P6): both callers pass `as_of`, a date with no time, and
// the block printed « Analyse terminée le 7 septembre 2026 à 02:00, heure de
// Paris » — an hour that is only UTC midnight seen from Paris. The block says
// the day, and nothing that looks like a time.
//
// Same review, second pass: « Calcul du » repeated the line just above the
// block and was false on an out-of-scope fiche, and « Les chiffres de marché
// viennent des données affichées à côté d'eux » described a market price no
// fiche prints any more. A graded fiche names its annual report (filing date
// and number); an out-of-scope fiche has neither figures nor verdict.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EquityDisclosure } from '@/components/EquityDisclosure'

const textOf = (ui: React.ReactElement) => render(ui).container.textContent?.replace(/\s+/g, ' ') ?? ''

describe('EquityDisclosure', () => {
  it('prints the day of a date-only as_of, and no invented time', () => {
    const text = textOf(<EquityDisclosure generatedAt="2026-09-07" />)
    expect(text).toContain('Version du 7 septembre 2026.')
    expect(text).not.toMatch(/\d{2}:\d{2}/)
    expect(text).not.toMatch(/heure de Paris/)
  })

  it('on a graded fiche, says the figures come from the annual report the fiche names', () => {
    const text = textOf(<EquityDisclosure generatedAt="2026-09-07" />)
    expect(text).toContain('Les chiffres viennent du rapport annuel de la société, dont la fiche donne la date de dépôt et le numéro.')
    // 2026-09-19 (D058): no verdict any more on a fiche.
    expect(text).toContain('le texte qui les accompagne est mon interprétation, pas un fait.')
    expect(text).not.toMatch(/verdict/i)
    expect(text).not.toMatch(/chiffres de march/)
  })

  it('on an out-of-scope fiche, claims neither figures nor a verdict', () => {
    const text = textOf(<EquityDisclosure generatedAt="2026-06-02" horsPerimetre />)
    expect(text).toContain('Le texte de cette fiche est mon interprétation, pas un fait.')
    expect(text).not.toMatch(/chiffres/)
    expect(text).not.toMatch(/verdict/)
    // The personal lines and the not-advice line stay on every fiche.
    expect(text).toContain('Aucune société citée ne me rémunère')
    expect(text).toContain('pas un conseil en investissement personnalisé')
  })
})
