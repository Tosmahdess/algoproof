import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// This asserts on the page source deliberately: rendering the section in this test
// would compose the pair here and stay green if the route stopped mounting it. The
// page itself is async and reads Supabase-backed data, so rendering the route is not
// a focused mount guard either.
const page = readFileSync('src/app/intelligence/page.tsx', 'utf8')
const livePage = page.replace(/\{\/\*(?:(?!\*\/)[^])*\*\/\}/g, '')

// Lot 7 of the design audit (spec 5.4, 2026-09-25): the substance of the weather is
// frozen (arbitration of 2026-09-17), only the ORDER of the blocks moves. Read top
// to bottom, the page is: the regime, the negative measurement, the 7-day history,
// the folded method (pillars, shield, terminal link), the folded generated report.
const at = (needle: string) => {
  const i = livePage.indexOf(needle)
  expect(i, `${needle} is mounted`).toBeGreaterThan(-1)
  return i
}

describe('/intelligence fleet-impact mount', () => {
  it('imports MiFleetImpactSection', () => {
    expect(livePage).toMatch(
      /import\s+\{\s*MiFleetImpactSection\s*\}\s+from\s+['"]@\/components\/MiFleetImpact['"]/,
    )
  })

  it('mounts MiFleetImpactSection with the fleet impact', () => {
    expect(livePage).toMatch(/<MiFleetImpactSection\s+impact=\{fleetImpact\}\s*\/>/)
  })

  // The tempered repetition is load-bearing: a legitimate JSX comment sits directly
  // above the mount, and a greedy match would run past that comment's closing */.
  it('does not merely comment the fleet-impact mount out', () => {
    expect(page).not.toMatch(/\{\/\*(?:(?!\*\/)[^])*<MiFleetImpactSection/)
    expect(page).not.toMatch(/^\s*\/\/.*<MiFleetImpactSection/m)
  })
})

describe('/intelligence block order (spec 5.4)', () => {
  it('opens on the regime: the badge comes before any explanatory paragraph', () => {
    expect(at('<MiRegimeBadge')).toBeLessThan(at('Ce que la météo fait, et ne fait pas'))
  })

  it('mounts the negative measurement second, before the 7-day history', () => {
    expect(at('<MiRegimeBadge')).toBeLessThan(at('<MiFleetImpactSection'))
    expect(at('<MiFleetImpactSection')).toBeLessThan(at('<MiHistoryChart'))
  })

  it('folds the method (pillars, shield, terminal link) after the history', () => {
    expect(at('<MiHistoryChart')).toBeLessThan(at('Comment ce score est calculé'))
    expect(at('Comment ce score est calculé')).toBeLessThan(at('<MiPillarsSection'))
    expect(at('Comment ce score est calculé')).toBeLessThan(at('Bouclier défensif'))
    expect(at('Comment ce score est calculé')).toBeLessThan(at('Voir le terminal'))
  })

  it('folds the generated report last, labelled as unreviewed machine output', () => {
    expect(at('<MiPillarsSection')).toBeLessThan(at('Rapport généré du jour'))
    expect(at('Rapport généré du jour')).toBeLessThan(at('généré par un modèle, sans relecture'))
    expect(at('Rapport généré du jour')).toBeLessThan(at('{reportContent}'))
  })
})
