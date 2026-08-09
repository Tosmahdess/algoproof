import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// This asserts on the page source deliberately: rendering the section in this test
// would compose the pair here and stay green if the route stopped mounting it. The
// page itself is async and reads Supabase-backed data, so rendering the route is not
// a focused mount guard either.
const page = readFileSync('src/app/intelligence/page.tsx', 'utf8')
const livePage = page.replace(/\{\/\*(?:(?!\*\/)[^])*\*\/\}/g, '')

describe('/intelligence fleet-impact mount', () => {
  it('imports MiFleetImpactSection', () => {
    expect(livePage).toMatch(
      /import\s+\{\s*MiFleetImpactSection\s*\}\s+from\s+['"]@\/components\/MiFleetImpact['"]/,
    )
  })

  it('mounts MiFleetImpactSection with the fleet impact', () => {
    expect(livePage).toMatch(/<MiFleetImpactSection\s+impact=\{fleetImpact\}\s*\/>/)
  })

  it('mounts the fleet impact after the Bouclier défensif section', () => {
    const defense = livePage.indexOf('Bouclier défensif')
    const fleetImpact = livePage.indexOf('<MiFleetImpactSection')
    expect(defense).toBeGreaterThan(-1)
    expect(fleetImpact).toBeGreaterThan(-1)
    expect(defense).toBeLessThan(fleetImpact)
  })

  // The tempered repetition is load-bearing: a legitimate JSX comment sits directly
  // above the mount, and a greedy match would run past that comment's closing */.
  it('does not merely comment the fleet-impact mount out', () => {
    expect(page).not.toMatch(/\{\/\*(?:(?!\*\/)[^])*<MiFleetImpactSection/)
    expect(page).not.toMatch(/^\s*\/\/.*<MiFleetImpactSection/m)
  })
})
